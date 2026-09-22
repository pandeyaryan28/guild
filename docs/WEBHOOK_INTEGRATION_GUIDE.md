# Guild Orbit — Incoming Channel Webhook & API Integration Guide
*Version 1.1.0*

Guild Orbit Incoming Channel Webhooks provide a secure, real-time HTTP bridge between your public web assets (such as landing pages, customer portals, contact forms, or third-party CRM tools like UniCare and Nullwave) and your team’s Guild Orbit chat channels.

When an inquiry or lead is submitted from an external site, Guild Orbit:
1. **Instantly delivers a formatted markdown card** into the designated channel feed.
2. **Alerts all channel members** via in-app notifications and web push.
3. **Optionally creates an operational task** in your workspace task board (with priority marked as High) assigned to the channel administrator or team lead.

---

## 🚀 Quick Setup (Inside Guild Orbit)

1. Navigate to the channel where you want to receive external leads (e.g. `#leads`, `#unicare-inquiries`, `#sales`).
2. Click the channel header or open **Channel Settings**.
3. Select the **Integrations & API** tab.
4. Set your desired **Bot Display Name** (e.g. `UniCare Enquiries` or `Nullwave Leads`).
5. Click **Generate Webhook URL**.
6. Copy the generated Webhook URL and store it securely in your external project’s environment variables (e.g., `GUILD_ORBIT_WEBHOOK_URL`).

---

## 📡 API Endpoint Reference

### Endpoint URL
```http
POST https://<your-guild-orbit-domain>/api/webhooks/channel?channelId=<CHANNEL_ID>&token=<WEBHOOK_TOKEN>
```

### Authentication
Guild Orbit supports two authentication methods for incoming webhooks:

1. **Query Parameter (Easiest for HTML forms / webhooks):**
   ```
   POST /api/webhooks/channel?channelId=<CHANNEL_ID>&token=gh_live_...
   ```
2. **Authorization Header (Recommended for backend / server-side calls):**
   ```
   POST /api/webhooks/channel?channelId=<CHANNEL_ID>
   Authorization: Bearer gh_live_...
   ```

### CORS Support
The endpoint includes `Access-Control-Allow-Origin: *` and responds to `OPTIONS` preflight requests, making it directly callable from browser client-side forms or server-side workflows.

---

## 📦 Request Payload Schema

Send `Content-Type: application/json` with the following schema:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Full name of the inquiry contact or lead. |
| `email` | `string` | No | Contact email address. |
| `phone` | `string` | No | Contact telephone or mobile number. |
| `subject` | `string` | No | Title or brief topic of the inquiry. |
| `message` | `string` | No | Full message or inquiry description. |
| `metadata` | `object` | No | Arbitrary key-value pairs with custom details (e.g., Clinic Name, Plan, Source). |
| `createTask` | `boolean` | No | Explicitly triggers high-priority operational task creation in the workspace. |

### Sample JSON Payload
```json
{
  "name": "Sarah Jenkins",
  "email": "sarah.j@example.com",
  "phone": "+1 (555) 382-9102",
  "subject": "Enterprise Consultation Request",
  "message": "We would like to connect UniCare clinic patient booking directly with Guild Orbit operations.",
  "metadata": {
    "Lead Source": "UniCare Landing Page",
    "Clinic Branch": "Downtown Medical",
    "Estimated Volume": "500 patients/mo",
    "Referral ID": "REF-8842"
  },
  "createTask": true
}
```

---

## 📬 Response Codes

### `200 OK` — Success
Returned when the message is successfully published to the channel.
```json
{
  "success": true,
  "messageId": "msg_90df81ac98bc43",
  "taskId": "task_48be21f3791a"
}
```

### `400 Bad Request` — Validation Error
Returned if `name` is missing or the JSON payload is malformed.
```json
{
  "error": "Validation failed: \"name\" is required and cannot be empty."
}
```

### `401 Unauthorized` — Invalid or Revoked Token
Returned if the channel ID does not exist or the token does not match the active channel webhook token.
```json
{
  "error": "Unauthorized: Invalid or revoked webhook token"
}
```

---

## 💻 Client Integration Examples

### 1. Plain HTML + Vanilla JavaScript (Static Sites / Webflow / WordPress)
Copy and paste this into any standard contact form page:

```html
<form id="contact-form" class="space-y-4">
  <input type="text" id="name" placeholder="Your Name *" required />
  <input type="email" id="email" placeholder="Email Address" />
  <input type="tel" id="phone" placeholder="Phone Number" />
  <input type="text" id="subject" placeholder="Subject" />
  <textarea id="message" placeholder="How can we help?"></textarea>
  <button type="submit" id="submit-btn">Send Inquiry</button>
  <div id="feedback" style="display: none;"></div>
</form>

<script>
  const WEBHOOK_URL = 'https://<your-guild-orbit-domain>/api/webhooks/channel?channelId=<CHANNEL_ID>&token=<TOKEN>';

  document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const feedback = document.getElementById('feedback');
    btn.disabled = true;
    btn.innerText = 'Sending...';

    const payload = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim() || undefined,
      phone: document.getElementById('phone').value.trim() || undefined,
      subject: document.getElementById('subject').value.trim() || undefined,
      message: document.getElementById('message').value.trim() || undefined,
      metadata: {
        pageUrl: window.location.href,
        referrer: document.referrer || 'Direct',
      },
      createTask: true,
    };

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        feedback.innerText = 'Thank you! Your inquiry has been received.';
        feedback.style.color = 'green';
        feedback.style.display = 'block';
        document.getElementById('contact-form').reset();
      } else {
        throw new Error(data.error || 'Failed to submit form.');
      }
    } catch (err) {
      feedback.innerText = 'Submission error: ' + err.message;
      feedback.style.color = 'red';
      feedback.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerText = 'Send Inquiry';
    }
  });
</script>
```

---

### 2. React / TypeScript (Reusable Hook or Function)
```typescript
interface InquiryData {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  metadata?: Record<string, unknown>;
  createTask?: boolean;
}

export async function sendGuildOrbitLead(data: InquiryData) {
  const WEBHOOK_URL = process.env.NEXT_PUBLIC_GUILD_WEBHOOK_URL;
  if (!WEBHOOK_URL) throw new Error('Missing NEXT_PUBLIC_GUILD_WEBHOOK_URL');

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `Error ${response.status}: Failed to deliver lead`);
  }

  return result; // { success: true, messageId: string, taskId?: string }
}
```

---

### 3. Next.js App Router (Server Action — Zero Client Exposure)
Recommended for Next.js 14/15 apps to keep webhook tokens completely hidden from client inspection:

```typescript
// app/actions/contact.ts
'use server';

export async function submitContactAction(formData: FormData) {
  // Read server-only environment variable
  const webhookUrl = process.env.GUILD_ORBIT_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, error: 'Server webhook configuration missing' };
  }

  const name = formData.get('name') as string;
  if (!name?.trim()) {
    return { success: false, error: 'Name is required' };
  }

  const payload = {
    name: name.trim(),
    email: (formData.get('email') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    subject: (formData.get('subject') as string) || 'Website Lead',
    message: (formData.get('message') as string) || '',
    metadata: {
      source: 'UniCare Marketing Site',
      userAgent: 'Next.js Server Action',
      submittedAt: new Date().toISOString(),
    },
    createTask: true,
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Submission rejected' };
    }

    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network connection failed' };
  }
}
```

---

### 4. Node.js / Express or Cloud Functions
```javascript
import fetch from 'node-fetch';

app.post('/api/contact-submit', async (req, res) => {
  const { name, email, phone, notes, clinicId } = req.body;

  const webhookEndpoint = process.env.GUILD_ORBIT_WEBHOOK_URL;

  const guildPayload = {
    name,
    email,
    phone,
    subject: `New Clinic Patient: ${name}`,
    message: notes,
    metadata: {
      clinicId,
      portal: 'Nullwave Patient Portal',
    },
    createTask: true,
  };

  const response = await fetch(webhookEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guildPayload),
  });

  const data = await response.json();
  res.status(response.status).json(data);
});
```

---

### 5. Python (Requests / FastAPI / Django)
```python
import requests
import os

def notify_guild_orbit(name: str, email: str, message: str, clinic_name: str):
    webhook_url = os.environ.get("GUILD_ORBIT_WEBHOOK_URL")
    
    payload = {
        "name": name,
        "email": email,
        "subject": f"Lead from {clinic_name}",
        "message": message,
        "metadata": {
            "Clinic": clinic_name,
            "Environment": "Production"
        },
        "createTask": True
    }
    
    response = requests.post(
        webhook_url,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=10
    )
    
    response.raise_for_status()
    return response.json()
```

---

### 6. cURL Terminal Test Command
```bash
curl -X POST "https://<your-guild-orbit-domain>/api/webhooks/channel?channelId=<CHANNEL_ID>&token=<TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-0199",
    "subject": "UniCare Dental Consultation",
    "message": "Patient requested appointment for Tuesday morning.",
    "metadata": {
      "Clinic": "Downtown West",
      "Insurance": "BlueCross"
    },
    "createTask": true
  }'
```

---

## 🔒 Security & Best Practices

1. **Keep Webhook Tokens Secret**: Treat your `token` as an API secret. When possible, invoke the webhook from your backend (e.g. Next.js Server Action, Express server, AWS Lambda) rather than exposing the URL in client-side frontend code.
2. **Prevent Spam**: If calling directly from a public frontend form, attach a CAPTCHA (such as Cloudflare Turnstile) before invoking the webhook.
3. **Instant Token Revocation**: If a token is ever compromised, navigate to **Channel Settings > Integrations & API** and click **Revoke Webhook URL**. All requests using the old token will be immediately blocked with HTTP 401 Unauthorized.
4. **Channel Isolation**: Each channel has its own independent cryptographic token. Revoking or updating one channel has zero effect on any other channel.
