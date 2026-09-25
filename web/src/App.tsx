import React from 'react';
import {
  ProfilePage,
  NotificationsPage,
} from './components/management/ProfilePage';
import { TimesheetsPage } from './components/management/TimesheetsPage';
import {
  AdminPage,
  PortfolioPage,
  ClientsPage,
  ReleaseCalendar,
} from './components/management/ManagementPages';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './components/auth/LoginPage';
import { BentoGridDashboard } from './components/dashboard/BentoGridDashboard';
import { TasksView } from './components/tasks/TasksView';
import { AuditLogsView } from './components/audit/AuditLogsView';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">
            Loading KS-PMT...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<BentoGridDashboard />} />
        <Route path="tasks" element={<TasksView />} />
        <Route path="projects" element={<PortfolioPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="timesheets" element={<TimesheetsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="releases" element={<ReleaseCalendar />} />
        <Route path="audit" element={<AuditLogsView />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
