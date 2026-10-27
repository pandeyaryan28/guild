import { jsPDF } from 'jspdf';

export interface WebhookPdfData {
  channelName: string;
  channelId: string;
  webhookUrl: string;
  webhookToken: string;
  botName: string;
  autoCreateTask: boolean;
  origin: string;
}

export function generateWebhookDocsPdf(data: WebhookPdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  let y = 45;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 55) {
      doc.addPage();
      y = 45;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text('GUILD ORBIT — INBOUND CHANNEL WEBHOOK API REFERENCE', marginX, 30);
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.5);
    doc.line(marginX, 35, pageWidth - marginX, 35);
  };

  // ── Cover Banner ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(marginX, y, contentWidth, 75, 8, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(129, 140, 248); // Indigo 400
  doc.text('GUILD ORBIT DEVELOPER API', marginX + 16, y + 24);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Inbound Channel Webhook Integration', marginX + 16, y + 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Official integration specifications for #${data.channelName}`, marginX + 16, y + 62);

  y += 90;

  // ── Target Channel Context Card ───────────────────────────────────────────
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(marginX, y, contentWidth, 68, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TARGET CHANNEL', marginX + 14, y + 18);
  doc.text('CHANNEL ID', marginX + 170, y + 18);
  doc.text('DEFAULT BOT NAME', marginX + 340, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`#${data.channelName}`, marginX + 14, y + 34);
  doc.text(data.channelId, marginX + 170, y + 34);
  doc.text(data.botName || 'Inbound Bot', marginX + 340, y + 34);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TASK AUTOMATION', marginX + 14, y + 54);
  doc.text('GENERATION DATE', marginX + 170, y + 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(data.autoCreateTask ? 'Enabled (Auto-creates task)' : 'Disabled', marginX + 14, y + 66);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), marginX + 170, y + 66);

  y += 82;

  // ── Section 1: Endpoint & Authentication ──────────────────────────────────
  checkPageBreak(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Endpoint & Authentication', marginX, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const endpointDesc =
    'This webhook endpoint accepts inbound HTTP POST requests containing structured JSON inquiries. Messages appear instantly in the channel chat feed and trigger in-app notifications for all channel members.';
  const splitEndpointDesc = doc.splitTextToSize(endpointDesc, contentWidth);
  doc.text(splitEndpointDesc, marginX, y);
  y += splitEndpointDesc.length * 12 + 6;

  // URL Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, y, contentWidth, 42, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('POST', marginX + 10, y + 16);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const rawUrl = data.webhookUrl || `${data.origin}/api/webhooks/channel?channelId=${data.channelId}&token=YOUR_TOKEN`;
  const splitUrl = doc.splitTextToSize(rawUrl, contentWidth - 55);
  doc.text(splitUrl, marginX + 45, y + 16);

  y += 50;

  // Authentication options list
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Supported Authentication Methods:', marginX, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Query Parameters: Pass ?channelId=<channelId>&token=<token> directly in the request URL.', marginX + 8, y);
  y += 11;
  doc.text('• Authorization Header: Pass Authorization: Bearer <token> in HTTP headers with ?channelId in URL or body.', marginX + 8, y);
  y += 18;

  // ── Architecture Note: Serverless & Firebase Key on Vercel ───────────────
  checkPageBreak(120);
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(245, 158, 11); // Amber 500
  doc.roundedRect(marginX, y, contentWidth, 80, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text('ARCHITECTURE NOTE: VERCEL SERVERLESS & FIREBASE ADMIN KEY', marginX + 12, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 53, 15); // Amber 900
  const serverlessNote =
    'When handling incoming webhooks inside Next.js or Vercel serverless functions, requests arrive without a logged-in user browser session. To write directly to Firestore, bypass client rules, and trigger team notifications, Vercel must use the Firebase Admin SDK (firebase-admin). Because Vercel is outside Google Cloud infrastructure, it requires the FIREBASE_SERVICE_ACCOUNT_KEY environment variable (private RSA key JSON) to cryptographically establish trust with Firebase servers.';
  const splitServerlessNote = doc.splitTextToSize(serverlessNote, contentWidth - 24);
  doc.text(splitServerlessNote, marginX + 12, y + 30);

  y += 92;

  // ── Section 2: JSON Payload Schema ───────────────────────────────────────
  checkPageBreak(180);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Payload Parameters (JSON)', marginX, y);
  y += 14;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(marginX, y, contentWidth, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('FIELD', marginX + 8, y + 12);
  doc.text('TYPE', marginX + 85, y + 12);
  doc.text('REQUIREMENT', marginX + 140, y + 12);
  doc.text('DESCRIPTION', marginX + 230, y + 12);
  y += 18;

  const fields = [
    { name: 'name', type: 'string', req: 'Required', desc: 'Full sender or customer name (e.g. "Jane Doe").' },
    { name: 'email', type: 'string', req: 'Optional', desc: 'Contact email address for follow-ups.' },
    { name: 'phone', type: 'string', req: 'Optional', desc: 'Contact telephone or mobile number.' },
    { name: 'subject', type: 'string', req: 'Optional', desc: 'Inquiry topic or lead title.' },
    { name: 'message', type: 'string', req: 'Optional', desc: 'Body text or detailed inquiry message.' },
    { name: 'metadata', type: 'object', req: 'Optional', desc: 'Key-value dictionary (e.g. plan, source, ticketId).' },
    { name: 'createTask', type: 'boolean', req: 'Optional', desc: 'If true, generates a high-priority workspace task.' },
  ];

  fields.forEach((f, idx) => {
    checkPageBreak(20);
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.rect(marginX, y, contentWidth, 18, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202); // Indigo 700
    doc.text(f.name, marginX + 8, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(f.type, marginX + 85, y + 12);

    doc.setFont('helvetica', f.req === 'Required' ? 'bold' : 'normal');
    doc.setTextColor(f.req === 'Required' ? 220 : 100, f.req === 'Required' ? 38 : 116, f.req === 'Required' ? 38 : 139);
    doc.text(f.req, marginX + 140, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(f.desc, marginX + 230, y + 12);

    y += 18;
  });

  y += 15;

  // ── Section 3: Response Status Codes ─────────────────────────────────────
  checkPageBreak(120);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('3. HTTP Response Codes', marginX, y);
  y += 14;

  const responses = [
    { code: '200 OK', status: 'Success', detail: '{ success: true, messageId: "..." [, taskId: "..."] }' },
    { code: '400 Bad Request', status: 'Client Error', detail: 'Validation failed: "name" is missing or body is invalid JSON.' },
    { code: '401 Unauthorized', status: 'Auth Error', detail: 'Invalid channel ID or revoked webhook token.' },
    { code: '405 Method Not Allowed', status: 'Method Error', detail: 'HTTP method is not POST.' },
    { code: '500 Server Error', status: 'Internal Error', detail: 'Failed to process inquiry or commit to database.' },
  ];

  responses.forEach((r, idx) => {
    checkPageBreak(16);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(r.code.startsWith('200') ? 16 : 185, r.code.startsWith('200') ? 185 : 28, r.code.startsWith('200') ? 129 : 28);
    doc.text(r.code, marginX + 8, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(r.detail, marginX + 140, y + 10);
    y += 15;
  });

  y += 15;

  // ── Section 4: Implementation Code Snippets ──────────────────────────────
  doc.addPage();
  y = 45;
  drawRunningHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('4. Implementation Code Samples', marginX, y);
  y += 16;

  const drawCodeBlock = (title: string, code: string) => {
    const lines = code.trim().split('\n');
    const blockHeight = lines.length * 10 + 26;
    checkPageBreak(blockHeight + 10);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title, marginX, y);
    y += 8;

    // Dark Background box
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.roundedRect(marginX, y, contentWidth, blockHeight, 5, 5, 'F');

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(241, 245, 249); // Slate 100

    let codeY = y + 15;
    lines.forEach((line) => {
      doc.text(line, marginX + 12, codeY);
      codeY += 10;
    });

    y += blockHeight + 16;
  };

  // cURL
  const curlSnippet = `curl -X POST "${rawUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-0199",
    "subject": "Website Inquiry",
    "message": "Interested in deploying Guild across our medical centers.",
    "metadata": {
      "source": "Landing Page Contact Form",
      "plan": "Enterprise"
    },
    "createTask": true
  }'`;
  drawCodeBlock('A. cURL (Terminal / Bash)', curlSnippet);

  // TypeScript / React
  const tsSnippet = `export async function submitChannelInquiry(formData: {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  const WEBHOOK_URL = "${rawUrl}";

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...formData,
      createTask: true, // Automatically creates an operational task
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || \`HTTP \${res.status}\`);
  }

  return await res.json(); // { success: true, messageId: "..." }
}`;
  drawCodeBlock('B. TypeScript / JavaScript (Client & Node.js)', tsSnippet);

  // Next.js Server Action
  const nextSnippet = `// app/actions/contact.ts
'use server';

export async function submitContactLead(formData: FormData) {
  const webhookUrl = process.env.GUILD_WEBHOOK_URL || "${rawUrl}";

  const payload = {
    name: formData.get('name') as string,
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    subject: (formData.get('subject') as string) || 'Website Inquiry',
    message: (formData.get('message') as string) || '',
    metadata: {
      source: 'External Landing Page',
      submittedAt: new Date().toISOString(),
    },
    createTask: true,
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) return { success: false, error: data.error };
  return { success: true, messageId: data.messageId };
}`;
  drawCodeBlock('C. Next.js 14+ / 15 Server Action (App Router)', nextSnippet);

  // Python
  const pythonSnippet = `import requests

WEBHOOK_URL = "${rawUrl}"

payload = {
    "name": "Alex Mercer",
    "email": "alex@enterprise.org",
    "phone": "+1 415-555-0142",
    "subject": "Platform Integration",
    "message": "Requesting sandbox credentials for automated ingestion pipeline.",
    "metadata": {"department": "Operations", "priority": "Urgent"},
    "createTask": True
}

response = requests.post(WEBHOOK_URL, json=payload, headers={"Content-Type": "application/json"})
if response.status_code == 200:
    print("Inquiry delivered:", response.json())
else:
    print(f"Error {response.status_code}:", response.text)`;
  drawCodeBlock('D. Python (requests)', pythonSnippet);

  // ── Footer Page Numbers ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX - 45, pageHeight - 20);
    doc.text('Confidential — Guild Orbit Internal & Partner Documentation', marginX, pageHeight - 20);
  }

  // Save the document
  const safeChannelSlug = (data.channelName || 'channel').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  doc.save(`guild-webhook-docs-${safeChannelSlug}.pdf`);
}
