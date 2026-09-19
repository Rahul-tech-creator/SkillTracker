import axios from 'axios';
import { getSessionToken, clearSession } from '../utils/sessionManager';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token from session / cookies / localStorage
api.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) {
      clearSession();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(new Error(message));
  }
);

// --- Auth Endpoints ---
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// --- Admin Endpoints ---
export const adminService = {
  getStats: () => api.get('/admin/stats'),
};

// --- Provider Endpoints ---
export const providerService = {
  getAll: () => api.get('/providers'),
  getById: (id) => api.get(`/providers/${id}`),
  create: (data) => api.post('/providers', data),
  update: (id, data) => api.put(`/providers/${id}`, data),
  updateStatus: (id, status) => api.patch(`/providers/${id}/status`, { status }),
  resetPassword: (id, newPassword) => api.patch(`/providers/${id}/reset-password`, { newPassword }),
};

// --- Course Endpoints ---
export const courseService = {
  getAll: () => api.get('/courses'),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  updateStatus: (id, status) => api.patch(`/courses/${id}/status`, { status }),
};

// --- Batch Endpoints ---
export const batchService = {
  getAll: () => api.get('/batches'),
  getById: (id) => api.get(`/batches/${id}`),
  create: (data) => api.post('/batches', data),
  update: (id, data) => api.put(`/batches/${id}`, data),
};

// --- Trainee Endpoints ---
export const traineeService = {
  getAll: () => api.get('/trainees'),
  getById: (id) => api.get(`/trainees/${id}`),
  create: (data) => api.post('/trainees', data),
  update: (id, data) => api.put(`/trainees/${id}`, data),
};

// --- Enrollment Endpoints ---
export const enrollmentService = {
  getAll: () => api.get('/enrollments'),
  getById: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post('/enrollments', data),
  updateStatus: (id, status) => api.patch(`/enrollments/${id}/status`, { status }),
};

// --- Certificate Endpoints ---
export const certificateService = {
  getAll: (params) => api.get('/certificates', { params }),
  getById: (id) => api.get(`/certificates/${id}`),
  getMy: () => api.get('/certificates/my'),
  issue: (enrollmentId) => api.post(`/certificates/issue/${enrollmentId}`),
  revoke: (id) => api.patch(`/certificates/${id}/revoke`),
  verify: (code) => api.get(`/certificates/verify/${code}`),
  getStats: () => api.get('/certificates/stats'),
};

// --- Time Simulation Endpoints ---
export const timeService = {
  getTime: () => api.get('/time'),
  setMode: (mode) => api.put('/time/mode', { mode }),
  setSimulation: (date, time) => api.put('/time/simulation', { date, time }),
  advance: (days) => api.post('/time/advance', { days }),
  reset: () => api.post('/time/reset'),
};

// --- Consent Endpoints ---
export const consentService = {
  getMy: () => api.get('/consents/my'),
  submit: (data) => api.post('/consents', data),
  getAll: (params) => api.get('/consents', { params }),
};

// --- FollowUp Endpoints ---
export const followUpService = {
  getMy: () => api.get('/followups/my'),
  getAll: (params) => api.get('/followups', { params }),
  getStats: () => api.get('/followups/stats'),
  getById: (id) => api.get(`/followups/${id}`),
  submit: (id, data) => api.post(`/followups/${id}/submit`, data),
  markUnreachable: (id, notes) => api.patch(`/followups/${id}/unreachable`, { notes }),
  // Public Token endpoints
  getByToken: (token) => api.get(`/followups/token/${token}`),
  submitByToken: (token, data) => api.post(`/followups/token/${token}/submit`, data),
  optOutByToken: (token, data) => api.post(`/followups/token/${token}/opt-out`, data),
  resumeByToken: (token) => api.post(`/followups/token/${token}/resume`),
  // Trainee opt-out / resume
  optOut: (data) => api.post('/followups/opt-out', data),
  resume: () => api.post('/followups/resume'),
  // Operational triggers
  sendDigital: (id, channel) => api.post(`/followups/${id}/digital-contact`, { channel }),
  recordCall: (id, data) => api.post(`/followups/${id}/record-call`, data),
  markReturned: (id, notes) => api.post(`/followups/${id}/mark-returned`, { notes }),
  getHistory: (id) => api.get(`/followups/${id}/history`),
  // Government Tracking Queue (Admin)
  getGovernmentQueue: (params) => api.get('/followups/government-tracking/queue', { params }),
  updateGovernmentStatus: (id, data) => api.patch(`/followups/government-tracking/${id}/status`, data),
  // Assisted Queue & Call Logging
  getAssistedQueue: (params) => api.get('/followups/assisted-queue', { params }),
  logCall: (id, data) => api.post(`/followups/${id}/log-call`, data),
  // Configuration Settings (Admin)
  getSettings: () => api.get('/followups/settings'),
  updateSettings: (data) => api.put('/followups/settings', data),
};

// --- Outcome Endpoints ---
export const outcomeService = {
  getMy: () => api.get('/outcomes/my'),
  getAll: (params) => api.get('/outcomes', { params }),
  getStats: () => api.get('/outcomes/stats'),
  getVerification: (id) => api.get(`/outcomes/${id}/verification`),
  verify: (id, data) => api.post(`/outcomes/${id}/verify`, data),
  getDiscrepancies: () => api.get('/outcomes/discrepancies'),
  getWageRetentionIntelligence: (params) => api.get('/outcomes/intelligence/wage-retention', { params }),
  getRootCauses: (params) => api.get('/outcomes/intelligence/root-causes', { params }),
};

// --- Notification Endpoints ---
export const notificationService = {
  getMy: () => api.get('/notifications/my'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// --- Assessment Endpoints ---
export const assessmentService = {
  generate: (data) => api.post('/assessments/generate', data),
  getAll: (params) => api.get('/assessments', { params }),
  getById: (id) => api.get(`/assessments/${id}`),
  publish: (id) => api.patch(`/assessments/${id}/publish`),
  start: (id) => api.post(`/assessments/${id}/start`),
  answerCaseStudy: (id, data) => api.post(`/assessments/${id}/case-study/answer`, data),
  completeCaseStudy: (id, data) => api.post(`/assessments/${id}/case-study/complete`, data),
  answerAdaptive: (id, data) => api.post(`/assessments/${id}/adaptive/answer`, data),
  retryAdaptive: (id, data) => api.post(`/assessments/${id}/adaptive/retry`, data),
  submit: (id, data) => api.post(`/assessments/${id}/submit`, data),
  getAttempts: (id) => api.get(`/assessments/${id}/attempts`),
};

// --- Skill Gap Endpoints ---
export const skillGapService = {
  analyze: (attemptId) => api.post(`/skill-gaps/analyze/${attemptId}`),
  getMy: () => api.get('/skill-gaps/my'),
  getByTrainee: (traineeId) => api.get(`/skill-gaps/trainee/${traineeId}`),
  getByCourse: (courseId) => api.get(`/skill-gaps/course/${courseId}`),
  getMarketAlignment: (courseId) => api.get(`/skill-gaps/market-alignment/${courseId}`),
  getSystemicGaps: () => api.get('/skill-gaps/systemic-gaps'),
  getQuestionBank: (params) => api.get('/skill-gaps/question-bank', { params }),
};

// --- Remedial Action Endpoints ---
export const remedialActionService = {
  create: (data) => api.post('/remedial-actions', data),
  update: (id, data) => api.put(`/remedial-actions/${id}`, data),
  getAll: (params) => api.get('/remedial-actions', { params }),
  getRecurringGaps: (params) => api.get('/remedial-actions/recurring-gaps', { params }),
  reassess: (id, data) => api.post(`/remedial-actions/${id}/reassess`, data),
  getComparison: () => api.get('/remedial-actions/intelligence/comparison'),
};

// --- Provider Comparison Endpoints ---
export const providerComparisonService = {
  compare: (courseId) => api.get('/provider-comparison/compare', { params: { courseId } }),
  getAIAnalysis: (courseId) => api.post('/provider-comparison/ai-analysis', { courseId }),
};

// --- Course Comparison Endpoints ---
export const courseComparisonService = {
  compare: () => api.get('/course-comparison/compare'),
  getAIAnalysis: () => api.post('/course-comparison/ai-analysis'),
};

// --- Funding Scheme Endpoints ---
export const fundingSchemeService = {
  getAll: (params) => api.get('/funding-schemes', { params }),
  getById: (id) => api.get(`/funding-schemes/${id}`),
  create: (data) => api.post('/funding-schemes', data),
  update: (id, data) => api.put(`/funding-schemes/${id}`, data),
  getEligibleProviders: (id) => api.get(`/funding-schemes/${id}/eligible-providers`),
  getAIAnalysis: (id) => api.post(`/funding-schemes/${id}/ai-analysis`),
  assignProviders: (id, data) => api.post(`/funding-schemes/${id}/assign`, data),
};

// --- Data Quality Endpoints ---
export const dataQualityService = {
  get: () => api.get('/data-quality'),
};

// --- District & Demographic Analytics & Policy Intelligence ---
export const analyticsService = {
  getDistrictAnalytics: (params) => api.get('/analytics/districts', { params }),
  getDemographics: (params) => api.get('/analytics/demographics', { params }),
  getProviderScorecard: (providerId) => api.get(`/analytics/providers/${providerId}/scorecard`),
  getPolicyRecommendations: (params) => api.get('/analytics/policy-recommendations', { params }),
  updatePolicyStatus: (id, data) => api.patch(`/analytics/policy-recommendations/${id}/status`, data),
};

// --- Global Search Endpoints ---
export const searchService = {
  globalSearch: (q) => api.get('/search', { params: { q } }),
};

export default api;

