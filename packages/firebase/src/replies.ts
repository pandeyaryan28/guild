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

  // Special logic for 📋 (task reaction) in direct message threads (DMs)
  if (emoji === '📋' && isAdded && data.dmId) {
    // 1. Expiration check (1 hour window)
    const createdAt = data.createdAt;
    if (createdAt) {
      const createdTime = (createdAt as Timestamp).toDate().getTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (now - createdTime > oneHour) {
        throw new Error('This message is too old to be converted into a task (1-hour limit).');
      }
    }

    // 2. Duplicate prevention (per user reaction)
    const taskReactions = data.taskReactions || {};
    if (!taskReactions[userId]) {
      // 3. Find the assignee (the OTHER person in the DM thread)
      const dmId = data.dmId as string;
      const parts = dmId.split('_');
      const otherId = parts.find((p) => p !== userId);

      if (!otherId) {
        throw new Error('Cannot assign task: DM participant could not be resolved.');
      }

      // 4. Fetch the reactor's info
      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.exists() ? userSnap.data() : null;
      const reactorName = userData?.fullName || userData?.name || 'Someone';

      // 5. Build task details
      const title = data.body
        ? data.body.substring(0, 80) + (data.body.length > 80 ? '...' : '')
        : 'Task from DM message';
      const description = `Assigned via DM reaction by ${reactorName}.\n\nOriginal Message:\n> ${data.body || '[File / Attachment]'}`;

      // 6. Create the task
      const taskId = await createTask({
        orgId: data.orgId,
        title,
        description,
        status: 'todo',
        priority: 'none',
        assigneeIds: [otherId],
        actor: {
          uid: userId,
          name: reactorName,
        },
      });

      // 7. Track task link on the message
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
