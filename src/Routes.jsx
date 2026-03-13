import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from 'react';
import { cleanupOverlays } from './utils/overlayCleanup';
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Help from './pages/Help';
import MainDashboard from './pages/main-dashboard';
import ActivitiesCalendar from './pages/activities/ActivitiesCalendar';
import CalendarPage from './pages/activities/CalendarPage';
import ActivitySessions from './pages/activities/ActivitySessions';
import Enrollments from './pages/enrollments/Enrollments';
import ActivityExpenses from './pages/activities/ActivityExpenses';
import ActivityAuditLogs from './pages/activities/ActivityAuditLogs';
import AdminDashboard from './pages/admin/admin-dashboard';
import UserManagement from './pages/admin/user-management';
import CareHomeManagement from './pages/admin/care-home-management';
import ResidentManagement from './pages/admin/resident-management';
import SuperAdminDashboard from './pages/admin/super-admin';
import StaffDashboard from './pages/staff/staff-dashboard';
import StaffResidents from './pages/staff/staff-residents';
import { TVDisplayControlPanel } from './pages/tv-display';
import TVDisplayModern from './pages/tv-display/TVDisplayModern';
import ActivityTVDisplay from './pages/tv-display/ActivityTVDisplay';
import ProtectedRoute from './components/ProtectedRoute';

const Routes = () => {
  // Global cleanup component: runs on route change to remove any stuck overlays/backdrops
  const OverlayCleanup = () => {
    const location = useLocation();
    useEffect(() => {
      // Run cleanup whenever the route changes
      cleanupOverlays();

      // Also install Esc handler to allow manual cleanup
      const onKey = (e) => {
        if (e.key === 'Escape') cleanupOverlays();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [location.pathname]);
    return null;
  };

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <OverlayCleanup />
      <RouterRoutes>
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Application Routes - Protected */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        
        {/* Activity Routes - Protected */}
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/activities" element={<ProtectedRoute><ActivitiesCalendar /></ProtectedRoute>} />
        <Route path="/sessions" element={<ProtectedRoute><ActivitySessions /></ProtectedRoute>} />
        <Route path="/enrollments" element={<ProtectedRoute><Enrollments /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><ActivityExpenses /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><ActivityAuditLogs /></ProtectedRoute>} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/care-home-management" element={<ProtectedRoute><CareHomeManagement /></ProtectedRoute>} />
        <Route path="/admin/resident-management" element={<ProtectedRoute><ResidentManagement /></ProtectedRoute>} />
        
        {/* Super Admin Routes - Protected */}
        <Route path="/super-admin" element={<ProtectedRoute requireSuperAdmin><SuperAdminDashboard /></ProtectedRoute>} />

        {/* Staff Routes - Protected */}
        <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="/staff/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
        <Route path="/staff/residents" element={<ProtectedRoute><StaffResidents /></ProtectedRoute>} />
        
        {/* TV Display Routes */}
        <Route path="/tv-display" element={<TVDisplayModern />} />
        <Route path="/tv-display/activity" element={<ActivityTVDisplay />} />
        <Route path="/tv-display-control" element={<ProtectedRoute><TVDisplayControlPanel /></ProtectedRoute>} />
        
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
