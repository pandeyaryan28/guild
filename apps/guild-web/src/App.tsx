/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { RightSidebarProvider } from './hooks/useRightSidebar';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

// Onboarding
import { OnboardingRoot } from './pages/onboarding/OnboardingRoot';
import { JoinInvitePage } from './pages/onboarding/JoinInvitePage';

// Dashboard (existing)
import { Layout } from './components/Layout';
import { DashboardHome } from './components/DashboardHome';

// Chat
import { ChatLayout } from './pages/chat/ChatLayout';

// Tasks & Work
import { TasksPage } from './pages/tasks/TasksPage';
import { RequestsPage } from './pages/requests/RequestsPage';
import { PeoplePage } from './pages/people/PeoplePage';
import { SettingsPage } from './pages/workspace/SettingsPage';

// Execution OS
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { GoalDetailPage } from './pages/goals/GoalDetailPage';

// Reports
import { ReportsPage } from './pages/reports/ReportsPage';

function DashboardApp({ children }: { children?: React.ReactNode }) {
  return (
    <Layout>
      {children ?? <DashboardHome />}
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <RightSidebarProvider>
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

          {/* Tasks — standalone full-page layout (like /chat) */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />

          {/* Workspace → redirect to /tasks (merged) */}
          <Route path="/workspace" element={<Navigate to="/tasks" replace />} />

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

          {/* Goal detail */}
          <Route
            path="/goals/:goalId"
            element={
              <ProtectedRoute>
                <DashboardApp>
                  <GoalDetailPage />
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

          {/* Invite join redirect */}
          <Route path="/join" element={<Navigate to="/onboarding/join/find" replace />} />
          <Route path="/join/:token" element={<JoinInvitePage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </RightSidebarProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
