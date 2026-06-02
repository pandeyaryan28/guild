import React from 'react';
import { LandingPage } from './pages/LandingPage';

export default function App() {
  return (
    <div className="aether-app-container select-none">
      {/* Aurora backdrop glow effect */}
      <div className="aether-aurora opacity-50" />
      
      {/* Main landing content */}
      <LandingPage />
    </div>
  );
}
