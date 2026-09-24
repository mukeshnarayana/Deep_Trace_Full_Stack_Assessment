import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import Layout from '../components/layout/Layout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import CampaignsPage from '../pages/CampaignsPage';
import SecurityEventsPage from '../pages/SecurityEventsPage';
import UsersPage from '../pages/UsersPage';
import AuditLogsPage from '../pages/AuditLogsPage';
import NotFoundPage from '../pages/NotFoundPage';
import { useAuth } from '../hooks/useAuth';

export const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          isAuthenticated && !loading ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Protected App Routes inside Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard: All roles */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Campaigns: All roles (view scoped by role on backend) */}
        <Route path="campaigns" element={<CampaignsPage />} />

        {/* Security Events: All roles */}
        <Route path="security-events" element={<SecurityEventsPage />} />

        {/* Users Directory: ADMIN and MANAGER only */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <UsersPage />
            </RoleRoute>
          }
        />

        {/* Audit Logs: ADMIN only */}
        <Route
          path="audit-logs"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
