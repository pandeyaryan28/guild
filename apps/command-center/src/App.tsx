import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminAuthProvider, useSuperAdminAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedScreen } from './components/auth/AccessDeniedScreen';
import { CommandLayout } from './components/layout/CommandLayout';
import { OverviewPage } from './pages/OverviewPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { UsersPage } from './pages/UsersPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

function SuperAdminGuard() {
  const { state } = useSuperAdminAuth();

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 bg-dot-grid">
        <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs text-muted-foreground animate-pulse">
          VERIFYING_PLATFORM_CREDENTIALS...
        </p>
      </div>
    );
  }

  if (state.status === 'unauthenticated') {
    return <LoginPage />;
  }

  if (state.status === 'unauthorized') {
    return <AccessDeniedScreen email={state.email} reason={state.reason} />;
  }

  return (
    <Routes>
      <Route element={<CommandLayout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <SuperAdminAuthProvider>
        <BrowserRouter>
          <SuperAdminGuard />
        </BrowserRouter>
      </SuperAdminAuthProvider>
    </ThemeProvider>
  );
}

export default App;
