import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from './ProtectedRoute';

// Layouts
import { AdminLayout } from '../layouts/AdminLayout';
import { ProviderLayout } from '../layouts/ProviderLayout';
import { TraineeLayout } from '../layouts/TraineeLayout';

// Auth Pages
import { Login } from '../pages/auth/Login';

// Public Verification & Tracking Pages
import { VerifyCertificate } from '../pages/public/VerifyCertificate';
import { TraineeTrackingPage } from '../pages/public/TraineeTrackingPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/Dashboard';
import { AdminProviders } from '../pages/admin/Providers';
import { AdminCourses } from '../pages/admin/Courses';
import { AdminBatches } from '../pages/admin/Batches';
import { AdminTrainees } from '../pages/admin/Trainees';
import { AdminEnrollments } from '../pages/admin/Enrollments';
import { AdminCertificates } from '../pages/admin/Certificates';
import { TimeSimulation } from '../pages/admin/TimeSimulation';
import { AdminFollowUps } from '../pages/admin/FollowUps';
import { AdminOutcomes } from '../pages/admin/Outcomes';
import { AdminAssessments } from '../pages/admin/Assessments';
import { AdminSkillGapAnalysis } from '../pages/admin/SkillGapAnalysis';
import { AdminProviderComparison } from '../pages/admin/ProviderComparison';
import { AdminCourseComparison } from '../pages/admin/CourseComparison';
import { AdminFundingSchemes } from '../pages/admin/FundingSchemes';
import { AdminDataQuality } from '../pages/admin/DataQuality';
import { AdminAIInsights } from '../pages/admin/AIInsights';
import { DistrictAnalytics } from '../pages/admin/DistrictAnalytics';
import { DemographicAnalytics } from '../pages/admin/DemographicAnalytics';
import { PolicyInsights } from '../pages/admin/PolicyInsights';

// Provider Pages
import { ProviderDashboard } from '../pages/provider/Dashboard';
import { ProviderCourses } from '../pages/provider/Courses';
import { ProviderBatches } from '../pages/provider/Batches';
import { ProviderTrainees } from '../pages/provider/Trainees';
import { ProviderEnrollments } from '../pages/provider/Enrollments';
import { ProviderProfile } from '../pages/provider/Profile';
import { ProviderFollowUps } from '../pages/provider/FollowUps';
import { ProviderOutcomes } from '../pages/provider/Outcomes';
import { ProviderAssessments } from '../pages/provider/Assessments';
import { ProviderSkillGaps } from '../pages/provider/SkillGaps';
import { ProviderRemedialActions } from '../pages/provider/RemedialActions';

// Trainee Pages
import { TraineeDashboard } from '../pages/trainee/Dashboard';
import { TraineeAssessments } from '../pages/trainee/Assessments';
import { TraineeTakeAssessment } from '../pages/trainee/TakeAssessment';
import { TraineeSkillReport } from '../pages/trainee/SkillReport';

export const AppRouter = () => {
  const { user, isAuthenticated, loading } = useAuth();

  // Root redirect logic
  const RootRedirect = () => {
    if (loading) return null;
    if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'PROVIDER') return <Navigate to="/provider" replace />;
    if (user.role === 'TRAINEE') return <Navigate to="/trainee" replace />;
    return <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      {/* Root Route */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Public Certificate Verification Routes (No login required) */}
      <Route path="/verify-certificate" element={<VerifyCertificate />} />
      <Route path="/verify-certificate/:code" element={<VerifyCertificate />} />

      {/* Public Secure Trainee Outcome Tracking Routes (No login required) */}
      <Route path="/tracking/:token" element={<TraineeTrackingPage />} />
      <Route path="/followup-response/:token" element={<TraineeTrackingPage />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout title="System Administration" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="time-simulation" element={<TimeSimulation />} />
        <Route path="assessments" element={<AdminAssessments />} />
        <Route path="skill-gaps" element={<AdminSkillGapAnalysis />} />
        <Route path="provider-comparison" element={<AdminProviderComparison />} />
        <Route path="course-comparison" element={<AdminCourseComparison />} />
        <Route path="funding-schemes" element={<AdminFundingSchemes />} />
        <Route path="policy-insights" element={<PolicyInsights />} />
        <Route path="district-analytics" element={<DistrictAnalytics />} />
        <Route path="demographic-analytics" element={<DemographicAnalytics />} />
        <Route path="ai-insights" element={<AdminAIInsights />} />
        <Route path="data-quality" element={<AdminDataQuality />} />
        <Route path="follow-ups" element={<AdminFollowUps />} />
        <Route path="outcomes" element={<AdminOutcomes />} />
        <Route path="providers" element={<AdminProviders />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="batches" element={<AdminBatches />} />
        <Route path="trainees" element={<AdminTrainees />} />
        <Route path="enrollments" element={<AdminEnrollments />} />
        <Route path="certificates" element={<AdminCertificates />} />
      </Route>

      {/* Provider Protected Routes */}
      <Route
        path="/provider"
        element={
          <ProtectedRoute allowedRoles={['PROVIDER']}>
            <ProviderLayout title="Training Provider Workspace" />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboard />} />
        <Route path="assessments" element={<ProviderAssessments />} />
        <Route path="skill-gaps" element={<ProviderSkillGaps />} />
        <Route path="remedial-actions" element={<ProviderRemedialActions />} />
        <Route path="follow-ups" element={<ProviderFollowUps />} />
        <Route path="outcomes" element={<ProviderOutcomes />} />
        <Route path="courses" element={<ProviderCourses />} />
        <Route path="batches" element={<ProviderBatches />} />
        <Route path="trainees" element={<ProviderTrainees />} />
        <Route path="enrollments" element={<ProviderEnrollments />} />
        <Route path="profile" element={<ProviderProfile />} />
      </Route>

      {/* Trainee Protected Routes */}
      <Route
        path="/trainee"
        element={
          <ProtectedRoute allowedRoles={['TRAINEE']}>
            <TraineeLayout title="Student Learning Outcome Portal" />
          </ProtectedRoute>
        }
      >
        <Route index element={<TraineeDashboard />} />
        <Route path="assessments" element={<TraineeAssessments />} />
        <Route path="assessments/:id/take" element={<TraineeTakeAssessment />} />
        <Route path="skill-report" element={<TraineeSkillReport />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
