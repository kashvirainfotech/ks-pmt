import React, { lazy, Suspense } from 'react';
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
const TasksView = lazy(() => import('./components/tasks/TasksView').then(module => ({ default: module.TasksView })));
import { AuditLogsView } from './components/audit/AuditLogsView';
import { adminScreens, portfolioScreens } from './components/management/screens';
import { TeamsManagementView } from './components/teams/TeamsManagementView';
import { ComponentsCatalogView } from './components/components/ComponentsCatalogView';
import { HandoffsWorkspaceView } from './components/handoffs/HandoffsWorkspaceView';
import { WorkflowSchemesEditorView } from './components/workflows/WorkflowSchemesEditorView';
import { ClientContactsView } from './components/clients/ClientContactsView';
import { ClientIntakeTriageView } from './components/clients/ClientIntakeTriageView';
import { CustomerPortalWorkspace } from './components/clients/CustomerPortalWorkspace';
import { RequirementsTraceabilityView } from './components/requirements/RequirementsTraceabilityView';
import { ChangeRequestsView } from './components/change-requests/ChangeRequestsView';
import { UatPackagesView } from './components/uat-packages/UatPackagesView';
import { ClientReportsView } from './components/client-reports/ClientReportsView';
import { RaidWorkspaceView } from './components/raid/RaidWorkspaceView';
import { ProductRoadmapView } from './components/product-roadmap/ProductRoadmapView';
import { QualityAssuranceWorkspace } from './components/qa/QualityAssuranceWorkspace';

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
        <Route path="tasks" element={<Suspense fallback={<p role="status">Loading task workspace...</p>}><TasksView /></Suspense>} />
        {portfolioScreens.map(screen => (
          <Route key={screen.path} path={screen.path} element={<PortfolioPage key={screen.path} screen={screen} />} />
        ))}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="timesheets" element={<TimesheetsPage />} />
        <Route path="teams" element={<TeamsManagementView />} />
        <Route path="components" element={<ComponentsCatalogView />} />
        <Route path="handoffs" element={<HandoffsWorkspaceView />} />
        <Route path="workflow-schemes" element={<WorkflowSchemesEditorView />} />
        <Route path="client-contacts" element={<ClientContactsView />} />
        <Route path="client-intake" element={<ClientIntakeTriageView />} />
        <Route path="requirements" element={<RequirementsTraceabilityView />} />
        <Route path="change-requests" element={<ChangeRequestsView />} />
        <Route path="uat-packages" element={<UatPackagesView />} />
        <Route path="qa" element={<QualityAssuranceWorkspace />} />
        <Route path="client-reports" element={<ClientReportsView />} />
        <Route path="raid" element={<RaidWorkspaceView />} />
        <Route path="product-roadmap" element={<ProductRoadmapView />} />
        <Route path="customer-portal" element={<CustomerPortalWorkspace />} />
        <Route path="admin" element={<Navigate to="/admin/branches" replace />} />
        {adminScreens.map(screen => (
          <Route key={screen.path} path={screen.path} element={<AdminPage key={screen.path} screen={screen} />} />
        ))}
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
