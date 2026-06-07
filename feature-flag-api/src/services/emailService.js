'use strict';

/**
 * Email service — wraps Resend.
 *
 * If RESEND_API_KEY is not set (local dev), emails are NOT sent.
 * Instead the full email content is printed to the console so you
 * can still test the reset flow without an email provider.
 *
 * Production setup:
 *   1. Sign up free at https://resend.com
 *   2. Add RESEND_API_KEY=re_xxxxxxxxxxxx to your .env
 *   3. Add RESEND_FROM_EMAIL=noreply@yourdomain.com to your .env
 *   4. Verify your sending domain in the Resend dashboard
 */

const { Resend } = require('resend');

const apiKey   = process.env.RESEND_API_KEY;
const fromEmail= process.env.RESEND_FROM_EMAIL || 'SwitchOn <noreply@switchon.dev>';
const appName  = process.env.APP_NAME          || 'SwitchOn';

// ── Resend client (only created when key exists) ──────────────────────────────
const resend = apiKey ? new Resend(apiKey) : null;

// ── Internal send helper ──────────────────────────────────────────────────────
async function send({ to, subject, html }) {
  if (!resend) {
    // Dev mode — log to console instead of sending
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[EmailService] DEV MODE — email not sent (no RESEND_API_KEY)');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    // Strip HTML tags for console readability
    console.log('Body:   ', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { success: true, dev: true };
  }

  const { data, error } = await resend.emails.send({
    from:    fromEmail,
    to:      [to],
    subject,
    html,
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return { success: true, id: data?.id };
}

// ── Password reset email ──────────────────────────────────────────────────────
async function sendPasswordReset(toEmail, resetUrl) {
  const subject = `Reset your ${appName} password`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#3b82f6);border-radius:10px;width:38px;height:38px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:18px;font-weight:800;line-height:38px;">⚡</span>
                  </td>
                  <td style="padding-left:12px;">
                    <div style="color:#f1f5f9;font-weight:800;font-size:17px;letter-spacing:-0.3px;">${appName}</div>
                    <div style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Feature Flag Control Plane</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                Reset your password
              </h1>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:15px;line-height:1.7;">
                We received a request to reset your password. Click the button below —
                this link expires in <strong style="color:rgba(255,255,255,0.7);">1 hour</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);">
                    <a href="${resetUrl}"
                      style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:-0.2px;">
                      Reset password →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:rgba(255,255,255,0.3);font-size:13px;line-height:1.6;">
                Or copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color:#a78bfa;word-break:break-all;font-size:12px;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password won't change until you click the link above and create a new one.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return send({ to: toEmail, subject, html });
}

// ── Invitation email (for when email-based invites are needed) ────────────────
async function sendInvitation(toEmail, orgName, inviterEmail, inviteUrl, role) {
  const subject = `You've been invited to join ${orgName} on ${appName}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">

          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="color:#f1f5f9;font-weight:800;font-size:17px;">⚡ ${appName}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 12px;color:#f1f5f9;font-size:22px;font-weight:700;">
                You're invited!
              </h1>
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.5);font-size:15px;line-height:1.7;">
                <strong style="color:rgba(255,255,255,0.7);">${inviterEmail}</strong> has invited you to join
              </p>
              <p style="margin:0 0 28px;color:#a78bfa;font-size:18px;font-weight:700;">${orgName}</p>
              <p style="margin:0 0 28px;color:rgba(255,255,255,0.4);font-size:14px;">
                You'll join as a <strong style="color:rgba(255,255,255,0.7);">${role}</strong>.
                This invitation expires in 72 hours.
              </p>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#7c3aed,#3b82f6);">
                    <a href="${inviteUrl}"
                      style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                      Accept invitation →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;">
                If you weren't expecting this invitation, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return send({ to: toEmail, subject, html });
}

module.exports = { sendPasswordReset, sendInvitation, send };
