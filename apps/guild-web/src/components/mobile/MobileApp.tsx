import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MobileLayout } from './MobileLayout';
import { MobileDashboard } from './pages/MobileDashboard';
import { MobileChat } from './pages/MobileChat';
import { MobileWorkspace } from './pages/MobileWorkspace';
import { MobileRequests } from './pages/MobileRequests';
import { MobileSettings } from './pages/MobileSettings';
import { ProtectedRoute } from '../ProtectedRoute';

import { MobilePeople } from './pages/MobilePeople';
import { MobileCalendar } from './pages/MobileCalendar';
import { MobileReports } from './pages/MobileReports';
import { MobileProjectDetail } from './pages/MobileProjectDetail';
const StudioPage = React.lazy(() => import('../../pages/studio/StudioPage').then(m => ({ default: m.StudioPage })));

export function MobileApp() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileDashboard />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileChat />
            </MobileLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Detached immersive fullscreen chats do not get base MobileLayout wraps */}
      <Route
        path="/chat/c/:channelId"
        element={
          <ProtectedRoute>
            <MobileChat />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/chat/dm/:dmId"
        element={
          <ProtectedRoute>
            <MobileChat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/studio"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <StudioPage />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileWorkspace />
            </MobileLayout>
          </ProtectedRoute>
        }
      />


      {/* Register Project detail view for mobile */}
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileProjectDetail />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      {/* Register Team Members Directory for mobile */}
      <Route
        path="/people"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobilePeople />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      {/* Register Calendar & Schedule Planner for mobile */}
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileCalendar />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      {/* Register Reports & Analytics for mobile */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileReports />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileRequests />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MobileLayout>
              <MobileSettings />
            </MobileLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirect all unmatched mobile requests to mobile dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
export default MobileApp;
