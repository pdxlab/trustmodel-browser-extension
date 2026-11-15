/**
 * Content script — injects a floating Trust Score badge (bottom-right).
 * Shows the TrustModel brand icon, score, tier, and a subtle dismiss button.
 */

(function() {
  if (window.location.hostname.includes('trustmodel.ai')) return;

  // Shadow-AI detection: content script fires on every page load regardless of
  // the MV3 service worker's sleep state, so AI web UI visits are always captured.
  chrome.runtime.sendMessage({ action: 'recordPageVisit', url: window.location.href });

  chrome.runtime.sendMessage({ action: 'getScore', url: window.location.href }, (data) => {
    if (!data || !data.score) return;

    // ── Score is 0-10 (same scale as the popup and static DB) ───────────────
    // fetchSiteScore in background.js always returns score in 0-10.
    // Never re-scale here — that's what caused the mismatch.
    const scoreNum = typeof data.score === 'number' ? data.score : parseFloat(data.score) || 0;

    const palette = scoreNum >= 8.0
      ? { ring: '#22c55e', bg: '#f0fdf4', text: '#14532d', sub: '#16a34a' }   // green
      : scoreNum >= 6.0
      ? { ring: '#a3e635', bg: '#f7fee7', text: '#3f6212', sub: '#65a30d' }   // lime
      : scoreNum >= 4.0
      ? { ring: '#f59e0b', bg: '#fffbeb', text: '#78350f', sub: '#d97706' }   // amber
      : { ring: '#ef4444', bg: '#fef2f2', text: '#7f1d1d', sub: '#dc2626' };  // red

    // ── TrustModel brand icon (inline SVG — no extra file request) ───────────
    const TM_ICON = `<svg width="22" height="22" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="20" fill="#0f172a"/>
      <g transform="translate(10,10) scale(1.6875)">
        <path fill="white" d="M31.6709 59C37.2929 59 39.2981 58.5206 41.4336 56.7773C43.0902 55.4255 51.5015 42.307 53.5498 37.9053C54.2471 36.4671 54.9445 34.5497 55.0752 33.7217L55.3799 32.1963L54.1162 33.0244C51.8499 34.4627 50.8904 35.5959 48.624 39.3877C44.2223 46.6658 39.6032 53.552 38.6006 54.2061C37.2932 54.9905 29.1436 55.3827 26.9639 54.6855C24.3053 53.901 23.0407 52.2448 13.8447 36.9473C10.0966 30.802 9.70465 29.6244 10.3584 26.6172C11.666 20.4284 16.6784 13.8913 22.3877 10.9277C29.5789 7.22328 39.2106 8.18172 44.9199 13.2373L46.5322 14.6318L49.6709 12.2783L48.5371 11.1016C46.9244 9.40185 43.1324 7.22259 39.6895 6.0459C37.2492 5.17441 35.9416 5.00001 32.1504 5C29.6226 5 26.6149 5.26133 25.3945 5.56641C19.3365 7.09183 12.1017 13.0196 9.18164 18.9033C7.56906 22.0849 6 27.1843 6 29.1455C6.00008 31.4118 7.91786 34.8988 17.2881 49.8477C21.1668 55.9926 21.777 56.6467 24.5225 57.9541C26.3965 58.8694 27.3562 59 31.6709 59ZM31.627 50.2832C33.544 50.2832 35.4175 50.1522 35.8105 50.0215C36.1592 49.8907 37.8595 47.8861 39.5156 45.5762C44.179 38.9951 47.7967 35.0728 53.0703 30.6709C55.7285 28.4485 58.0813 26.2693 58.2998 25.833C58.5613 25.3972 58.7363 22.2152 58.7363 18.7285C58.7363 12.9325 58.6486 12.2786 57.8643 11.4941C56.8618 10.4917 56.6435 10.4482 55.4668 11.1455C53.854 12.0611 49.4089 15.896 45.5303 19.6875C41.8258 23.3049 37.3367 28.5786 33.6758 33.6777L31.9756 35.9883L30.7988 34.5498C29.2735 32.7194 29.2737 32.3706 30.5811 30.8018C32.2805 28.7537 32.6292 27.8381 32.0195 27.0537C31.5837 26.4436 30.4068 26.3128 24.8721 26.2256L18.291 26.0947L19.8164 23.5664L21.3848 21.082H41.2158L42.7842 19.3389C43.6554 18.3806 44.3527 17.5094 44.3535 17.3779C44.3535 17.2472 38.7309 17.1602 31.8447 17.1602H19.293L16.1113 22.5645C12.9301 28.0555 12.7119 28.9708 14.3242 29.7988C14.76 30.0603 17.6366 30.2344 20.7744 30.2344H26.4404L25.9609 31.5859C25.6123 32.5447 25.6562 33.1989 26.0049 33.9834C26.7028 35.5529 31.2351 41.1305 32.0195 41.4355C32.7604 41.7405 33.2401 41.1736 36.3779 36.5977C38.2084 33.852 40.4749 30.9753 45.1816 25.4404C46.097 24.3507 48.6247 21.8231 50.8037 19.8184L54.8135 16.2012V24.3945L52.5469 26.0947C48.0578 29.5379 41.4764 36.2927 37.8154 41.3047L34.1113 46.4043L31.7139 46.2734L29.3174 46.1426L26.6152 41.7842C21.6903 33.8085 21.4719 33.5038 20.5566 33.373C19.1622 33.1553 18.3779 34.3751 18.9443 35.9004C19.6853 37.9052 25.6128 47.5813 26.9639 49.0195C28.0968 50.196 28.3149 50.2832 31.627 50.2832Z"/>
      </g>
    </svg>`;

    // ── Build the badge ───────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.id = 'trustmodel-indicator';
    wrap.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'gap:9px',
      'padding:8px 12px 8px 10px',
      `background:${palette.bg}`,
      `border:2px solid ${palette.ring}`,
      'border-radius:28px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.14)',
      'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
      'cursor:pointer',
      'transition:transform .18s, box-shadow .18s, opacity .3s',
      'user-select:none',
    ].join(';');

    wrap.innerHTML = `
      ${TM_ICON}
      <div style="display:flex;flex-direction:column;gap:1px;min-width:0;">
        <div style="display:flex;align-items:baseline;gap:2px;">
          <span style="font-size:15px;font-weight:800;color:${palette.text};line-height:1;">${scoreNum}</span>
          <span style="font-size:9px;font-weight:700;color:${palette.sub};line-height:1;">/10</span>
        </div>
        <div style="font-size:9px;color:${palette.sub};line-height:1.2;white-space:nowrap;">${data.tier || 'TrustScore'}</div>
      </div>
      <button id="tm-dismiss" style="
        background:none;border:none;cursor:pointer;padding:2px 0 2px 2px;
        font-size:13px;color:#94a3b8;line-height:1;opacity:.7;
        font-family:inherit;
      " title="Dismiss">&times;</button>
    `;

    document.body.appendChild(wrap);

    // Hover lift
    wrap.addEventListener('mouseenter', () => {
      wrap.style.transform = 'scale(1.04) translateY(-1px)';
      wrap.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
    });
    wrap.addEventListener('mouseleave', () => {
      wrap.style.transform = '';
      wrap.style.boxShadow = '0 4px 16px rgba(0,0,0,0.14)';
    });

    // Dismiss
    document.getElementById('tm-dismiss').addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.style.opacity = '0';
      setTimeout(() => wrap.remove(), 300);
    });

    // Click body → open TrustModel page for this site type
    wrap.addEventListener('click', () => {
      const urls = {
        cots:   'https://trustmodel.ai/benchmark',
        model:  'https://trustmodel.ai/leaderboard',
        mcp:    'https://trustmodel.ai/mcp-servers',
        chrome: 'https://trustmodel.ai/chrome-extensions',
      };
      window.open(urls[data.type] || 'https://trustmodel.ai/leaderboard', '_blank');
    });

    // Auto-fade after 10s; restore on hover
    setTimeout(() => {
      wrap.style.opacity = '0.35';
      wrap.addEventListener('mouseenter', () => wrap.style.opacity = '1');
      wrap.addEventListener('mouseleave', () => wrap.style.opacity = '0.35');
    }, 10000);
  });
})();
