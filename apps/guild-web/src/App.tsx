/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ProtectedRoute } from './components/ProtectedRoute';
import { usePushNotifications } from './hooks/usePushNotifications';

// Auth pages
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage').then(m => ({ default: m.VerifyEmailPage })));

// Onboarding
const OnboardingRoot = React.lazy(() => import('./pages/onboarding/OnboardingRoot').then(m => ({ default: m.OnboardingRoot })));
const JoinInvitePage = React.lazy(() => import('./pages/onboarding/JoinInvitePage').then(m => ({ default: m.JoinInvitePage })));

// Dashboard (existing)
import { RedesignLayout } from './components/redesign/Layout';
const DashboardControl = React.lazy(() => import('./components/redesign/DashboardControl').then(m => ({ default: m.DashboardControl })));

// Chat
const ChatLayout = React.lazy(() => import('./pages/chat/ChatLayout').then(m => ({ default: m.ChatLayout })));

// Tasks & Work
const TaskCanvas = React.lazy(() => import('./components/redesign/TaskCanvas').then(m => ({ default: m.TaskCanvas })));
const RequestsPage = React.lazy(() => import('./pages/requests/RequestsPage').then(m => ({ default: m.RequestsPage })));
const PeoplePage = React.lazy(() => import('./pages/people/PeoplePage').then(m => ({ default: m.PeoplePage })));
const SettingsPage = React.lazy(() => import('./pages/workspace/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CalendarPage = React.lazy(() => import('./pages/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })));

// Execution OS
const ProjectDetailPage = React.lazy(() => import('./pages/projects/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })));

// Reports
const ReportsPage = React.lazy(() => import('./pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Responsive Controllers
import { useDeviceType } from './hooks/useDeviceType';
const MobileApp = React.lazy(() => import('./components/mobile/MobileApp').then(m => ({ default: m.MobileApp })));

// Premium Glassmorphism Global Loader
const GlobalLoader = () => (
  <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-50">
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing ring */}
      <div className="absolute w-20 h-20 border-2 border-indigo-500/10 rounded-full animate-ping duration-1000"></div>
      {/* Spinning glow ring */}
      <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
    <p className="mt-6 text-xs font-semibold text-indigo-400 tracking-widest uppercase animate-pulse">
      Loading Guild...
    </p>
  </div>
);

function DashboardApp({ children }: { children?: React.ReactNode }) {
  return (
    <RedesignLayout>
      {children ?? <DashboardControl />}
    </RedesignLayout>
  );
}

function AppContent() {
  const deviceType = useDeviceType();
  const { user } = useAuth();
  const { permission, requestPermission, syncPushSubscription } = usePushNotifications();

  React.useEffect(() => {
    if (!user) return;

    if (permission === 'default') {
      // Delay the permission prompt to give the SW time to fully install, activate,
      // and claim this client. Attempting pushManager.subscribe() too early (while
      // navigator.serviceWorker.controller === null) causes AbortError.
      const timer = setTimeout(() => {
        requestPermission(user.uid);
      }, 6000);
      return () => clearTimeout(timer);
    } else if (permission === 'granted') {
      // Re-sync subscription in background — wait for the SW controller to be set
      // first so we don't hit the AbortError on hard refreshes / first loads.
      const sync = async () => {
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.ready;
          // Give the SW controller a moment to be set after ready resolves
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

      {/* Protected dashboard routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardApp />
          </ProtectedRoute>
        }
      />

      {/* Chat routes — fully independent layout */}
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

      {/* Workspace — standalone full-page layout (like /chat) */}
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <RedesignLayout>
              <TaskCanvas />
            </RedesignLayout>
          </ProtectedRoute>
        }
      />


      {/* Project detail */}
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <ProjectDetailPage />
            </DashboardApp>
          </ProtectedRoute>
        }
      />

      {/* Requests */}
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <RequestsPage />
            </DashboardApp>
          </ProtectedRoute>
        }
      />

      {/* People */}
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <PeoplePage />
            </DashboardApp>
          </ProtectedRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <SettingsPage />
            </DashboardApp>
          </ProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <ReportsPage />
            </DashboardApp>
          </ProtectedRoute>
        }
      />

      {/* Calendar */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <DashboardApp>
              <CalendarPage />
            </DashboardApp>
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
        <React.Suspense fallback={<GlobalLoader />}>
          <AppContent />
        </React.Suspense>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
