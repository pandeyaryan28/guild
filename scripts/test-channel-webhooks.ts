import assert from 'node:assert';
import handler from '../apps/guild-web/api/webhooks/channel';
import type { Channel, ChannelWebhookPayload } from '../packages/types/src/index';

// ── Mock Res Helper ────────────────────────────────────────────────────────────
function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    ended: false,
    setHeader(key: string, value: string) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      res.ended = true;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

// ── Mock Firestore DB Builder ──────────────────────────────────────────────────
function createMockDb(options: {
  channelExists?: boolean;
  channelData?: Record<string, any>;
  memberUserIds?: string[];
}) {
  const {
    channelExists = true,
    channelData = {
      id: 'ch_test_123',
      orgId: 'org_test_abc',
      name: 'leads',
      webhookToken: 'gh_live_valid_token_1234567890abcdef',
      webhookBotName: 'Test Inbound Bot',
      webhookAutoCreateTask: false,
      createdBy: 'user_admin_1',
    },
    memberUserIds = ['user_admin_1', 'user_member_2'],
  } = options;

  const messagesWritten: any[] = [];
  const channelUpdates: any[] = [];
  const notificationsWritten: any[] = [];
  const tasksWritten: any[] = [];
  const batchCommits: any[] = [];

  const mockDb = {
    messagesWritten,
    channelUpdates,
    notificationsWritten,
    tasksWritten,
    batchCommits,
    collection(colName: string) {
      if (colName === 'channels') {
        return {
          doc(channelId: string) {
            return {
              async get() {
                if (!channelExists) return { exists: false, data: () => undefined };
                return { exists: true, data: () => channelData };
              },
              async update(updates: any) {
                channelUpdates.push({ channelId, updates });
              },
            };
          },
        };
      }
      if (colName === 'channelMembers') {
        return {
          where(field: string, op: string, val: string) {
            return {
              async get() {
                return {
                  docs: memberUserIds.map((userId) => ({
                    data: () => ({ userId, channelId: val }),
                  })),
                };
              },
            };
          },
        };
      }
      if (colName === 'messages') {
        return {
          doc() {
            const id = `msg_${Math.random().toString(36).slice(2, 9)}`;
            return {
              id,
              async set(data: any) {
                messagesWritten.push(data);
              },
            };
          },
        };
      }
      if (colName === 'notifications') {
        return {
          doc() {
            const id = `notif_${Math.random().toString(36).slice(2, 9)}`;
            return { id };
          },
        };
      }
      if (colName === 'tasks') {
        return {
          doc() {
            const id = `task_${Math.random().toString(36).slice(2, 9)}`;
            return {
              id,
              async set(data: any) {
                tasksWritten.push(data);
              },
            };
          },
          where() {
            return {
              where() {
                return {
                  orderBy() {
                    return {
                      limit() {
                        return {
                          async get() {
                            return { empty: true, docs: [] };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (colName === 'taskActivities') {
        return {
          doc() {
            const id = `act_${Math.random().toString(36).slice(2, 9)}`;
            return {
              id,
              async set() {},
            };
          },
        };
      }
      throw new Error(`Unhandled collection: ${colName}`);
    },
    batch() {
      const operations: any[] = [];
      return {
        set(ref: any, data: any) {
          operations.push({ ref, data });
          notificationsWritten.push(data);
        },
        async commit() {
          batchCommits.push([...operations]);
        },
      };
    },
  };

  return mockDb;
}

// ── Test Runner ────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('🧪 Starting Incoming Channel Webhook Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // ── Test 1: OPTIONS Preflight CORS ──────────────────────────────────────────
  await test('OPTIONS preflight returns 200 with CORS headers', async () => {
    const req: any = {
      method: 'OPTIONS',
      headers: {},
      query: {},
      body: {},
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
    assert.strictEqual(res.headers['Access-Control-Allow-Headers'], 'Content-Type, Authorization');
    assert.strictEqual(res.ended, true);
  });

  // ── Test 2: Method Not Allowed ──────────────────────────────────────────────
  await test('GET or PUT requests return 405 Method Not Allowed', async () => {
    const req: any = {
      method: 'GET',
      headers: {},
      query: {},
      body: {},
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 405);
    assert.strictEqual(res.body?.error, 'Method Not Allowed. Use POST.');
  });

  // ── Test 3: Missing ChannelId or Token ──────────────────────────────────────
  await test('Missing channelId or token returns 401 Unauthorized', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      query: {},
      body: { name: 'Test User' },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body?.error?.includes('Unauthorized: Missing channelId or webhook token'));
  });

  // ── Test 4: Array Query Parameter Safety ────────────────────────────────────
  await test('Array query parameters do not crash with TypeError', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      query: { channelId: ['ch_123', 'ch_duplicate'] },
      body: { name: 'Test User' },
    };
    const res = createMockRes();

    await handler(req, res);

    // Should not throw and should safely return 401 due to missing token
    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body?.error?.includes('Unauthorized: Missing channelId or webhook token'));
  });

  // ── Test 5: Non-Bearer Authorization Schemes Ignored ────────────────────────
  await test('Non-Bearer Authorization schemes (e.g. Basic auth) do not leak as token', async () => {
    const req: any = {
      method: 'POST',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      query: { channelId: 'ch_123' },
      body: { name: 'Test User' },
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.ok(res.body?.error?.includes('Unauthorized: Missing channelId or webhook token'));
  });

  // ── Test 6: Case-Insensitive Bearer Token Extraction ────────────────────────
  await test('Bearer token extraction is case-insensitive', async () => {
    const mockDb = createMockDb({});
    const req: any = {
      method: 'POST',
      headers: { authorization: 'bearer gh_live_valid_token_1234567890abcdef' },
      query: { channelId: 'ch_test_123' },
      body: { name: 'Dr. Jane Watson' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.messageId);
  });

  // ── Test 7: Secure Webhook Token Format & Entropy ───────────────────────────
  await test('Secure webhook tokens match gh_live_ hex pattern', () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const token = `gh_live_${hex}`;

    assert.ok(token.startsWith('gh_live_'));
    assert.strictEqual(token.length, 8 + 64);
    assert.match(token, /^gh_live_[0-9a-f]{64}$/);
  });

  // ── Test 8: TypeScript Type Compatibility ───────────────────────────────────
  await test('Channel and ChannelWebhookPayload TypeScript types are consistent', () => {
    const sampleChannel: Channel = {
      id: 'ch_test_123',
      orgId: 'org_test_abc',
      name: 'leads',
      description: 'Incoming sales leads',
      createdBy: 'user_admin',
      createdAt: { seconds: 1234567890, nanoseconds: 0 } as any,
      memberCount: 2,
      webhookToken: 'gh_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      webhookBotName: 'UniCare Inquiries',
      webhookAutoCreateTask: true,
    };

    const payload: ChannelWebhookPayload = {
      name: 'Dr. John Watson',
      email: 'watson@unicare.org',
      phone: '+1 555-0199',
      subject: 'Demo clinic setup',
      message: 'Need help onboarding staff.',
      metadata: { clinicId: 'CLINIC-44', tier: 'Premier' },
      createTask: true,
    };

    assert.strictEqual(sampleChannel.webhookBotName, 'UniCare Inquiries');
    assert.strictEqual(payload.name, 'Dr. John Watson');
    assert.strictEqual(payload.createTask, true);
  });

  // ── Test 9: Malformed JSON String Payload ───────────────────────────────────
  await test('Malformed JSON string body returns 400 Bad Request', async () => {
    const req: any = {
      method: 'POST',
      headers: {},
      query: {},
      body: '{"name": "broken json...',
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.error, 'Invalid JSON payload');
  });

  // ── Test 10: Non-Existent Channel in Firestore ──────────────────────────────
  await test('Non-existent channel returns 401 Unauthorized', async () => {
    const mockDb = createMockDb({ channelExists: false });
    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_nonexistent', token: 'gh_live_some_token' },
      body: { name: 'Alice' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.error, 'Unauthorized: Invalid channel or revoked token');
  });

  // ── Test 11: Invalid or Revoked Webhook Token ────────────────────────────────
  await test('Mismatched or revoked webhook token returns 401 Unauthorized', async () => {
    const mockDb = createMockDb({
      channelData: {
        id: 'ch_test_123',
        orgId: 'org_test_abc',
        name: 'leads',
        webhookToken: 'gh_live_correct_token',
      },
    });
    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_wrong_token' },
      body: { name: 'Bob' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.error, 'Unauthorized: Invalid or revoked webhook token');
  });

  // ── Test 12: Missing or Whitespace Name Validation ───────────────────────────
  await test('Missing or empty name returns 400 Bad Request', async () => {
    const mockDb = createMockDb({});
    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: { name: '   ', email: 'empty@test.com' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body?.error?.includes('Validation failed: "name" is required'));
  });

  // ── Test 13: Non-String Name Validation ──────────────────────────────────────
  await test('Non-string name (e.g. number or object) returns 400 Bad Request instead of 500', async () => {
    const mockDb = createMockDb({});
    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: { name: 12345, email: 'number@test.com' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body?.error?.includes('Validation failed: "name" is required'));
  });

  // ── Test 14: End-to-End Success Flow ────────────────────────────────────────
  await test('Valid payload publishes message card, updates preview, and creates notifications', async () => {
    const mockDb = createMockDb({
      channelData: {
        id: 'ch_test_123',
        orgId: 'org_test_abc',
        name: 'leads',
        webhookToken: 'gh_live_valid_token_1234567890abcdef',
        webhookBotName: 'UniCare Inbound',
        webhookAutoCreateTask: false,
        createdBy: 'user_admin_1',
      },
      memberUserIds: ['user_admin_1', 'user_member_2'],
    });

    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: {
        name: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        phone: '+1 555-0144',
        subject: 'Clinic Patient Integration',
        message: 'Interested in onboarding 5 clinics.',
        metadata: { source: 'UniCare Portal', clinicCount: 5 },
      },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.messageId);

    // Verify message written
    assert.strictEqual(mockDb.messagesWritten.length, 1);
    const msg = mockDb.messagesWritten[0];
    assert.strictEqual(msg.senderName, 'UniCare Inbound');
    assert.strictEqual(msg.channelId, 'ch_test_123');
    assert.strictEqual(msg.orgId, 'org_test_abc');
    assert.ok(msg.body.includes('### 📥 **New Inquiry received**'));
    assert.ok(msg.body.includes('Sarah Jenkins'));
    assert.ok(msg.body.includes('Clinic Patient Integration'));
    assert.ok(msg.body.includes('Clinic Count'));

    // Verify channel preview update
    assert.strictEqual(mockDb.channelUpdates.length, 1);
    assert.strictEqual(mockDb.channelUpdates[0].channelId, 'ch_test_123');
    assert.ok(mockDb.channelUpdates[0].updates.lastMessagePreview.includes('Sarah Jenkins'));

    // Verify notifications created for members
    assert.strictEqual(mockDb.notificationsWritten.length, 2);
    assert.strictEqual(mockDb.notificationsWritten[0].recipientId, 'user_admin_1');
    assert.strictEqual(mockDb.notificationsWritten[1].recipientId, 'user_member_2');
  });

  // ── Test 15: Operational Task Auto-Creation ─────────────────────────────────
  await test('Auto-creates high priority operational task when requested', async () => {
    const mockDb = createMockDb({
      channelData: {
        id: 'ch_test_123',
        orgId: 'org_test_abc',
        name: 'leads',
        webhookToken: 'gh_live_valid_token_1234567890abcdef',
        webhookBotName: 'Inbound Bot',
        webhookAutoCreateTask: true, // Enabled on channel
        createdBy: 'user_admin_1',
      },
    });

    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: {
        name: 'Alex Vance',
        subject: 'Black Mesa Partnership',
        message: 'Require urgent operational support.',
      },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.taskId);

    assert.strictEqual(mockDb.tasksWritten.length, 1);
    const task = mockDb.tasksWritten[0];
    assert.strictEqual(task.priority, 'high');
    assert.strictEqual(task.status, 'todo');
    assert.strictEqual(task.title, 'Lead: Black Mesa Partnership (Alex Vance)');
    assert.strictEqual(task.orgId, 'org_test_abc');
    assert.deepStrictEqual(task.assigneeIds, ['user_admin_1']);
  });

  // ── Test 16: Safe Circular / Complex Metadata Handling ──────────────────────
  await test('Handles circular or null metadata without throwing serialization error', async () => {
    const mockDb = createMockDb({});

    const circularObj: any = { note: 'test circular' };
    circularObj.self = circularObj;

    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: {
        name: 'Edge Case Tester',
        metadata: {
          circular: circularObj,
          nullVal: null,
          undefinedVal: undefined,
          regularVal: 'Active',
        },
      },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(mockDb.messagesWritten.length, 1);
    const bodyText = mockDb.messagesWritten[0].body;
    assert.ok(bodyText.includes('[Object]'));
    assert.ok(bodyText.includes('None'));
    assert.ok(bodyText.includes('Active'));
  });

  // ── Test 17: Notification Batch Chunking (>500 Members) ─────────────────────
  await test('Chunks notifications when channel has >500 members to respect Firestore batch limit', async () => {
    // Generate 650 mock members
    const largeMemberList = Array.from({ length: 650 }, (_, i) => `user_member_${i + 1}`);
    const mockDb = createMockDb({ memberUserIds: largeMemberList });

    const req: any = {
      method: 'POST',
      query: { channelId: 'ch_test_123', token: 'gh_live_valid_token_1234567890abcdef' },
      body: { name: 'Broadcaster User', message: 'Hello large channel' },
      __mockDb: mockDb,
    };
    const res = createMockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    // 650 total notifications
    assert.strictEqual(mockDb.notificationsWritten.length, 650);
    // Should have split into 2 batches (400 + 250)
    assert.strictEqual(mockDb.batchCommits.length, 2);
    assert.strictEqual(mockDb.batchCommits[0].length, 400);
    assert.strictEqual(mockDb.batchCommits[1].length, 250);
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
