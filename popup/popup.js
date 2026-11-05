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

// ── Shadow AI activity panel: external AI platforms this browser has talked to ──

function timeAgo(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

function renderShadow(inv) {
  const el = document.getElementById("shadow");
  if (!el) return;
  if (!inv || !inv.serviceCount) {
    el.innerHTML =
      `<h3>Shadow AI activity</h3>` +
      `<div class="sa-empty">No external AI traffic detected yet. As your browser talks to AI platforms ` +
      `(ChatGPT, Claude, Gemini, Copilot…), they appear here.</div>`;
    return;
  }
  const items = inv.services.slice(0, 8).map((s) => {
    const pages = Object.keys(s.pages || {}).length;
    return (
      `<div class="sa-item">` +
        `<div><div class="sa-name">${s.service}</div>` +
        `<div class="sa-cat">${s.category} · ${pages} page${pages === 1 ? "" : "s"} · ${timeAgo(s.lastSeen)}</div></div>` +
        `<div class="sa-hits">${s.hits}×</div>` +
      `</div>`
    );
  }).join("");
  el.innerHTML =
    `<h3>Shadow AI activity <span class="count">${inv.serviceCount} service${inv.serviceCount === 1 ? "" : "s"}</span></h3>` +
    items +
    `<div style="margin-top:8px;text-align:right"><button class="sa-clear" id="sa-clear">clear</button></div>`;
  const btn = document.getElementById("sa-clear");
  if (btn) btn.addEventListener("click", () => chrome.runtime.sendMessage({ action: "clearShadowAI" }, loadShadow));
}

function loadShadow() {
  chrome.runtime.sendMessage({ action: "getShadowAI" }, renderShadow);
}

loadShadow();
