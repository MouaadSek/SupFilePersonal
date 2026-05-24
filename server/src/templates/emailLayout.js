const path = require('path');
const fs = require('fs');

/** SupFile brand palette (matches client-web globals.css + AuthLayout) */
const BRAND = {
  primary: '#2da2fd',
  primaryLight: '#3cb5ff',
  primaryDark: '#1e8ad4',
  pale: '#a5d3fe',
  bg: '#edf3f9',
  gradientStart: '#c2d8f2',
  gradientMid: '#d4e9fb',
  gradientEnd: '#cce8ff',
  textDark: '#364751',
  textMid: '#858c92',
  border: '#cdd0d3',
  white: '#ffffff',
};

const LOGO_DISPLAY_PX = 44;
const IMAGES_DIR = path.join(__dirname, '../../assets/images');

const EMAIL_STYLES = `
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  table { border-collapse: collapse; mso-table-lspace: 0; mso-table-rspace: 0; }
  @media only screen and (max-width: 600px) {
    .email-wrapper { padding: 24px 12px !important; }
    .email-card { width: 100% !important; max-width: 100% !important; }
    .email-header { padding: 24px 16px 20px !important; }
    .email-body { padding: 24px 18px !important; }
    .email-footer { padding: 16px 18px 20px !important; }
    .email-title { font-size: 20px !important; }
    .email-btn a { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
  }
`;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveLogoPath() {
  const candidates = [
    path.join(IMAGES_DIR, 'supfile-email.png'),
    path.join(IMAGES_DIR, 'supfile.png'),
    path.join(__dirname, '../../../shared/supfile-email.png'),
    path.join(__dirname, '../../../shared/supfile.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function getLogoAttachment() {
  const logoPath = resolveLogoPath();
  if (!logoPath) return null;
  return {
    filename: 'supfile-email.png',
    path: logoPath,
    cid: 'supfile-logo',
  };
}

/**
 * Primary CTA button (matches auth .btn-primary).
 */
function emailButton(href, label) {
  return `
    <table role="presentation" class="email-btn" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
      <tr>
        <td align="center" style="border-radius:10px;background-color:${BRAND.primary};">
          <a href="${href}"
             target="_blank"
             style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;line-height:1.2;color:${BRAND.white};text-decoration:none;border-radius:10px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/**
 * Info box (permission, expiry, fallback link, etc.).
 */
function emailInfoBox({ label, contentHtml }) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:18px;">
      <tr>
        <td style="background-color:${BRAND.bg};border-radius:8px;padding:12px 14px;border:1px solid ${BRAND.border};">
          ${label ? `<p style="margin:0 0 6px;font-size:11px;font-weight:600;color:${BRAND.textMid};text-transform:uppercase;letter-spacing:0.04em;">${label}</p>` : ''}
          <div style="margin:0;font-size:13px;line-height:1.45;color:${BRAND.textMid};word-break:break-word;">
            ${contentHtml}
          </div>
        </td>
      </tr>
    </table>`;
}

/**
 * @param {{ pageTitle: string, headerTitle: string, headerSubtitle?: string, bodyHtml: string, logoCid?: string, logoUrl?: string }} opts
 */
function buildBrandedEmailHtml({
  pageTitle,
  headerTitle,
  headerSubtitle = 'Secure cloud storage',
  bodyHtml,
  logoCid = '',
  logoUrl = '',
}) {
  const logoSrc = logoCid ? `cid:${logoCid}` : logoUrl;
  const year = new Date().getFullYear();
  const logo = LOGO_DISPLAY_PX;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(pageTitle)}</title>
  <style type="text/css">${EMAIL_STYLES}</style>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:'DM Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" class="email-wrapper" style="padding:32px 16px;">
        <table role="presentation" class="email-card" width="520" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:520px;">
          <tr>
            <td class="email-header" bgcolor="${BRAND.gradientMid}" style="border-radius:14px 14px 0 0;background-color:${BRAND.gradientMid};background:linear-gradient(135deg, ${BRAND.gradientStart} 0%, ${BRAND.gradientMid} 50%, ${BRAND.gradientEnd} 100%);padding:28px 20px 22px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" style="background-color:${BRAND.white};border-radius:12px;padding:6px;box-shadow:0 2px 8px rgba(45,162,253,0.18);line-height:0;">
                    <img src="${logoSrc}" alt="SUPFile" width="${logo}" height="${logo}" style="display:block;width:${logo}px;height:${logo}px;max-width:${logo}px;max-height:${logo}px;border:0;border-radius:8px;" />
                  </td>
                </tr>
              </table>
              <h1 class="email-title" style="margin:14px 0 0;font-size:20px;font-weight:700;line-height:1.3;color:${BRAND.textDark};letter-spacing:-0.02em;">
                ${escapeHtml(headerTitle)}
              </h1>
              <p style="margin:6px 0 0;font-size:13px;line-height:1.4;color:${BRAND.textMid};">
                ${escapeHtml(headerSubtitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td class="email-body" style="background-color:${BRAND.white};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:28px 24px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="background-color:${BRAND.white};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 14px 14px;padding:16px 24px 20px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:${BRAND.textMid};">SUPFile &copy; ${year}</p>
              <p style="margin:0;font-size:11px;color:${BRAND.textMid};opacity:0.85;">Automated message — please do not reply</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  BRAND,
  LOGO_DISPLAY_PX,
  IMAGES_DIR,
  escapeHtml,
  resolveLogoPath,
  getLogoAttachment,
  buildBrandedEmailHtml,
  emailButton,
  emailInfoBox,
};
