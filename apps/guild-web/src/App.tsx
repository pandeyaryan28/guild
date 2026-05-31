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
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';

// Onboarding
import { OnboardingRoot } from './pages/onboarding/OnboardingRoot';
import { JoinInvitePage } from './pages/onboarding/JoinInvitePage';

// Dashboard (existing)
import { RedesignLayout } from './components/redesign/Layout';
import { DashboardControl } from './components/redesign/DashboardControl';

// Chat
import { ChatLayout } from './pages/chat/ChatLayout';

// Tasks & Work
import { TaskCanvas } from './components/redesign/TaskCanvas';
import { RequestsPage } from './pages/requests/RequestsPage';
import { PeoplePage } from './pages/people/PeoplePage';
import { SettingsPage } from './pages/workspace/SettingsPage';
import { CalendarPage } from './pages/calendar/CalendarPage';

// Execution OS
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';

// Reports
import { ReportsPage } from './pages/reports/ReportsPage';

// Responsive Controllers
import { useDeviceType } from './hooks/useDeviceType';
import { MobileApp } from './components/mobile/MobileApp';

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
        <AppContent />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
