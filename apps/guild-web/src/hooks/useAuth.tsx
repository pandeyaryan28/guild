import * as React from 'react';
import { onAuthStateChanged, signOut } from '../lib/auth';
import { getOnboardingState, setOnboardingState, type UserProfile, type OnboardingState } from '../lib/firestore';
import { type User } from 'firebase/auth';
import { onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  isBanned: boolean;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  onboarding: null,
  loading: true,
  isBanned: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [onboarding, setOnboarding] = React.useState<OnboardingState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isBanned, setIsBanned] = React.useState(false);

  React.useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeOnboarding: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(async (firebaseUser) => {
      // Clean up previous listeners if they exist
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeOnboarding) {
        unsubscribeOnboarding();
        unsubscribeOnboarding = null;
      }

      setUser(firebaseUser);
      setIsBanned(false);

      if (firebaseUser) {
        setLoading(true);
        try {
          // Check if this user has been banned (removed by an org admin).
          const bannedSnap = await getDoc(doc(db, 'bannedUsers', firebaseUser.uid));
          if (bannedSnap.exists()) {
            setIsBanned(true);
            setUserProfile(null);
            setOnboarding(null);
            setLoading(false);
            return;
          }

          // Subscribe to real-time changes to the user's onboarding state
          const onboardingRef = doc(db, 'onboardingState', firebaseUser.uid);
          unsubscribeOnboarding = onSnapshot(
            onboardingRef,
            (snap) => {
              if (snap.exists()) {
                setOnboarding(snap.data() as OnboardingState);
              } else {
                setOnboarding(null);
              }
            },
            (error) => {
              console.error('Error listening to onboarding state in AuthProvider:', error);
            }
          );

          // Subscribe to real-time changes to the user's profile document
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeProfile = onSnapshot(
            userRef,
            (snap) => {
              if (snap.exists()) {
                const profile = snap.data() as UserProfile;
                setUserProfile(profile);

                // Self-healing: If user is already assigned to a workspace, ensure onboarding is marked completed
                if (profile.organizationId) {
                  setOnboarding((prev) => (prev ? { ...prev, completed: true } : {
                    uid: firebaseUser.uid,
                    completed: true,
                    step: 4,
                    path: 'join',
                    updatedAt: Timestamp.now(),
                  }));
                  setOnboardingState(firebaseUser.uid, { completed: true }).catch(() => {});
                }
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
        setIsBanned(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (unsubscribeOnboarding) {
        unsubscribeOnboarding();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, onboarding, loading, isBanned, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
