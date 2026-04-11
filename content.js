/**
 * Content script — injects a small trust indicator on scored websites.
 * Shows a floating badge in the bottom-right corner.
 */

(function() {
  // Don't run on trustmodel.ai itself
  if (window.location.hostname.includes('trustmodel.ai')) return;

  // Ask background for score
  chrome.runtime.sendMessage(
    { action: 'getScore', url: window.location.href },
    (data) => {
      if (!data || !data.score) return;

      // Create floating indicator
      const indicator = document.createElement('div');
      indicator.id = 'trustmodel-indicator';

      const color = data.score >= 8 ? '#22c55e' : data.score >= 6 ? '#a3e635' : data.score >= 4 ? '#f59e0b' : '#f97316';
      const textColor = data.score >= 6 ? '#064e3b' : '#7c2d12';

      indicator.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: white;
          border: 2px solid ${color};
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.2)'"
          onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'"
        >
          <div style="
            width: 28px; height: 28px;
            background: ${color};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: ${textColor};
            font-weight: 800;
            font-size: 11px;
          ">${data.score}</div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #1a1a2e; line-height: 1.2;">TrustScore</div>
            <div style="font-size: 9px; color: #64748b; line-height: 1.2;">${data.tier}</div>
          </div>
          <div style="font-size: 10px; color: #94a3b8; margin-left: 4px;">×</div>
        </div>
      `;

      document.body.appendChild(indicator);

      // Click → open popup or leaderboard
      indicator.querySelector('div[style*="position: fixed"]').addEventListener('click', (e) => {
        if (e.target.textContent === '×') {
          indicator.remove();
          return;
        }
        const typeUrls = {
          'cots': 'https://trustmodel.ai/benchmark',
          'model': 'https://trustmodel.ai/leaderboard',
          'mcp': 'https://trustmodel.ai/mcp-servers',
          'chrome': 'https://trustmodel.ai/chrome-extensions',
        };
        window.open(typeUrls[data.type] || 'https://trustmodel.ai/leaderboard', '_blank');
      });

      // Auto-hide after 10 seconds, show again on hover
      setTimeout(() => {
        const el = indicator.querySelector('div[style*="position: fixed"]');
        if (el) {
          el.style.opacity = '0.3';
          el.style.transition = 'opacity 0.3s';
          el.addEventListener('mouseenter', () => el.style.opacity = '1');
          el.addEventListener('mouseleave', () => el.style.opacity = '0.3');
        }
      }, 10000);
    }
  );
})();
