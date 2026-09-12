const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const FollowUp = require('../models/FollowUp');
const OutcomeRecord = require('../models/OutcomeRecord');
const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const SkillGapAnalysis = require('../models/SkillGapAnalysis');
const Course = require('../models/Course');
const Provider = require('../models/Provider');
const Trainee = require('../models/Trainee');

/**
 * GET /api/data-quality
 * Returns data completeness indicators for admin dashboard.
 */
const getDataQuality = async (req, res) => {
  try {
    const totalEnrollments = await Enrollment.countDocuments();
    const completedEnrollments = await Enrollment.countDocuments({ status: 'COMPLETED' });
    const totalCertificates = await Certificate.countDocuments({ status: 'ISSUED' });

    // Assessment coverage
    const publishedAssessments = await Assessment.countDocuments({ status: 'PUBLISHED' });
    const coursesWithAssessments = await Assessment.distinct('courseId', { status: 'PUBLISHED' });
    const totalCourses = await Course.countDocuments({ status: 'ACTIVE' });
    const assessmentCoverage = totalCourses > 0
      ? Math.round((coursesWithAssessments.length / totalCourses) * 100) : 0;

    // Skill gap analysis coverage
    const assessedTrainees = await SkillGapAnalysis.distinct('traineeId');
    const totalTrainees = await Trainee.countDocuments({ status: 'ACTIVE' });
    const skillGapCoverage = totalTrainees > 0
      ? Math.round((assessedTrainees.length / totalTrainees) * 100) : 0;

    // Follow-up completion
    const totalFollowUps = await FollowUp.countDocuments();
    const completedFollowUps = await FollowUp.countDocuments({ status: 'COMPLETED' });
    const followUpCompletion = totalFollowUps > 0
      ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

    // Outcome records
    const totalOutcomes = await OutcomeRecord.countDocuments();

    // Missing data indicators
    const coursesWithoutSkills = await Course.countDocuments({ status: 'ACTIVE', $or: [{ skills: { $size: 0 } }, { skills: { $exists: false } }] });
    const providersWithoutDistrict = await Provider.countDocuments({ status: 'ACTIVE', $or: [{ district: '' }, { district: { $exists: false } }] });

    // Overall data quality
    let qualityScore = 0;
    let factors = 0;
    if (assessmentCoverage > 0) { qualityScore += assessmentCoverage; factors++; }
    if (followUpCompletion > 0) { qualityScore += followUpCompletion; factors++; }
    if (skillGapCoverage > 0) { qualityScore += skillGapCoverage; factors++; }
    if (totalOutcomes > 0 && completedEnrollments > 0) {
      const outcomeCoverage = Math.min(100, Math.round((totalOutcomes / completedEnrollments) * 100));
      qualityScore += outcomeCoverage;
      factors++;
    }

    const avgQuality = factors > 0 ? Math.round(qualityScore / factors) : 0;
    let overallQuality = 'LOW';
    if (avgQuality >= 70) overallQuality = 'HIGH';
    else if (avgQuality >= 40) overallQuality = 'MEDIUM';

    res.json({
      success: true,
      data: {
        overallQuality,
        qualityScore: avgQuality,
        indicators: {
          assessmentCoverage: { value: assessmentCoverage, label: 'Assessment Coverage', detail: `${coursesWithAssessments.length}/${totalCourses} courses` },
          skillGapCoverage: { value: skillGapCoverage, label: 'Skill Gap Analysis Coverage', detail: `${assessedTrainees.length}/${totalTrainees} trainees` },
          followUpCompletion: { value: followUpCompletion, label: 'Follow-Up Completion', detail: `${completedFollowUps}/${totalFollowUps} follow-ups` },
          totalEnrollments: { value: totalEnrollments, label: 'Total Enrollments' },
          completedEnrollments: { value: completedEnrollments, label: 'Completed Enrollments' },
          totalCertificates: { value: totalCertificates, label: 'Certificates Issued' },
          totalOutcomes: { value: totalOutcomes, label: 'Outcome Records' },
          publishedAssessments: { value: publishedAssessments, label: 'Published Assessments' },
        },
        missingData: {
          coursesWithoutSkills: { value: coursesWithoutSkills, label: 'Courses Without Skills Defined' },
          providersWithoutDistrict: { value: providersWithoutDistrict, label: 'Providers Without District' },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDataQuality };
