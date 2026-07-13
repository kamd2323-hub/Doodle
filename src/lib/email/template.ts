export interface BrandConfig {
  organizationName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  fromName?: string | null
  fromEmail?: string | null
  customDomain?: string | null
}

/**
 * Wraps email body HTML in a branded template using the organization's
 * logo, primary color, and sender name.
 */
export function wrapWithBranding(bodyHtml: string, brand: BrandConfig): string {
  const primaryColor = brand.primaryColor || '#6366f1' // Default indigo
  const orgName = brand.organizationName || 'Reclaim AI'
  const logoHtml = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(orgName)} logo" style="max-height:48px;width:auto;margin-bottom:16px;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f5f7;
      color: #1e293b;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .email-card {
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .email-header {
      padding: 24px 32px 16px;
      border-bottom: 2px solid ${primaryColor};
      text-align: ${brand.logoUrl ? 'center' : 'left'};
    }
    .email-body {
      padding: 24px 32px;
      font-size: 15px;
    }
    .email-body p {
      margin-bottom: 12px;
    }
    .email-footer {
      padding: 16px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .btn {
      display: inline-block;
      padding: 12px 28px;
      background-color: ${primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      margin: 8px 0;
    }
    @media only screen and (max-width: 480px) {
      .email-header, .email-body, .email-footer { padding-left: 16px; padding-right: 16px; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-card">
      <div class="email-header">
        ${logoHtml}
        <span style="font-size:12px;color:#94a3b8;">${escapeHtml(orgName)}</span>
      </div>
      <div class="email-body">
        ${bodyHtml}
      </div>
      <div class="email-footer">
        <p>Sent via Reclaim AI &mdash; Automated Invoice Recovery</p>
        ${brand.fromName ? `<p style="margin-top:4px;">${escapeHtml(brand.fromName)} &bull; ${escapeHtml(orgName)}</p>` : ''}
        <p style="margin-top:8px;font-size:10px;color:#cbd5e1;">
          This is an automated payment reminder from Reclaim AI.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
