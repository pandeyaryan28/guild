/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { WorkspaceDataProvider } from './context/WorkspaceDataContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { usePushNotifications } from './hooks/usePushNotifications';

// Auth pages
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Onboarding
const OnboardingRoot = React.lazy(() => import('./pages/onboarding/OnboardingRoot').then(m => ({ default: m.OnboardingRoot })));
const JoinInvitePage = React.lazy(() => import('./pages/onboarding/JoinInvitePage').then(m => ({ default: m.JoinInvitePage })));

// Layout
import { RedesignLayout } from './components/redesign/Layout';

// Primary App Views
const DashboardPage = React.lazy(() =>
  import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage || m.default }))
);
const WorkspaceCanvasPage = React.lazy(() =>
  import('./pages/workspace/WorkspaceCanvasPage').then(m => ({ default: m.WorkspaceCanvasPage || m.default }))
);
const ChatLayout = React.lazy(() =>
  import('./pages/chat/ChatLayout').then(m => ({ default: m.ChatLayout }))
);

// Secondary Views
const RequestsPage = React.lazy(() => import('./pages/requests/RequestsPage').then(m => ({ default: m.RequestsPage })));
const PeoplePage = React.lazy(() => import('./pages/people/PeoplePage').then(m => ({ default: m.PeoplePage })));
const SettingsPage = React.lazy(() => import('./pages/workspace/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CalendarPage = React.lazy(() => import('./pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ProjectDetailPage = React.lazy(() => import('./pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Responsive Controllers
import { useDeviceType } from './hooks/useDeviceType';
const MobileApp = React.lazy(() => import('./components/mobile/MobileApp').then(m => ({ default: m.MobileApp })));

// Dual-theme Global Loader
const GlobalLoader = () => (
  <div className="fixed inset-0 bg-background text-foreground flex flex-col items-center justify-center z-50">
    <div className="relative flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
    <p className="mt-4 text-xs font-medium text-muted-foreground tracking-wider uppercase">
      Loading Guild…
    </p>
  </div>
);

function TasksRedirect() {
  const location = useLocation();
  const search = location.search
    ? (location.search.includes('tab=') ? location.search : `${location.search}&tab=tasks`)
    : '?tab=tasks';
  return <Navigate to={`/workspace${search}`} replace />;
}

function StudioRedirect() {
  const location = useLocation();
  return <Navigate to={`/workspace${location.search}`} replace />;
}

function AppContent() {
  const deviceType = useDeviceType();
  const { user } = useAuth();
  const { permission, requestPermission, syncPushSubscription } = usePushNotifications();

  React.useEffect(() => {
    if (!user) return;

    if (permission === 'default') {
      const timer = setTimeout(() => {
        requestPermission(user.uid);
      }, 6000);
      return () => clearTimeout(timer);
    } else if (permission === 'granted') {
      const sync = async () => {
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.ready;
          await new Promise((r) => setTimeout(r, 1000));
        }
        syncPushSubscription(user.uid);
      };
      sync();
    }
  }, [user, permission, requestPermission, syncPushSubscription]);

  const location = useLocation();
  const publicRoutes = ['/login', '/signup', '/verify-email'];
  const isAuthOrOnboarding =
    publicRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/onboarding') ||
    location.pathname.startsWith('/join');

  if (deviceType === 'mobile' && !isAuthOrOnboarding) {
    return <MobileApp />;
  }

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      {/* Onboarding — requires auth, but not completed onboarding */}
      <Route path="/onboarding/*" element={<OnboardingRoot />} />

      {/* ─── 1. Root: Dedicated Dashboard View ─────────────────────────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <DashboardPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      {/* ─── 2. Workspace Canvas (Linear + Notion Unified Canvas) ──────────── */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <RedesignLayout fullBleed={true}>
              <WorkspaceCanvasPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      {/* ─── 3. Team Chat ─────────────────────────────────────────────────── */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/c/:channelId"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/dm/:dmId"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />

      {/* ─── Legacy Redirects ──────────────────────────────────────────────── */}
      <Route path="/tasks" element={<TasksRedirect />} />
      <Route path="/tasks/*" element={<TasksRedirect />} />
      <Route path="/feed" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/studio" element={<StudioRedirect />} />
      <Route path="/canvas" element={<Navigate to="/workspace" replace />} />

      {/* ─── Operational & Secondary Views ─────────────────────────────────── */}
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <ProjectDetailPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <RequestsPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <PeoplePage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <SettingsPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <ReportsPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <CalendarPage />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />

      {/* Invite join redirect */}
      <Route path="/join" element={<Navigate to="/onboarding/join/find" replace />} />
      <Route path="/join/:token" element={<JoinInvitePage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceDataProvider>
            <React.Suspense fallback={<GlobalLoader />}>
              <AppContent />
            </React.Suspense>
          </WorkspaceDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
