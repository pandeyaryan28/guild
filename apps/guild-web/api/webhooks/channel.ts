/**
 * POST /api/webhooks/channel
 *
 * Inbound Channel Webhook & API Integration Endpoint.
 * Allows external forms, landing pages, and third-party systems (e.g., UniCare,
 * Nullwave, contact forms) to send inquiries and leads directly into a Guild Orbit channel.
 *
 * Query Params: ?channelId=<channelId>&token=<token>
 * Headers: Authorization: Bearer <token> (optional alternative to query param)
 *
 * Payload:
 * {
 *   "name": "string (required)",
 *   "email": "string (optional)",
 *   "phone": "string (optional)",
 *   "subject": "string (optional)",
 *   "message": "string (optional)",
 *   "metadata": { ... } (optional),
 *   "createTask": boolean (optional)
 * }
 */

import { timingSafeEqual } from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function safeCompareTokens(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function getAdminDb() {
  if (!getApps().length) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountRaw) {
      try {
        const serviceAccount = typeof serviceAccountRaw === 'string'
          ? JSON.parse(serviceAccountRaw)
          : serviceAccountRaw;
        initializeApp({ credential: cert(serviceAccount) });
      } catch (err) {
        console.error('[webhooks/channel] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', err);
        initializeApp();
      }
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'guild-app';
      try {
        initializeApp({ projectId });
      } catch {
        initializeApp();
      }
    }
  }
  return getFirestore();
}

export default async function handler(req: any, res: any) {
  // ── 1. Enable CORS for external website forms ────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    // ── 2. Parse parameters & credentials ──────────────────────────────────────
    let body = req.body || {};
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    const parseStringParam = (param: unknown): string => {
      if (typeof param === 'string') return param.trim();
      if (Array.isArray(param) && typeof param[0] === 'string') return param[0].trim();
      return '';
    };

    const channelId = parseStringParam(req.query?.channelId) || (typeof body?.channelId === 'string' ? body.channelId.trim() : '');

    const rawAuth = req.headers?.authorization;
    const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : (typeof rawAuth === 'string' ? rawAuth : '');
    let bearerToken = '';
    if (authHeader.trim()) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        bearerToken = match[1].trim();
      }
    }
    const token = parseStringParam(req.query?.token) || bearerToken || (typeof body?.token === 'string' ? body.token.trim() : '');

    if (!channelId || !token) {
      return res.status(401).json({
        error: 'Unauthorized: Missing channelId or webhook token. Pass ?channelId=...&token=... or Authorization: Bearer <token>',
      });
    }

    // ── 3. Validate Channel and Security Token in Firestore ────────────────────
    const db = (req as any).__mockDb || getAdminDb();
    const channelRef = db.collection('channels').doc(channelId);
    const channelDoc = await channelRef.get();

    if (!channelDoc.exists) {
      return res.status(401).json({ error: 'Unauthorized: Invalid channel or revoked token' });
    }

    const channelData = channelDoc.data() || {};
    if (!channelData.webhookToken || !safeCompareTokens(String(channelData.webhookToken), token)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or revoked webhook token' });
    }

    // ── 4. Validate Payload ────────────────────────────────────────────────────
    if (!body || typeof body.name !== 'string' || !body.name.trim()) {
      return res.status(400).json({
        error: 'Validation failed: "name" is required and cannot be empty.',
      });
    }
    const name = body.name.trim();

    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const subject = typeof body.subject === 'string' ? body.subject.trim() : undefined;
    const message = typeof body.message === 'string' ? body.message.trim() : undefined;
    const metadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : undefined;
    const shouldCreateTask = channelData.webhookAutoCreateTask === true || body.createTask === true;
    const targetOrgId = (channelData.orgId as string) || '';

    // ── 5. Build Clean Structured Markdown Message Body ────────────────────────
    const lines: string[] = [
      '### 📥 **New Inquiry received**',
      '',
      `• **Name:** ${name}`,
    ];

    if (email) {
      lines.push(`• **Email:** [${email}](mailto:${email})`);
    }
    if (phone) {
      lines.push(`• **Phone:** ${phone}`);
    }
    if (subject) {
      lines.push(`• **Subject:** ${subject}`);
    }
    if (message) {
      lines.push('', '**Message:**', message);
    }

    if (metadata && Object.keys(metadata).length > 0) {
      lines.push('', '**Additional Details:**');
      for (const [key, value] of Object.entries(metadata)) {
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/[_-]/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase())
          .trim();
        let valStr = '';
        if (value === null || value === undefined) {
          valStr = 'None';
        } else if (typeof value === 'object') {
          try {
            valStr = JSON.stringify(value);
          } catch {
            valStr = '[Object]';
          }
        } else {
          valStr = String(value);
        }
        lines.push(`• **${formattedKey}:** ${valStr}`);
      }
    }

    const markdownBody = lines.join('\n');

    // ── 6. Determine Members & Mentions ────────────────────────────────────────
    const membersSnap = await db.collection('channelMembers')
      .where('channelId', '==', channelId)
      .get();

    const memberIds = membersSnap.docs
      .map((d) => d.data().userId as string)
      .filter(Boolean);

    const mentions = memberIds.length > 0
      ? memberIds
      : (channelData.createdBy ? [channelData.createdBy] : []);

    const preview = `📥 ${name}${subject ? `: ${subject}` : message ? `: ${message}` : ''}`.slice(0, 100);
    const botSenderName = channelData.webhookBotName?.trim() || 'Inbound Bot';

    // ── 7. Insert Message into `messages` collection ───────────────────────────
    const messageRef = db.collection('messages').doc();
    const messageId = messageRef.id;

    await messageRef.set({
      id: messageId,
      channelId,
      orgId: targetOrgId,
      senderId: 'system_webhook_bot',
      senderName: botSenderName,
      senderUsername: 'bot.webhook',
      body: markdownBody,
      mentions,
      createdAt: FieldValue.serverTimestamp(),
      deleted: false,
      files: [],
    });

    // ── 8. Update Target Channel preview ───────────────────────────────────────
    await channelRef.update({
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessagePreview: preview,
    });

    // ── 9. Create In-App Notifications for Channel Members ────────────────────
    const uniqueRecipients = Array.from(new Set(mentions));
    if (uniqueRecipients.length > 0) {
      const CHUNK_SIZE = 400; // Keep safely below Firestore 500-write batch limit
      for (let i = 0; i < uniqueRecipients.length; i += CHUNK_SIZE) {
        const chunk = uniqueRecipients.slice(i, i + CHUNK_SIZE);
        const notifBatch = db.batch();
        for (const recipientId of chunk) {
          const notifRef = db.collection('notifications').doc();
          notifBatch.set(notifRef, {
            id: notifRef.id,
            orgId: targetOrgId,
            recipientId,
            category: 'inbox',
            type: 'inbound_webhook',
            urgency: 'high',
            actor: {
              id: 'system_webhook_bot',
              name: botSenderName,
              avatarUrl: '',
              initials: 'IB',
            },
            title: `New Inquiry from ${name}`,
            body: preview,
            link: `/chat/c/${channelId}`,
            read: false,
            archived: false,
            createdAt: FieldValue.serverTimestamp(),
          });
        }
        await notifBatch.commit();
      }
    }

    // ── 10. Automatically Create Operational Task if Enabled ──────────────────
    let createdTaskId: string | null = null;
    if (shouldCreateTask) {
      const taskRef = db.collection('tasks').doc();
      createdTaskId = taskRef.id;

      const assigneeId = channelData.createdBy || (uniqueRecipients.length > 0 ? uniqueRecipients[0] : 'system');

      let orderIndex = 1000;
      if (targetOrgId) {
        try {
          const highestTaskSnap = await db.collection('tasks')
            .where('orgId', '==', targetOrgId)
            .where('status', '==', 'todo')
            .orderBy('orderIndex', 'desc')
            .limit(1)
            .get();

          if (!highestTaskSnap.empty) {
            orderIndex = ((highestTaskSnap.docs[0].data().orderIndex as number) || 1000) + 1000;
          }
        } catch (err) {
          console.warn('[webhooks/channel] Could not compute orderIndex, defaulting to 1000:', err);
        }
      }

      const taskTitle = subject
        ? `Lead: ${subject} (${name})`
        : `Inquiry from ${name}`;

      await taskRef.set({
        id: taskRef.id,
        orgId: targetOrgId,
        title: taskTitle,
        description: markdownBody,
        status: 'todo',
        priority: 'high',
        assigneeIds: [assigneeId],
        creatorId: assigneeId,
        labelIds: [],
        dueDate: null,
        orderIndex,
        approved: true,
        projectId: null,
        goalId: null,
        parentTaskId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const actRef = db.collection('taskActivities').doc();
      await actRef.set({
        id: actRef.id,
        taskId: taskRef.id,
        orgId: targetOrgId,
        userId: assigneeId,
        type: 'created',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({
      success: true,
      messageId,
      ...(createdTaskId ? { taskId: createdTaskId } : {}),
    });
  } catch (err: any) {
    console.error('[webhooks/channel] Internal error processing webhook:', err);
    return res.status(500).json({
      error: 'Internal server error processing incoming webhook',
      details: err?.message,
    });
  }
}
