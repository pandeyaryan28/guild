import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a profile image to Firebase Storage.
 * Returns the public download URL.
 * NOTE: Profile image upload is deferred — this file is scaffolded for future use.
 */
export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  const storageRef = ref(storage, `profileImages/${uid}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
