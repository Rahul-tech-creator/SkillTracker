/**
 * Market Skill Alignment Engine
 * Compares Course Competency Framework against Market Demand Dataset
 * Computes deterministic Course-Market Alignment Score and identifies missing high-demand skills
 */

const MarketSkill = require('../models/MarketSkill');
const Course = require('../models/Course');

/**
 * Evaluate alignment between a course and the labor market demand dataset
 * @param {ObjectId} courseId
 * @returns {Object} alignment evaluation
 */
const evaluateCourseMarketAlignment = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error('Course not found');

  const courseCompetencies = course.competencies || [];
  const courseSkills = courseCompetencies.map((c) => ({
    name: c.name.toLowerCase().trim(),
    weight: c.weight || 10,
    demand: c.currentDemandIndicator,
  }));

  // Fetch all active market skills
  const marketSkills = await MarketSkill.find({}).lean();
  if (marketSkills.length === 0) {
    return {
      alignmentScore: 80,
      missingHighDemandSkills: [],
      outdatedSkills: [],
      matchedSkillsCount: courseSkills.length,
      evaluatedAt: new Date(),
    };
  }

  // Find high demand market skills (demandIndex >= 70)
  const highDemandSkills = marketSkills.filter((m) => m.demandIndex >= 70);

  // Match course competencies against high demand skills
  let coveredWeight = 0;
  let totalCourseWeight = courseSkills.reduce((sum, s) => sum + s.weight, 0) || 100;
  const matchedMarketSkills = [];
  const missingHighDemandSkills = [];

  // Check which high-demand market skills are taught in the course
  highDemandSkills.forEach((m) => {
    const mName = m.skillName.toLowerCase().trim();
    const isCovered = courseSkills.some((c) => c.name.includes(mName) || mName.includes(c.name));
    if (isCovered) {
      matchedMarketSkills.push(m.skillName);
    } else {
      // If course is in relevant category (e.g. IT, Data, Healthcare)
      const isCategoryRelevant = !m.category || m.category.toLowerCase() === (course.category || '').toLowerCase() || course.courseName.toLowerCase().includes('stack') || course.courseName.toLowerCase().includes('data');
      if (isCategoryRelevant) {
        missingHighDemandSkills.push(m.skillName);
      }
    }
  });

  // Calculate covered weight from course skills that have high or moderate market demand
  courseSkills.forEach((c) => {
    const marketMatch = marketSkills.find((m) => m.skillName.toLowerCase().trim() === c.name || c.name.includes(m.skillName.toLowerCase().trim()));
    if (marketMatch) {
      const demandMultiplier = (marketMatch.demandIndex || 50) / 100;
      coveredWeight += c.weight * demandMultiplier;
    } else {
      coveredWeight += c.weight * 0.5; // Baseline default credit
    }
  });

  // Alignment Score: 0 - 100%
  const rawAlignment = (coveredWeight / totalCourseWeight) * 100;
  // Penalty for missing top-tier market skills
  const missingPenalty = Math.min(25, missingHighDemandSkills.slice(0, 3).length * 5);
  const alignmentScore = Math.max(35, Math.min(98, Math.round(rawAlignment - missingPenalty + 15)));

  // Identify potentially outdated skills (market skills with declining growth)
  const outdatedSkills = courseSkills
    .filter((c) => {
      const match = marketSkills.find((m) => m.skillName.toLowerCase().trim() === c.name);
      return match && match.growthTrend === 'DECLINING';
    })
    .map((c) => c.name);

  // Save back to Course record
  course.marketAlignmentScore = alignmentScore;
  course.missingHighDemandSkills = missingHighDemandSkills.slice(0, 5);
  course.outdatedSkills = outdatedSkills;
  course.marketEvaluatedAt = new Date();
  await course.save();

  return {
    alignmentScore,
    missingHighDemandSkills: missingHighDemandSkills.slice(0, 5),
    outdatedSkills,
    matchedMarketSkills,
    evaluatedAt: course.marketEvaluatedAt,
  };
};

module.exports = {
  evaluateCourseMarketAlignment,
};
