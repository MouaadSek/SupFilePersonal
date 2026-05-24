const nodemailer = require('nodemailer');
const { getClientOrigin } = require('../utils/passwordReset');
const {
  buildPasswordResetHtml,
  buildPasswordResetText,
  getLogoAttachment,
} = require('../templates/passwordResetEmail');
const {
  buildShareInviteHtml,
  buildShareInviteText,
} = require('../templates/shareInviteEmail');

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function getFromAddress() {
  const fromName = process.env.SMTP_FROM_NAME || 'SUPFile';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  return `"${fromName}" <${fromEmail}>`;
}

function getLogoMeta() {
  const logoAttachment = getLogoAttachment();
  const clientOrigin = getClientOrigin();
  const logoUrl = `${clientOrigin}/supfile.png`;
  return {
    logoAttachment,
    logoCid: logoAttachment ? logoAttachment.cid : '',
    logoUrl,
  };
}

/**
 * @param {{ to: string, subject: string, text: string, html: string }} mail
 */
async function sendBrandedMail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP not configured — email skipped:', subject);
    return false;
  }

  const { logoAttachment } = getLogoMeta();
  const mailOptions = {
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  };
  if (logoAttachment) {
    mailOptions.attachments = [logoAttachment];
  }

  await transporter.sendMail(mailOptions);
  return true;
}

/**
 * @param {{ to: string, resetUrl: string, expiresLabel: string }} opts
 */
async function sendPasswordResetEmail({ to, resetUrl, expiresLabel }) {
  const { logoCid, logoUrl } = getLogoMeta();
  return sendBrandedMail({
    to,
    subject: 'Reset your SUPFile password',
    text: buildPasswordResetText({ resetUrl, expiresLabel }),
    html: buildPasswordResetHtml({ resetUrl, expiresLabel, logoCid, logoUrl }),
  });
}

/**
 * @param {{ to: string, folderName: string, ownerName: string, permission: string, folderId: string }} opts
 */
async function sendShareInviteEmail({
  to,
  folderName,
  ownerName,
  permission,
  folderId,
}) {
  const openUrl = `${getClientOrigin()}/files?folder=${encodeURIComponent(folderId)}`;
  const { logoCid, logoUrl } = getLogoMeta();
  const payload = { folderName, ownerName, permission, openUrl, logoCid, logoUrl };

  return sendBrandedMail({
    to,
    subject: `${ownerName} shared "${folderName}" with you on SUPFile`,
    text: buildShareInviteText(payload),
    html: buildShareInviteHtml(payload),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendShareInviteEmail,
};
