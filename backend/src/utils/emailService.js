/**
 * Email service.
 *
 * Uses Nodemailer. When SMTP_HOST / SMTP_USER / SMTP_PASS are not configured
 * (local dev without a mail server) every method falls back to logging the
 * email content to the console so all flows can be tested immediately.
 */

const nodemailer = require("nodemailer");

// ── Transporter ──────────────────────────────────────────────────────────────

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // No transporter — all sends will fall through to console logging
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: parseInt(SMTP_PORT || "587", 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return _transporter;
}

const FROM =
  process.env.EMAIL_FROM || "AI Assistant <noreply@ai-assistant.local>";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ── Internal send helper ──────────────────────────────────────────────────────

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — print to console instead of failing
    console.log("\n========= [DEV EMAIL] =========");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${text || html}`);
    console.log("================================\n");
    return;
  }

  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text });
  } catch (err) {
    console.error("Email send failed:", err.message);
    // Don't throw — a mail failure should not crash auth flows
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send account email-verification email.
 * @param {string} to - Recipient email
 * @param {string} rawToken - Unhashed token to embed in the link
 */
async function sendVerificationEmail(to, rawToken) {
  const link = `${FRONTEND_URL}/verify-email?token=${rawToken}`;

  await sendMail({
    to,
    subject: "Verify your AI Assistant account",
    text: `Welcome to AI Assistant!\n\nPlease verify your email by visiting:\n${link}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">Verify your email</h2>
        <p>Welcome to <strong>AI Assistant</strong>! Click the button below to verify your account.</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:0.85rem">Link expires in 24 hours. If you did not sign up, ignore this email.</p>
        <p style="color:#6b7280;font-size:0.8rem">Or copy this link:<br>${link}</p>
      </div>
    `,
  });
}

/**
 * Send password-reset email.
 * @param {string} to
 * @param {string} rawToken
 */
async function sendPasswordResetEmail(to, rawToken) {
  const link = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendMail({
    to,
    subject: "Reset your AI Assistant password",
    text: `You requested a password reset for your AI Assistant account.\n\nVisit this link to reset your password:\n${link}\n\nThis link expires in 1 hour and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4f46e5">Reset your password</h2>
        <p>We received a request to reset the password for your <strong>AI Assistant</strong> account.</p>
        <a href="${link}"
           style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:0.85rem">Link expires in 1 hour and can only be used once.</p>
        <p style="color:#6b7280;font-size:0.85rem">If you did not request this, your account is safe — no changes were made.</p>
        <p style="color:#6b7280;font-size:0.8rem">Or copy this link:<br>${link}</p>
      </div>
    `,
  });
}

/**
 * Send a security alert email (suspicious login, new device, etc.).
 * @param {string} to
 * @param {string} eventType  - Human-readable event name
 * @param {{ ip?: string, device?: string, browser?: string, time?: string }} meta
 */
async function sendSecurityAlertEmail(to, eventType, meta = {}) {
  const time = meta.time || new Date().toUTCString();
  const details = [
    meta.ip && `IP address: ${meta.ip}`,
    meta.device && `Device: ${meta.device}`,
    meta.browser && `Browser: ${meta.browser}`,
    `Time: ${time}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMail({
    to,
    subject: `AI Assistant security alert: ${eventType}`,
    text: `Security alert for your AI Assistant account.\n\nEvent: ${eventType}\n\n${details}\n\nIf this was not you, please change your password immediately and review your active sessions.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#ef4444">Security Alert</h2>
        <p>We detected the following activity on your <strong>AI Assistant</strong> account:</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:12px 0">
          <strong>${eventType}</strong>
          <pre style="margin:8px 0 0;font-size:0.85rem;color:#374151">${details}</pre>
        </div>
        <p style="color:#6b7280;font-size:0.85rem">If this was not you, please change your password immediately and revoke any suspicious sessions from your account security settings.</p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
};
