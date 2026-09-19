/**
 * Global Debounced Search Controller
 * Categorized instant search respecting RBAC across Trainees, Providers, Courses, Employers, Districts, and Cohorts
 */

const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Employer = require('../models/Employer');
const User = require('../models/User');

const globalSearch = async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: { trainees: [], providers: [], courses: [], employers: [], cohorts: [] },
      });
    }

    const regex = new RegExp(query, 'i');

    let traineeFilter = {
      $or: [
        { internalTraineeId: regex },
        { phone: regex },
        { district: regex },
      ],
    };

    let providerFilter = {
      $or: [
        { organizationName: regex },
        { registrationNumber: regex },
        { contactPerson: regex },
      ],
    };

    let courseFilter = {
      $or: [
        { courseName: regex },
        { category: regex },
      ],
    };

    let employerFilter = {
      $or: [
        { organizationName: regex },
        { industry: regex },
        { district: regex },
      ],
    };

    let batchFilter = {
      $or: [
        { batchName: regex },
      ],
    };

    // RBAC scoping: Providers only search their own cohorts and trainees
    if (req.user.role === 'PROVIDER') {
      const provider = await Provider.findOne({ userId: req.user._id });
      if (provider) {
        traineeFilter.providerId = provider._id;
        courseFilter.providerId = provider._id;
        batchFilter.providerId = provider._id;
        providerFilter = { _id: provider._id };
      }
    }

    const [trainees, providers, courses, employers, cohorts] = await Promise.all([
      Trainee.find(traineeFilter)
        .populate('userId', 'name email')
        .select('internalTraineeId phone district trackingConsent status')
        .limit(6)
        .lean(),
      Provider.find(providerFilter)
        .select('organizationName registrationNumber contactPerson phone')
        .limit(5)
        .lean(),
      Course.find(courseFilter)
        .select('courseName category marketAlignmentScore duration')
        .limit(5)
        .lean(),
      Employer.find(employerFilter)
        .select('organizationName industry district verificationStatus')
        .limit(5)
        .lean(),
      Batch.find(batchFilter)
        .select('batchName mode startDate endDate')
        .limit(5)
        .lean(),
    ]);

    // Also match trainees by user name
    const usersWithName = await User.find({ name: regex, role: 'TRAINEE' }).select('_id name email').limit(6);
    if (usersWithName.length > 0) {
      const userIds = usersWithName.map((u) => u._id);
      const matchedByUser = await Trainee.find({ userId: { $in: userIds } })
        .populate('userId', 'name email')
        .select('internalTraineeId phone district trackingConsent status')
        .limit(6)
        .lean();

      matchedByUser.forEach((t) => {
        if (!trainees.some((existing) => existing._id.toString() === t._id.toString())) {
          trainees.push(t);
        }
      });
    }

    res.json({
      success: true,
      query,
      data: {
        trainees: trainees.slice(0, 6),
        providers,
        courses,
        employers,
        cohorts,
      },
    });
  } catch (error) {
    console.error('globalSearch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  globalSearch,
};
