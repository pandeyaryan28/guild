/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Onboarding
import { OnboardingRoot } from './pages/onboarding/OnboardingRoot';

// Dashboard (existing)
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';

// Chat
import { ChatLayout } from './pages/chat/ChatLayout';

// Tasks
import { TasksPage } from './pages/tasks/TasksPage';

function DashboardApp({ children }: { children?: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <div className={theme}>
      <Layout toggleTheme={toggleTheme} currentTheme={theme}>
        {children ?? <DashboardHome />}
      </Layout>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

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

          {/* Tasks */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <DashboardApp>
                  <TasksPage />
                </DashboardApp>
              </ProtectedRoute>
            }
          />

          {/* Invite join redirect */}
          <Route path="/join" element={<Navigate to="/onboarding/join/find" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
