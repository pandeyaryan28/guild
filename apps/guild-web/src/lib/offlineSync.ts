import { sendChannelMessage, sendDMMessage } from './chat';
import { type MessageAttachment } from '@guild/types';

export interface OfflineMessage {
  id: string;
  channelId?: string;
  dmId?: string;
  orgId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
  mentions: string[];
  files?: MessageAttachment[];
  parentMessageId?: string;
  parentMessage?: {
    id: string;
    senderName: string;
    body: string;
  };
  createdAt: number;
}

const STORAGE_KEY = 'guild_offline_messages';

/**
 * Save a newly composed message to the offline queue storage.
 */
export function enqueueOfflineMessage(params: Omit<OfflineMessage, 'id' | 'createdAt'>): OfflineMessage {
  const queue = getOfflineMessages();
  const newMessage: OfflineMessage = {
    ...params,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
  };
  
  queue.push(newMessage);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  return newMessage;
}

/**
 * Retrieve all currently queued offline messages.
 */
export function getOfflineMessages(): OfflineMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse offline messages from localStorage', e);
    return [];
  }
}

/**
 * Remove a specific message from the queue by ID.
 */
export function dequeueOfflineMessage(id: string): void {
  const queue = getOfflineMessages();
  const updated = queue.filter(msg => msg.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Clear the offline queue.
 */
export function clearOfflineMessages(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Sync all queued offline messages to Firebase.
 */
export async function syncOfflineMessages(
  onMessageSynced?: (msg: OfflineMessage) => void
): Promise<number> {
  const queue = getOfflineMessages();
  if (queue.length === 0) return 0;
  
  let syncedCount = 0;
  
  for (const msg of queue) {
    try {
      const baseParams = {
        orgId: msg.orgId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderUsername: msg.senderUsername,
        body: msg.body,
        mentions: msg.mentions,
        files: msg.files,
        parentMessageId: msg.parentMessageId,
        parentMessage: msg.parentMessage,
      };

      if (msg.channelId) {
        await sendChannelMessage({
          ...baseParams,
          channelId: msg.channelId,
        });
      } else if (msg.dmId) {
        await sendDMMessage({
          ...baseParams,
          dmId: msg.dmId,
        });
      }
      
      // Successfully sent! Remove it from queue
      dequeueOfflineMessage(msg.id);
      syncedCount++;
      if (onMessageSynced) {
        onMessageSynced(msg);
      }
    } catch (e) {
      console.error(`Failed to sync offline message ${msg.id}`, e);
      // Stop syncing rest of queue if it's a network issue, wait for next online trigger
      break;
    }
  }
  
  return syncedCount;
}
