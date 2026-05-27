import * as React from 'react';
import { onAuthStateChanged, signOut } from '../lib/auth';
import { getOnboardingState, type UserProfile, type OnboardingState } from '../lib/firestore';
import { type User } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous profile listener if exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        setLoading(true);
        try {
          // Fetch onboarding state once
          const onboardingState = await getOnboardingState(firebaseUser.uid);
          setOnboarding(onboardingState);

          // Subscribe to real-time changes to the user's profile document
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeProfile = onSnapshot(
            userRef,
            (snap) => {
              if (snap.exists()) {
                setUserProfile(snap.data() as UserProfile);
              } else {
                setUserProfile(null);
              }
              setLoading(false);
            },
            (error) => {
              console.error('Error listening to user profile in AuthProvider:', error);
              setLoading(false);
            }
          );
        } catch (error) {
          console.error('Error in AuthProvider initialization:', error);
          setUserProfile(null);
          setOnboarding(null);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setOnboarding(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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
