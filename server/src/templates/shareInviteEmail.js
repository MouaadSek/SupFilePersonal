const {
  BRAND,
  escapeHtml,
  buildBrandedEmailHtml,
  emailButton,
  emailInfoBox,
} = require('./emailLayout');

function permissionLabel(permission) {
  return permission === 'write' ? 'Write' : 'Read';
}

function buildShareInviteText({
  folderName,
  ownerName,
  permission,
  openUrl,
}) {
  return [
    'SUPFile — Folder shared with you',
    '',
    `${ownerName} shared the folder "${folderName}" with you on SUPFile.`,
    `Permission: ${permissionLabel(permission)}`,
    '',
    'Open the folder:',
    openUrl,
    '',
    '— SUPFile · Secure cloud storage',
  ].join('\n');
}

function buildShareInviteHtml({
  folderName,
  ownerName,
  permission,
  openUrl,
  logoCid,
  logoUrl,
}) {
  const perm = permissionLabel(permission);
  const safeFolder = escapeHtml(folderName);
  const safeOwner = escapeHtml(ownerName);

  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:${BRAND.textDark};">Hello,</p>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:${BRAND.textDark};">
      <strong style="color:${BRAND.primaryDark};">${safeOwner}</strong> shared a folder with you on
      <strong style="color:${BRAND.primaryDark};">SUPFile</strong>.
    </p>
    ${emailInfoBox({
      label: 'Shared folder',
      contentHtml: `<span style="font-size:15px;font-weight:600;color:${BRAND.textDark};">${safeFolder}</span>`,
    })}
    ${emailInfoBox({
      label: 'Your permission',
      contentHtml: `<span style="display:inline-block;padding:4px 12px;border-radius:8px;font-size:13px;font-weight:600;background-color:${BRAND.primary};color:${BRAND.white};">${escapeHtml(perm)}</span>`,
    })}
    ${emailButton(openUrl, 'Open shared folder')}
    ${emailInfoBox({
      contentHtml: `Or copy this link into your browser:<br />
        <a href="${openUrl}" style="color:${BRAND.primary};text-decoration:underline;word-break:break-all;">${escapeHtml(openUrl)}</a>`,
    })}
    <p style="margin:0;font-size:13px;line-height:1.45;color:${BRAND.textMid};">
      Sign in with this email address to access the folder. If you were not expecting this, you can ignore this message.
    </p>`;

  return buildBrandedEmailHtml({
    pageTitle: 'Folder shared with you — SUPFile',
    headerTitle: 'Folder shared with you',
    headerSubtitle: 'Someone gave you access on SUPFile',
    bodyHtml,
    logoCid,
    logoUrl,
  });
}

module.exports = {
  buildShareInviteHtml,
  buildShareInviteText,
  permissionLabel,
};
