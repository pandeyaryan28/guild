import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import type { MessageAttachment } from '@guild/types';

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

/**
 * Upload a message attachment to Firebase Storage.
 * Returns a structured MessageAttachment object.
 */
export async function uploadMessageAttachment(
  chatId: string,
  file: File
): Promise<MessageAttachment> {
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `messageAttachments/${chatId}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return {
    name: file.name,
    url,
    type: file.type,
    size: file.size,
  };
}

/**
 * Upload an organization photo to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadOrganizationPhoto(orgId: string, file: File): Promise<string> {
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `organizationPhotos/${orgId}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Upload a task/goal/project/comment attachment to Firebase Storage.
 * Returns a structured MessageAttachment object.
 */
export async function uploadEntityAttachment(
  entityType: 'tasks' | 'goals' | 'projects' | 'comments',
  entityId: string,
  file: File
): Promise<MessageAttachment> {
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `attachments/${entityType}/${entityId}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return {
    name: file.name,
    url,
    type: file.type,
    size: file.size,
  };
}
