require('dotenv').config();

console.log('Testing server module loads...');

try {
  // Test Models
  const Assessment = require('../models/Assessment');
  const AssessmentAttempt = require('../models/AssessmentAttempt');
  const SkillGapAnalysis = require('../models/SkillGapAnalysis');
  const RemedialAction = require('../models/RemedialAction');
  const FundingScheme = require('../models/FundingScheme');
  const AIAnalysisCache = require('../models/AIAnalysisCache');
  const Course = require('../models/Course');
  const Provider = require('../models/Provider');
  const Trainee = require('../models/Trainee');
  const SystemSetting = require('../models/SystemSetting');
  console.log('✓ All 10 models loaded successfully');

  // Test AI Services
  const grokClient = require('../services/ai/grokClient');
  const questionGen = require('../services/ai/questionGenerator');
  const skillGapAI = require('../services/ai/skillGapAnalyzer');
  const providerAI = require('../services/ai/providerAnalyzer');
  const courseAI = require('../services/ai/courseAnalyzer');
  const fundingAI = require('../services/ai/fundingAnalyzer');
  console.log('✓ All 6 AI services loaded successfully (Grok Available:', grokClient.isAvailable(), ')');

  // Test Controllers
  const assessmentCtrl = require('../controllers/assessmentController');
  const skillGapCtrl = require('../controllers/skillGapController');
  const remedialCtrl = require('../controllers/remedialActionController');
  const providerCompCtrl = require('../controllers/providerComparisonController');
  const courseCompCtrl = require('../controllers/courseComparisonController');
  const fundingCtrl = require('../controllers/fundingSchemeController');
  const dataQualityCtrl = require('../controllers/dataQualityController');
  console.log('✓ All 7 controllers loaded successfully');

  // Test Routes
  const assessmentRoutes = require('../routes/assessments');
  const skillGapRoutes = require('../routes/skillGaps');
  const remedialRoutes = require('../routes/remedialActions');
  const providerCompRoutes = require('../routes/providerComparison');
  const courseCompRoutes = require('../routes/courseComparison');
  const fundingRoutes = require('../routes/fundingSchemes');
  const dataQualityRoutes = require('../routes/dataQuality');
  console.log('✓ All 7 route modules loaded successfully');

  console.log('\n🌟 ALL BACKEND MODULES VERIFIED 100% HEALTHY!');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Module verification failed:', err);
  process.exit(1);
}
