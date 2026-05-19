import * as React from 'react';
import { onAuthStateChanged, signOut } from '../lib/auth';
import { getUserById, getOnboardingState, type UserProfile, type OnboardingState } from '../lib/firestore';
import { type User } from 'firebase/auth';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  onboarding: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [onboarding, setOnboarding] = React.useState<OnboardingState | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      setLoading(true);
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const [profile, onboardingState] = await Promise.all([
            getUserById(firebaseUser.uid),
            getOnboardingState(firebaseUser.uid),
          ]);
          setUserProfile(profile);
          setOnboarding(onboardingState);
        } catch {
          setUserProfile(null);
          setOnboarding(null);
        }
      } else {
        setUserProfile(null);
        setOnboarding(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, onboarding, loading, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
