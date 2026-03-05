const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Send an email via Resend API with retry logic.
 * Fire-and-forget — does not block the calling function.
 */
export function sendEmail(to: string, subject: string, html: string): void {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey || !to) {return;}

  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyebuckz.com';

  sendWithRetry(resendApiKey, fromEmail, to, subject, html).catch(err =>
    console.error(`[Email] All ${MAX_RETRIES} attempts failed for ${to}:`, err)
  );
}

async function sendWithRetry(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html }),
      });

      if (res.ok) {return;}

      // 4xx errors (except 429) are not retryable
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const body = await res.text().catch(() => '');
        console.error(`[Email] Non-retryable error (${res.status}) for ${to}: ${body}`);
        return;
      }

      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < MAX_RETRIES) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      console.warn(`[Email] Attempt ${attempt}/${MAX_RETRIES} failed for ${to}, retrying in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }

  throw lastError || new Error('All retries exhausted');
}
