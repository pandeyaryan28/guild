import {
  collection, doc, setDoc, getDoc, updateDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  increment, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createTask } from './tasks';

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
  let isAdded = false;
  if (userList.includes(userId)) {
    newList = userList.filter((uid) => uid !== userId);
  } else {
    newList = [...userList, userId];
    isAdded = true;
  }

  const updatedReactions = { ...currentReactions };
  if (newList.length === 0) {
    delete updatedReactions[emoji];
  } else {
    updatedReactions[emoji] = newList;
  }

  const updateFields: Record<string, any> = {
    reactions: updatedReactions,
  };

  // Special logic for 📋 (Convert message to task) in channels and DMs
  if (emoji === '📋' && isAdded) {
    const taskReactions = data.taskReactions || {};
    if (!taskReactions[userId]) {
      let assigneeId = (data.senderId as string) || userId;
      if (data.dmId) {
        const dmId = data.dmId as string;
        const dmSnap = await getDoc(doc(db, 'directMessages', dmId));
        const participants: string[] = dmSnap.data()?.participants ?? [];
        assigneeId = participants.find((p) => p !== userId) || userId;
      }

      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.exists() ? userSnap.data() : null;
      const reactorName = userData?.fullName || userData?.name || 'Someone';

      const cleanBody = (data.body || '').replace(/\s+/g, ' ').trim();
      const title = cleanBody
        ? cleanBody.substring(0, 80) + (cleanBody.length > 80 ? '...' : '')
        : 'Task from chat discussion';
      const description = `Converted from chat message by ${reactorName}.\n\nOriginal Message:\n> ${data.body || '[File / Attachment]'}`;

      const taskId = await createTask({
        orgId: data.orgId,
        title,
        description,
        status: 'todo',
        priority: 'none',
        assigneeIds: [assigneeId],
        actor: {
          uid: userId,
          name: reactorName,
        },
      });

      updateFields.taskReactions = {
        ...taskReactions,
        [userId]: taskId,
      };
    }
  }

  await updateDoc(ref, updateFields);
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
  orgId?: string,
): () => void {
  const constraints = [
    ...(orgId ? [where('orgId', '==', orgId)] : []),
    where('messageId', '==', messageId),
    orderBy('createdAt', 'asc'),
  ];
  return onSnapshot(
    query(collection(db, 'messageReplies'), ...constraints),
    (snap) => {
      cb(snap.docs.map((d) => d.data() as MessageReply));
    },
  );
}
