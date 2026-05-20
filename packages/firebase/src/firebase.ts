import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// NOTE: consumers must supply these env vars at build time.
// In Vite apps: VITE_FIREBASE_*
// In Next.js apps: NEXT_PUBLIC_FIREBASE_*
// We detect which prefix is available at runtime.
function env(key: string): string {
  // Vite
  const meta = import.meta as unknown as any;
  if (typeof import.meta !== 'undefined' && meta.env) {
    const viteEnv = meta.env;
    return viteEnv[`VITE_${key}`] ?? viteEnv[`NEXT_PUBLIC_${key}`] ?? '';
  }
  // Node / Next.js SSR
  const proc = (globalThis as any).process;
  return proc?.env?.[`NEXT_PUBLIC_${key}`] ?? proc?.env?.[`VITE_${key}`] ?? '';
}

const firebaseConfig = {
  apiKey:            env('FIREBASE_API_KEY'),
  authDomain:        env('FIREBASE_AUTH_DOMAIN'),
  projectId:         env('FIREBASE_PROJECT_ID'),
  storageBucket:     env('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID'),
  appId:             env('FIREBASE_APP_ID'),
};

// Prevent re-initialization in hot-reload environments
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);
export default app;
