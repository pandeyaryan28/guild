/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// NOTE: consumers must supply these env vars at build time.
// In Vite apps: VITE_FIREBASE_*
// In Next.js apps: NEXT_PUBLIC_FIREBASE_*
// We detect which prefix is available at runtime.
const getEnv = (viteVal: string | undefined, nodeKey: string): string => {
  if (viteVal) return viteVal;
  const proc = (globalThis as any).process;
  return proc?.env?.[nodeKey] ?? proc?.env?.[`NEXT_PUBLIC_${nodeKey}`] ?? proc?.env?.[`VITE_${nodeKey}`] ?? '';
};

const firebaseConfig = {
  apiKey:            getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_API_KEY : undefined, 'FIREBASE_API_KEY') || 'mock-api-key',
  authDomain:        getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN : undefined, 'FIREBASE_AUTH_DOMAIN') || 'mock-app.firebaseapp.com',
  projectId:         getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_PROJECT_ID : undefined, 'FIREBASE_PROJECT_ID') || 'mock-project',
  storageBucket:     getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET : undefined, 'FIREBASE_STORAGE_BUCKET') || 'mock-app.appspot.com',
  messagingSenderId: getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined, 'FIREBASE_MESSAGING_SENDER_ID') || '123456789',
  appId:             getEnv(typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_APP_ID : undefined, 'FIREBASE_APP_ID') || '1:123456789:web:mockapp',
};

// Prevent re-initialization in hot-reload environments
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
