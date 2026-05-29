import {
  collection, doc, setDoc, getDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  increment, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MessageReply {
  id: string;
  messageId: string;
  orgId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
  createdAt: Timestamp;
}

// ─── Reactions ───────────────────────────────────────────────────────────────

export async function toggleReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, 'messages', messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const currentReactions: Record<string, string[]> = data.reactions || {};
  const userList = currentReactions[emoji] || [];

  let newList: string[];
  if (userList.includes(userId)) {
    newList = userList.filter((uid) => uid !== userId);
  } else {
    newList = [...userList, userId];
  }

  const updatedReactions = { ...currentReactions };
  if (newList.length === 0) {
    delete updatedReactions[emoji];
  } else {
    updatedReactions[emoji] = newList;
  }

  await updateDoc(ref, {
    reactions: updatedReactions,
  });
}

// ─── Threads / Replies ────────────────────────────────────────────────────────

export async function addMessageReply(params: {
  messageId: string;
  orgId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
}): Promise<string> {
  const batch = writeBatch(db);

  // 1. Create reply document
  const replyRef = doc(collection(db, 'messageReplies'));
  const replyId = replyRef.id;

  batch.set(replyRef, {
    id: replyId,
    messageId: params.messageId,
    orgId: params.orgId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderUsername: params.senderUsername,
    body: params.body,
    createdAt: serverTimestamp(),
  });

  // 2. Increment replyCount and update lastReplyAt on the parent message
  const messageRef = doc(db, 'messages', params.messageId);
  batch.update(messageRef, {
    replyCount: increment(1),
    lastReplyAt: serverTimestamp(),
  });

  await batch.commit();
  return replyId;
}

export function listenToReplies(
  messageId: string,
  cb: (replies: MessageReply[]) => void,
): () => void {
  return onSnapshot(
    query(
      collection(db, 'messageReplies'),
      where('messageId', '==', messageId),
      orderBy('createdAt', 'asc'),
    ),
    (snap) => {
      cb(snap.docs.map((d) => d.data() as MessageReply));
    },
  );
}
