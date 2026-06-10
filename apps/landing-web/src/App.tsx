import React from 'react';
import { LandingPage } from './pages/LandingPage';
import { NavigationProvider } from './context/NavigationContext';

export default function App() {
  return (
    <NavigationProvider>
      <div className="aether-app-container select-none">
        {/* Aurora backdrop glow effect */}
        <div className="aether-aurora opacity-50" />
        
        {/* Main landing content */}
        <LandingPage />
      </div>
    </NavigationProvider>
  );
}

