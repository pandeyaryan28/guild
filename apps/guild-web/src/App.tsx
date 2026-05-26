/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ProtectedRoute } from './components/ProtectedRoute';

// Auth pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';

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
import { GoalDetailPage } from './pages/goals/GoalDetailPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { GoalsPage } from './pages/goals/GoalsPage';

// Reports
import { ReportsPage } from './pages/reports/ReportsPage';

function DashboardApp({ children }: { children?: React.ReactNode }) {
  return (
    <RedesignLayout>
      {children ?? <DashboardControl />}
    </RedesignLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
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

          {/* Tasks Board View */}
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

          {/* Goals Board View */}
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <DashboardApp>
                  <GoalsPage />
                </DashboardApp>
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
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
