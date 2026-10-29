import {
  collection, doc, setDoc, getDoc, updateDoc, query, where, onSnapshot, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import type { Canvas } from '@guild/types';

/**
 * Gets the canvas for a specific chat (channel or DM).
 * Uses a deterministic ID (`${orgId}_${chatId}`) to prevent duplicate creation races,
 * with fallback query support for legacy documents.
 */
export async function getOrCreateCanvas(
  orgId: string,
  chatId: string,
  userId: string,
  userName: string
): Promise<string> {
  const deterministicId = `${orgId}_${chatId}`;
  const deterministicRef = doc(db, 'canvases', deterministicId);
  const deterministicSnap = await getDoc(deterministicRef);
  if (deterministicSnap.exists()) {
    return deterministicId;
  }

  const q = query(
    collection(db, 'canvases'),
    where('orgId', '==', orgId),
    where('chatId', '==', chatId)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].id;
  }
  
  // Create a new canvas with deterministic ID to prevent concurrent duplicates
  await setDoc(deterministicRef, {
    id: deterministicId,
    orgId,
    chatId,
    title: 'Untitled Canvas',
    content: '',
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    updatedByName: userName
  });
  return deterministicId;
}

/**
 * Updates the title and content of an existing canvas.
 */
export async function updateCanvasContent(
  canvasId: string,
  content: string,
  title: string,
  userId: string,
  userName: string
): Promise<void> {
  await updateDoc(doc(db, 'canvases', canvasId), {
    content,
    title,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    updatedByName: userName
  });
}

/**
 * Subscribes to changes on a single canvas document.
 */
export function listenToCanvas(
  canvasId: string,
  cb: (canvas: Canvas | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'canvases', canvasId),
    (snap) => {
      if (snap.exists()) {
        cb(snap.data() as Canvas);
      } else {
        cb(null);
      }
    }
  );
}
