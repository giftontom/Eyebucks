import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@eyebuckz.com';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email Service using Resend
 * Handles all transactional emails for the LMS
 */
export const emailService = {
  /**
   * Send a generic email
   */
  async sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    // Skip if no API key configured (development mode)
    if (!process.env.RESEND_API_KEY) {
      console.log('[Email] Skipping email (no API key):', { to, subject });
      return true;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html
      });

      if (error) {
        console.error('[Email] Send error:', error);
        return false;
      }

      console.log('[Email] Sent successfully:', { to, subject, id: data?.id });
      return true;
    } catch (error) {
      console.error('[Email] Send failed:', error);
      return false;
    }
  },

  /**
   * Send enrollment confirmation email
   */
  async sendEnrollmentConfirmation(
    userEmail: string,
    userName: string,
    courseTitle: string,
    courseId: string
  ): Promise<boolean> {
    const subject = `Welcome to ${courseTitle}! 🎉`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enrollment Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #ef4444;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: bold;">Eyebuckz</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Welcome to ${courseTitle}!</h2>

              <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Congratulations! You're now enrolled in <strong>${courseTitle}</strong>. Get ready to level up your filmmaking skills!
              </p>

              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Here's what you can do next:
              </p>

              <ul style="margin: 0 0 25px; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
                <li>Start watching your course videos</li>
                <li>Track your progress in your dashboard</li>
                <li>Take notes as you learn</li>
                <li>Complete the course to earn your certificate</li>
              </ul>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${APP_URL}/#/learn/${courseId}" style="display: inline-block; padding: 16px 32px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Start Learning →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Reply to this email or visit our support center.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-align: center;">
                © 2026 Eyebuckz. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                You received this email because you enrolled in a course on Eyebuckz.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({ to: userEmail, subject, html });
  },

  /**
   * Send payment receipt email
   */
  async sendPaymentReceipt(
    userEmail: string,
    userName: string,
    courseTitle: string,
    amount: number,
    orderId: string,
    paymentId: string
  ): Promise<boolean> {
    const subject = `Payment Receipt - ${courseTitle}`;
    const formattedAmount = (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: bold;">Eyebuckz</h1>
              <p style="margin: 10px 0 0; color: #10b981; font-size: 16px; font-weight: 600;">Payment Successful ✓</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Thank you for your purchase!</h2>

              <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your payment for <strong>${courseTitle}</strong> has been processed successfully.
              </p>

              <!-- Receipt Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Order ID:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${orderId}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Payment ID:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${paymentId}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Course:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right;">${courseTitle}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding-top: 12px; border-top: 1px solid #e5e7eb;">Amount Paid:</td>
                        <td style="color: #10b981; font-size: 18px; font-weight: bold; text-align: right; padding-top: 12px; border-top: 1px solid #e5e7eb;">${formattedAmount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 25px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Keep this email for your records. If you have any questions about your purchase, please contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-align: center;">
                © 2026 Eyebuckz. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated receipt for your purchase.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({ to: userEmail, subject, html });
  },

  /**
   * Send certificate issued email
   */
  async sendCertificateIssued(
    userEmail: string,
    userName: string,
    courseTitle: string,
    certificateUrl: string
  ): Promise<boolean> {
    const subject = `🎓 Your Certificate for ${courseTitle}`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate Issued</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #8b5cf6;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
              <h1 style="margin: 0; color: #1f2937; font-size: 28px; font-weight: bold;">Congratulations!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">You've earned your certificate!</h2>

              <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 15px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Congratulations on completing <strong>${courseTitle}</strong>! Your dedication and hard work have paid off.
              </p>

              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Your certificate of completion is now ready and can be downloaded from your dashboard.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${certificateUrl}" style="display: inline-block; padding: 16px 32px; background-color: #8b5cf6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Download Certificate
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Share your achievement on LinkedIn and social media!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px; text-align: center;">
                © 2026 Eyebuckz. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Keep learning and growing with Eyebuckz!
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    return this.sendEmail({ to: userEmail, subject, html });
  }
};
