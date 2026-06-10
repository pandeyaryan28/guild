import { LandingPage } from './pages/LandingPage';
import { NavigationProvider } from './context/NavigationContext';

export default function App() {
  return (
    <NavigationProvider>
      <LandingPage />
    </NavigationProvider>
  );
}
