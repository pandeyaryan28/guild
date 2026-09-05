export interface DemoRequestPayload {
  name: string;
  email: string;
  company?: string;
  teamSize?: string;
  message?: string;
  source: 'demo_page' | 'contact_page';
  formType?: 'demo' | 'inquiry';
}

export interface DemoSubmissionResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
}

export async function submitDemoRequest(payload: DemoRequestPayload): Promise<DemoSubmissionResponse> {
  try {
    const res = await fetch('/api/demo-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server returned error status ${res.status}`);
  } catch (err: any) {
    console.error('[demoService] Demo submission error:', err);
    throw err;
  }
}
