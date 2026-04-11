// Get current tab and look up score
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) {
    showNoScore("Navigate to a website to see its TrustScore.");
    return;
  }

  chrome.runtime.sendMessage({ action: "getScore", url: tab.url }, (data) => {
    if (!data) {
      showNoScore(
        `No TrustScore available for this site.<br><br>` +
        `We've scored 281 AI systems so far.<br>` +
        `<a href="https://trustmodel.ai/leaderboard" target="_blank" style="color:#0891b2">Check the full leaderboard →</a>`
      );
      return;
    }
    showScore(data, tab.url);
  });
});

function showNoScore(msg) {
  document.getElementById("content").innerHTML = `
    <div class="no-score">
      <div class="icon">🔍</div>
      <p>${msg}</p>
    </div>
  `;
}

function showScore(data, url) {
  const color = data.score >= 8 ? "#22c55e" : data.score >= 6 ? "#a3e635" : data.score >= 4 ? "#f59e0b" : "#f97316";
  const textColor = data.score >= 6 ? "#064e3b" : data.score >= 4 ? "#7c2d12" : "#7f1d1d";
  const tierBg = data.score >= 8 ? "#dcfce7" : data.score >= 6 ? "#ecfccb" : data.score >= 4 ? "#fef3c7" : "#fee2e2";
  const tierText = data.score >= 8 ? "#15803d" : data.score >= 6 ? "#3f6212" : data.score >= 4 ? "#92400e" : "#991b1b";

  const typeUrls = {
    cots: "https://trustmodel.ai/benchmark",
    model: "https://trustmodel.ai/leaderboard",
    mcp: "https://trustmodel.ai/mcp-servers",
    chrome: "https://trustmodel.ai/chrome-extensions",
  };
  const detailUrl = typeUrls[data.type] || "https://trustmodel.ai/leaderboard";

  let hostname;
  try { hostname = new URL(url).hostname.replace("www.", ""); } catch { hostname = ""; }

  let risksHtml = "";
  if (data.riskFindings && data.riskFindings.length) {
    risksHtml = `<div class="findings"><h3>⚠ Risks</h3>${data.riskFindings.map(r => `<div class="finding risk">• ${r}</div>`).join("")}</div>`;
  }
  let posHtml = "";
  if (data.positiveFindings && data.positiveFindings.length) {
    posHtml = `<div class="findings"><h3>✓ Strengths</h3>${data.positiveFindings.map(p => `<div class="finding positive">• ${p}</div>`).join("")}</div>`;
  }

  let ctaHtml = "";
  if (data.score < 6.0) {
    ctaHtml = `
      <div class="cta-low">
        <p><strong>${data.name}</strong> scored <strong>${data.score}/10</strong> — below the "Generally Safe" threshold of 6.0.<br><br>
        If you rely on this system, encourage the vendor to get a <a href="https://trustmodel.ai/developers" target="_blank">detailed TrustModel evaluation</a> to identify and fix risks.</p>
      </div>
    `;
  }

  document.getElementById("content").innerHTML = `
    <div class="score-section">
      <div class="score-circle" style="background: ${color}20; border: 3px solid ${color};">
        <div>
          <div class="num" style="color: ${textColor};">${data.score}</div>
          <div class="out-of" style="color: ${textColor};">/10</div>
        </div>
      </div>
      <div class="system-name">${data.name}</div>
      <div style="font-size: 10px; color: #94a3b8; margin: 2px 0 6px;">${hostname} · ${data.type.toUpperCase()}</div>
      <span class="tier-badge" style="background: ${tierBg}; color: ${tierText};">${data.tier}</span>
    </div>
    ${risksHtml}
    ${posHtml}
    <div class="cta">
      ${ctaHtml}
      <div class="links">
        <a class="primary" href="${detailUrl}" target="_blank">Full Rankings</a>
        <a class="secondary" href="https://trustmodel.ai/leaderboard" target="_blank">All Categories</a>
      </div>
    </div>
  `;
}
