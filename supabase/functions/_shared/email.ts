/**
 * Send an email via Resend API (fire-and-forget).
 */
export function sendEmail(to: string, subject: string, html: string): void {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey || !to) return;

  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@eyebuckz.com';

  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  }).catch(err => console.error('[Email] Send error:', err));
}
