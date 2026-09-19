/**
 * Analytics & Intelligence Controller
 * - District Analytics with hierarchical drill-down
 * - Demographic Analytics with small-cohort privacy suppression
 * - Multidimensional Provider Scorecards
 * - Explainable Government Policy & Resource Recommendations with Evidence Chains
 */

const Trainee = require('../models/Trainee');
const Provider = require('../models/Provider');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const OutcomeRecord = require('../models/OutcomeRecord');
const OutcomeVerification = require('../models/OutcomeVerification');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const PolicyRecommendation = require('../models/PolicyRecommendation');
const NonPlacementReason = require('../models/NonPlacementReason');
const AttritionReason = require('../models/AttritionReason');
const RemedialAction = require('../models/RemedialAction');

/**
 * GET /api/analytics/district
 * District-level longitudinal outcomes with full drill-down
 */
const getDistrictAnalytics = async (req, res) => {
  try {
    // 1. Get all available districts in the ecosystem
    const districts = await Trainee.distinct('district');
    const validDistricts = districts.filter(Boolean);

    const selectedDistrict = req.query.district || (validDistricts.length > 0 ? validDistricts[0] : null);

    if (!selectedDistrict || validDistricts.length === 0) {
      return res.json({
        success: true,
        data: {
          district: null,
          selectedDistrict: null,
          availableDistricts: [],
          districts: [],
          kpis: {
            totalTrainees: 0,
            totalEnrolled: 0,
            completedCount: 0,
            completionRate: 0,
            employedCount: 0,
            employmentRate: 0,
            placementRate: 0,
            verifiedCount: 0,
            verifiedEmploymentRate: 0,
            retention12M: 0,
            retentionRate: 0,
            avgWage3M: 0,
            avgWage12M: 0,
            avgSalary: 0,
            wageProgression: 0,
            providerCount: 0,
          },
          metrics: {
            totalEnrolled: 0,
            completedCount: 0,
            completionRate: 0,
            employedCount: 0,
            employmentRate: 0,
            verifiedEmploymentRate: 0,
            retention12M: 0,
            avgWage3M: 0,
            avgWage12M: 0,
            wageProgression: 0,
          },
          sectors: [],
          providers: [],
          courses: [],
          trainees: [],
          providerBreakdown: [],
          topSkillGaps: [],
        },
      });
    }

    // 2. Trainees in selected district
    const districtTrainees = await Trainee.find({ district: selectedDistrict })
      .populate('userId', 'name')
      .lean();
    const traineeIds = districtTrainees.map((t) => t._id);

    // 3. Enrollments in district
    const enrollments = await Enrollment.find({ traineeId: { $in: traineeIds } })
      .populate('providerId', 'organizationName registrationNumber phone code tier')
      .populate('courseId', 'courseName category marketAlignmentScore durationHours courseCode')
      .populate('batchId', 'batchName mode startDate endDate')
      .lean();

    const totalEnrolled = enrollments.length;
    const completedCount = enrollments.filter((e) => e.status === 'COMPLETED').length;
    const completionRate = totalEnrolled > 0 ? Math.round((completedCount / totalEnrolled) * 100) : 0;

    // 4. Outcomes in district
    const outcomes = await OutcomeRecord.find({ traineeId: { $in: traineeIds } }).lean();
    const employedCount = outcomes.filter((o) => ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP'].includes(o.situation)).length;
    const verifiedCount = await OutcomeVerification.countDocuments({
      traineeId: { $in: traineeIds },
      status: 'VERIFIED',
    });

    const employmentRate = completedCount > 0 ? Math.round((employedCount / completedCount) * 100) : 0;
    const verifiedEmploymentRate = completedCount > 0 ? Math.round((verifiedCount / completedCount) * 100) : 0;

    // 5. Longitudinal Retention in District
    const outcome3M = outcomes.filter((o) => o.followUpType === '3_MONTH' && ['EMPLOYED', 'SELF_EMPLOYED'].includes(o.situation)).length;
    const outcome12M = outcomes.filter((o) => o.followUpType === '12_MONTH' && ['EMPLOYED', 'SELF_EMPLOYED'].includes(o.situation)).length;
    const retention12M = outcome3M > 0 ? Math.round((outcome12M / outcome3M) * 100) : 0;

    // 6. Wage Progression in District (NO hardcoded fallback numbers!)
    const wages3M = outcomes.filter((o) => o.followUpType === '3_MONTH' && o.employmentData?.monthlySalary > 0);
    const wages12M = outcomes.filter((o) => o.followUpType === '12_MONTH' && o.employmentData?.monthlySalary > 0);
    const avgWage3M = wages3M.length > 0 ? Math.round(wages3M.reduce((s, o) => s + o.employmentData.monthlySalary, 0) / wages3M.length) : 0;
    const avgWage12M = wages12M.length > 0 ? Math.round(wages12M.reduce((s, o) => s + o.employmentData.monthlySalary, 0) / wages12M.length) : 0;
    const wageProgression = avgWage3M > 0 ? Math.round(((avgWage12M - avgWage3M) / avgWage3M) * 100) : 0;

    // 7. Sector Breakdown (calculated deterministically from Course categories in this district)
    const sectorMap = {};
    enrollments.forEach((e) => {
      const sec = e.courseId?.category || 'General';
      if (!sectorMap[sec]) {
        sectorMap[sec] = { name: sec, enrolled: 0, placed: 0, totalWage: 0, wageCount: 0 };
      }
      sectorMap[sec].enrolled += 1;
    });
    outcomes.forEach((o) => {
      const match = enrollments.find((e) => e.traineeId?.toString() === o.traineeId?.toString());
      const sec = match?.courseId?.category || 'General';
      if (sectorMap[sec]) {
        if (['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP'].includes(o.situation)) {
          sectorMap[sec].placed += 1;
        }
        const salary = o.employmentData?.monthlySalary || 0;
        if (salary > 0) {
          sectorMap[sec].totalWage += salary;
          sectorMap[sec].wageCount += 1;
        }
      }
    });
    const sectors = Object.values(sectorMap).map((s) => ({
      name: s.name,
      enrolled: s.enrolled,
      placed: s.placed,
      rate: s.enrolled > 0 ? Math.round((s.placed / s.enrolled) * 100) : 0,
      wage: s.wageCount > 0 ? Math.round(s.totalWage / s.wageCount) : 0,
    }));

    // 8. Provider Breakdown (Level 1 Drill-Down)
    const providerMap = {};
    enrollments.forEach((e) => {
      const pId = e.providerId?._id?.toString();
      if (!pId) return;
      if (!providerMap[pId]) {
        providerMap[pId] = {
          providerId: pId,
          code: e.providerId.registrationNumber || `PRV-${pId.substring(0, 5).toUpperCase()}`,
          name: e.providerId.organizationName,
          providerName: e.providerId.organizationName,
          tier: 1,
          traineeCount: 0,
          enrolledCount: 0,
          completedCount: 0,
          placedCount: 0,
          courses: new Set(),
        };
      }
      providerMap[pId].enrolledCount += 1;
      providerMap[pId].traineeCount += 1;
      if (e.status === 'COMPLETED') providerMap[pId].completedCount += 1;
      if (e.courseId?.courseName) providerMap[pId].courses.add(e.courseId.courseName);
    });
    outcomes.forEach((o) => {
      const pId = o.providerId?.toString();
      if (providerMap[pId] && ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP'].includes(o.situation)) {
        providerMap[pId].placedCount += 1;
      }
    });
    const providers = Object.values(providerMap).map((p) => ({
      ...p,
      courses: Array.from(p.courses),
      completionRate: p.enrolledCount > 0 ? Math.round((p.completedCount / p.enrolledCount) * 100) : 0,
      placementRate: p.completedCount > 0 ? Math.round((p.placedCount / p.completedCount) * 100) : 0,
      retentionRate: retention12M,
    }));

    // 9. Course Breakdown
    const courseMap = {};
    enrollments.forEach((e) => {
      const c = e.courseId;
      if (!c) return;
      const cId = c._id.toString();
      if (!courseMap[cId]) {
        courseMap[cId] = {
          code: c.courseCode || `CRS-${cId.substring(0, 5).toUpperCase()}`,
          title: c.courseName,
          sector: c.category || 'Technical',
          durationHours: c.durationHours || 0,
          alignmentScore: c.marketAlignmentScore || 0,
          avgSalary: 0,
        };
      }
    });
    const courses = Object.values(courseMap);

    // 10. Trainee Roster
    const trainees = districtTrainees.slice(0, 50).map((t) => {
      const outcome = outcomes.find((o) => o.traineeId?.toString() === t._id.toString());
      return {
        _id: t._id,
        internalTraineeId: t.internalTraineeId,
        fullName: t.userId?.name || 'Trainee',
        gender: t.gender,
        demographics: { category: t.socialCategory },
        status: outcome?.situation || 'ENROLLED',
        salary: outcome?.employmentData?.monthlySalary || 0,
        isVerified: outcome?.isVerified || false,
      };
    });

    // 11. Top Skill Gaps in District
    const skillGaps = await SkillGapAnalysis.aggregate([
      { $match: { traineeId: { $in: traineeIds } } },
      { $unwind: '$skillResults' },
      {
        $group: {
          _id: '$skillResults.skillName',
          count: { $sum: 1 },
          criticalCount: {
            $sum: {
              $cond: [{ $in: ['$skillResults.classification', ['CRITICAL_GAP', 'AT_RISK']] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          skillName: '$_id',
          gapPercentage: { $round: [{ $multiply: [{ $divide: ['$criticalCount', '$count'] }, 100] }, 1] },
        },
      },
      { $sort: { gapPercentage: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        district: selectedDistrict,
        selectedDistrict,
        availableDistricts: validDistricts,
        districts: validDistricts,
        kpis: {
          totalTrainees: traineeIds.length,
          totalEnrolled,
          completedCount,
          completionRate,
          employedCount,
          employmentRate,
          placementRate: employmentRate,
          verifiedCount,
          verifiedEmploymentRate,
          retention12M,
          retentionRate: retention12M,
          avgWage3M,
          avgWage12M,
          avgSalary: avgWage12M || avgWage3M,
          wageProgression,
          providerCount: providers.length,
        },
        metrics: {
          totalEnrolled,
          completedCount,
          completionRate,
          employedCount,
          employmentRate,
          verifiedEmploymentRate,
          retention12M,
          avgWage3M,
          avgWage12M,
          wageProgression,
        },
        sectors,
        providers,
        courses,
        trainees,
        providerBreakdown: providers,
        topSkillGaps: skillGaps,
      },
    });
  } catch (error) {
    console.error('getDistrictAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/analytics/demographics
 * Privacy-conscious demographic aggregation with small-cohort suppression (< 5 suppressed)
 */
const getDemographicAnalytics = async (req, res) => {
  try {
    const dimension = req.query.dimension || 'socialCategory'; // 'socialCategory', 'gender', 'residenceType', 'educationLevel'

    const groupField = `$${dimension}`;

    const agg = await Trainee.aggregate([
      { $match: { [dimension]: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: groupField,
          totalTrainees: { $sum: 1 },
          traineeIds: { $push: '$_id' },
        },
      },
    ]);

    // Calculate outcomes per demographic segment
    const segmentResults = await Promise.all(
      agg.map(async (seg) => {
        // Small-cohort suppression for privacy preservation
        if (seg.totalTrainees < 5) {
          return {
            segment: seg._id,
            totalTrainees: '< 5 (Suppressed for Privacy)',
            completionRate: 'N/A',
            employmentRate: 'N/A',
            verifiedRate: 'N/A',
            averageWage: 'N/A',
          };
        }

        const enrollments = await Enrollment.find({ traineeId: { $in: seg.traineeIds } });
        const completed = enrollments.filter((e) => e.status === 'COMPLETED').length;
        const completionRate = enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0;

        const outcomes = await OutcomeRecord.find({
          traineeId: { $in: seg.traineeIds },
          situation: { $in: ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP'] },
        });

        const verifications = await OutcomeVerification.countDocuments({
          traineeId: { $in: seg.traineeIds },
          status: 'VERIFIED',
        });

        const wages = outcomes.filter((o) => o.employmentData?.monthlySalary > 0);
        const avgWage = wages.length > 0 ? Math.round(wages.reduce((s, o) => s + o.employmentData.monthlySalary, 0) / wages.length) : 0;

        return {
          segment: seg._id,
          totalTrainees: seg.totalTrainees,
          completionRate,
          employmentRate: completed > 0 ? Math.round((outcomes.length / completed) * 100) : 0,
          verifiedRate: completed > 0 ? Math.round((verifications / completed) * 100) : 0,
          averageWage: avgWage > 0 ? `₹${avgWage.toLocaleString()}` : 'N/A',
        };
      })
    );

    res.json({
      success: true,
      dimension,
      data: segmentResults,
    });
  } catch (error) {
    console.error('getDemographicAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/analytics/provider-scorecard
 * Multidimensional provider scorecards
 */
const getProviderScorecard = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'PROVIDER') {
      const Provider = require('../models/Provider');
      const provider = await Provider.findOne({ userId: req.user._id });
      if (!provider) return res.json({ success: true, data: [] });
      filter._id = provider._id;
    }

    const providers = await Provider.find(filter).lean();

    const scorecards = await Promise.all(
      providers.map(async (p) => {
        const [
          enrolledCount,
          completedCount,
          placedCount,
          verifiedCount,
          outcomes3M,
          outcomes12M,
          remedialCount,
        ] = await Promise.all([
          Enrollment.countDocuments({ providerId: p._id }),
          Enrollment.countDocuments({ providerId: p._id, status: 'COMPLETED' }),
          OutcomeRecord.countDocuments({ providerId: p._id, situation: { $in: ['EMPLOYED', 'SELF_EMPLOYED', 'APPRENTICESHIP'] } }),
          OutcomeVerification.countDocuments({ providerId: p._id, status: 'VERIFIED' }),
          OutcomeRecord.countDocuments({ providerId: p._id, followUpType: '3_MONTH', situation: { $in: ['EMPLOYED', 'SELF_EMPLOYED'] } }),
          OutcomeRecord.countDocuments({ providerId: p._id, followUpType: '12_MONTH', situation: { $in: ['EMPLOYED', 'SELF_EMPLOYED'] } }),
          RemedialAction.countDocuments({ providerId: p._id, status: 'REASSESSED' }),
        ]);

        const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;
        const placementRate = completedCount > 0 ? Math.round((placedCount / completedCount) * 100) : 0;
        const verifiedRate = completedCount > 0 ? Math.round((verifiedCount / completedCount) * 100) : 0;
        const retention12M = outcomes3M > 0 ? Math.round((outcomes12M / outcomes3M) * 100) : 0;

        // Multidimensional Provider Quality Index (Normalized, Explainable)
        const qualityIndex = Math.round(
          completionRate * 0.2 +
          placementRate * 0.3 +
          verifiedRate * 0.25 +
          retention12M * 0.15 +
          Math.min(10, remedialCount * 2)
        );

        return {
          providerId: p._id,
          organizationName: p.organizationName,
          registrationNumber: p.registrationNumber,
          contactPerson: p.contactPerson,
          metrics: {
            enrolledCount,
            completedCount,
            completionRate,
            placementRate,
            verifiedRate,
            retention12M,
            remedialInterventionsCompleted: remedialCount,
            qualityIndex,
          },
        };
      })
    );

    res.json({
      success: true,
      count: scorecards.length,
      data: scorecards.sort((a, b) => b.metrics.qualityIndex - a.metrics.qualityIndex),
    });
  } catch (error) {
    console.error('getProviderScorecard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/analytics/policy-insights
 * Explainable government resource & policy recommendations with auditable Evidence Chains
 */
const getPolicyRecommendations = async (req, res) => {
  try {
    const outcomeCount = await OutcomeRecord.countDocuments();
    if (outcomeCount < 10) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        evidenceStatus: 'INSUFFICIENT_EVIDENCE',
        message:
          'Insufficient longitudinal outcome evidence. At least 10 completed outcome observations are required to synthesize explainable policy recommendations with auditable evidence chains.',
      });
    }

    const recommendations = await PolicyRecommendation.find({})
      .sort({ priority: 1, createdAt: -1 });

    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations,
      evidenceStatus: 'SUFFICIENT_EVIDENCE',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/analytics/policy-insights/:id/status
 */
const updatePolicyRecommendationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const rec = await PolicyRecommendation.findByIdAndUpdate(
      id,
      {
        status,
        adminNotes: adminNotes || '',
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
      },
      { new: true }
    );

    res.json({ success: true, data: rec });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDistrictAnalytics,
  getDemographicAnalytics,
  getProviderScorecard,
  getPolicyRecommendations,
  updatePolicyRecommendationStatus,
};
