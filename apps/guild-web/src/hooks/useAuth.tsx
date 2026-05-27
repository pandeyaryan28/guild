import * as React from 'react';
import { onAuthStateChanged, signOut } from '../lib/auth';
import { getUserById, getOnboardingState, type UserProfile, type OnboardingState } from '../lib/firestore';
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

  // 1. Initial Authentication and Onboarding State Loader (100% identical to original)
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

  // 2. Real-Time Profile Sync Listener (layers on dynamically after initial load)
  React.useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile);
        }
      },
      (error) => {
        console.error('Error in real-time user profile sync listener:', error);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  return (
    <AuthContext.Provider value={{ user, userProfile, onboarding, loading, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
