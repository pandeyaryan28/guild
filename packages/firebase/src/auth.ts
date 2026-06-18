import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification as firebaseSendEmailVerification,
  reload as firebaseReload,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
  isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  EmailAuthProvider,
  reauthenticateWithCredential as firebaseReauthenticateWithCredential,
  reauthenticateWithPopup as firebaseReauthenticateWithPopup,
  linkWithCredential,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export { GoogleAuthProvider };

export async function linkGoogleCredential(user: User, credential: any) {
  return linkWithCredential(user, credential);
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function sendVerificationEmail(user: User) {
  return firebaseSendEmailVerification(user);
}

export async function reloadUser(user: User) {
  return firebaseReload(user);
}

export async function sendPasswordReset(email: string) {
  return firebaseSendPasswordResetEmail(auth, email);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function onAuthStateChanged(callback: (user: User | null) => void) {
  return firebaseOnAuthStateChanged(auth, callback);
}

export async function sendDeletionVerificationEmail(email: string, orgId: string, origin: string) {
  const actionCodeSettings = {
    url: `${origin}/settings?confirmDelete=true&orgId=${orgId}`,
    handleCodeInApp: true,
  };
  return firebaseSendSignInLinkToEmail(auth, email, actionCodeSettings);
}

export function isDeletionSignInLink(url: string): boolean {
  return firebaseIsSignInWithEmailLink(auth, url);
}

export async function confirmDeletionSignInLink(email: string, url: string) {
  return firebaseSignInWithEmailLink(auth, email, url);
}

export async function reauthenticatePassword(password: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user is currently authenticated.');
  const credential = EmailAuthProvider.credential(user.email, password);
  await firebaseReauthenticateWithCredential(user, credential);
}

export async function reauthenticateGoogle(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently authenticated.');
  const provider = new GoogleAuthProvider();
  await firebaseReauthenticateWithPopup(user, provider);
}

export type { User };
