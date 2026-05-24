const {
  escapeHtml,
  buildBrandedEmailHtml,
  emailButton,
  emailInfoBox,
  getLogoAttachment,
  resolveLogoPath,
  IMAGES_DIR,
  BRAND,
  LOGO_DISPLAY_PX,
} = require('./emailLayout');

function buildPasswordResetText({ resetUrl, expiresLabel }) {
  return [
    'SUPFile — Reset your password',
    '',
    'You requested a password reset for your SUPFile account.',
    '',
    `Set a new password (this link expires in ${expiresLabel}):`,
    resetUrl,
    '',
    'If you did not request this, you can safely ignore this email.',
    '',
    '— SUPFile · Secure cloud storage',
  ].join('\n');
}

function buildPasswordResetHtml({ resetUrl, expiresLabel, logoCid, logoUrl }) {
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${BRAND.textDark};">Hello,</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:${BRAND.textDark};">
      We received a request to reset the password for your
      <strong style="color:${BRAND.primaryDark};">SUPFile</strong> account.
      Tap the button below to choose a new password.
    </p>
    ${emailButton(resetUrl, 'Set new password')}
    ${emailInfoBox({
      label: `Link expires in ${escapeHtml(expiresLabel)}`,
      contentHtml: `If the button does not work, copy this link:<br />
        <a href="${resetUrl}" style="color:${BRAND.primary};text-decoration:underline;word-break:break-all;">${escapeHtml(resetUrl)}</a>`,
    })}
    <p style="margin:0;font-size:13px;line-height:1.45;color:${BRAND.textMid};">
      If you did not request this, ignore this email — your password will not change.
    </p>`;

  return buildBrandedEmailHtml({
    pageTitle: 'Reset your SUPFile password',
    headerTitle: 'Reset your password',
    bodyHtml,
    logoCid,
    logoUrl,
  });
}

module.exports = {
  BRAND,
  LOGO_DISPLAY_PX,
  IMAGES_DIR,
  buildPasswordResetHtml,
  buildPasswordResetText,
  getLogoAttachment,
  resolveLogoPath,
};
