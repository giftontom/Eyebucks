/**
 * Branded email templates for Eyebuckz LMS.
 * All templates return complete HTML strings ready to pass to sendEmail().
 */

const BRAND_COLOR = '#dc2626'; // brand-600 red
const BRAND_DARK = '#b91c1c';
const TEXT_PRIMARY = '#111827';
const TEXT_SECONDARY = '#6b7280';
const BG_SURFACE = '#f9fafb';
const BORDER_COLOR = '#e5e7eb';

function layout(content: string, appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eyebuckz</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_SURFACE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_SURFACE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
              <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Eyebuckz</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid ${BORDER_COLOR};border-right:1px solid ${BORDER_COLOR};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BG_SURFACE};border:1px solid ${BORDER_COLOR};border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:${TEXT_SECONDARY};">
                &copy; ${new Date().getFullYear()} Eyebuckz. All rights reserved.
              </p>
              <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY};">
                <a href="${appUrl}" style="color:${BRAND_COLOR};text-decoration:none;">eyebuckz.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:8px;"
     onmouseover="this.style.backgroundColor='${BRAND_DARK}'"
     onmouseout="this.style.backgroundColor='${BRAND_COLOR}'"
  >${label}</a>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${TEXT_PRIMARY};">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT_SECONDARY};">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER_COLOR};margin:24px 0;" />`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:${TEXT_SECONDARY};background:${BG_SURFACE};border-radius:4px;font-weight:500;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:${TEXT_PRIMARY};font-weight:600;">${value}</td>
  </tr>`;
}

/** Enrollment welcome email sent immediately after purchase. */
export function enrollmentWelcomeEmail(opts: {
  name: string;
  courseTitle: string;
  learnUrl: string;
  appUrl: string;
}): string {
  const content = `
    ${heading(`You're enrolled in ${opts.courseTitle}!`)}
    ${para(`Hi ${opts.name},`)}
    ${para(`Congratulations! Your enrollment is confirmed. You now have full access to <strong style="color:${TEXT_PRIMARY};">${opts.courseTitle}</strong>. Click below to start learning.`)}
    <div style="text-align:center;margin:28px 0;">
      ${ctaButton('Start Learning Now', opts.learnUrl)}
    </div>
    ${para(`If you have any questions, reply to this email and we'll be happy to help.`)}
  `;
  return layout(content, opts.appUrl);
}

/** Payment receipt email sent after successful payment. */
export function paymentReceiptEmail(opts: {
  name: string;
  courseTitle: string;
  orderId: string;
  paymentId: string;
  amount: string;
  learnUrl: string;
  appUrl: string;
}): string {
  const content = `
    ${heading('Payment Receipt')}
    ${para(`Hi ${opts.name}, your payment was successful. Here are your transaction details:`)}
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${infoRow('Course', opts.courseTitle)}
      ${infoRow('Amount Paid', opts.amount)}
      ${infoRow('Order ID', opts.orderId)}
      ${infoRow('Payment ID', opts.paymentId)}
    </table>
    ${divider()}
    <div style="text-align:center;margin:24px 0;">
      ${ctaButton('Go to My Course', opts.learnUrl)}
    </div>
    ${para(`Keep this email for your records. If you did not make this purchase, please contact us immediately.`)}
  `;
  return layout(content, opts.appUrl);
}

/** Certificate issuance email sent on course completion. */
export function certificateEmail(opts: {
  name: string;
  courseTitle: string;
  certificateNumber: string;
  dashboardUrl: string;
  appUrl: string;
}): string {
  const content = `
    ${heading(`You've completed ${opts.courseTitle}!`)}
    ${para(`Hi ${opts.name},`)}
    ${para(`Outstanding work! You've successfully completed <strong style="color:${TEXT_PRIMARY};">${opts.courseTitle}</strong> and earned your certificate.`)}
    ${divider()}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${infoRow('Certificate Number', opts.certificateNumber)}
      ${infoRow('Course', opts.courseTitle)}
      ${infoRow('Recipient', opts.name)}
    </table>
    ${divider()}
    <div style="text-align:center;margin:24px 0;">
      ${ctaButton('Download Certificate', opts.dashboardUrl)}
    </div>
    ${para(`Share your achievement with the world. You've earned it!`)}
  `;
  return layout(content, opts.appUrl);
}
