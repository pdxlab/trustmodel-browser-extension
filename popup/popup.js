// Get current tab and look up score
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) {
    showNoScore("Navigate to a website to see its TrustScore.");
    return;
  }

  chrome.runtime.sendMessage({ action: "getScore", url: tab.url }, (data) => {
    if (!data) {
      let host = "";
      try { host = new URL(tab.url).hostname.replace("www.", ""); } catch {}
      showNoScore(
        `No TrustScore yet for this site.<br><br>` +
        `It hasn't been assessed. You can ask TrustModel to score it &mdash; or verify it if it's yours.`,
        host
      );
      return;
    }
    showScore(data, tab.url);
  });
});

function showNoScore(msg, host) {
  let flag = "";
  if (host) {
    flag = `
      <div class="verify" style="border-top:none">
        <a class="vbtn vsecondary" href="https://trustmodel.ai/get-verified?domain=${encodeURIComponent(host)}&src=ext" target="_blank">This is my site &mdash; Get Verified</a>
        ${rateFormHtml(host)}
      </div>`;
  }
  document.getElementById("content").innerHTML = `
    <div class="no-score">
      <div class="icon">&#128269;</div>
      <p>${msg}</p>
    </div>${flag}
  `;
  wireRateForm(host);
}

// A small in-popup request form (no mail client): the request is sent to the
// site's own support inbox AND to TrustModel, so the company hears the demand.
function rateFormHtml(host) {
  return `
    <div class="vhint" style="margin-bottom:6px;">Ask the owner to get verified &mdash; your request goes to them and to TrustModel.</div>
    <div class="ws-row" style="margin-top:0;">
      <input class="ws-input" id="rate-email" type="email" placeholder="you@email.com" />
      <button class="ws-btn" id="rate-send">Send</button>
    </div>
    <div class="ws-err" id="rate-msg" data-host="${host}"></div>`;
}

function wireRateForm(host) {
  const btn = document.getElementById("rate-send");
  if (!btn || !host) return;
  btn.addEventListener("click", () => {
    const email = (document.getElementById("rate-email").value || "").trim();
    const msg = document.getElementById("rate-msg");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.style.color = "#dc2626";
      msg.textContent = "Enter a valid email.";
      return;
    }
    btn.textContent = "Sending…";
    btn.disabled = true;
    chrome.runtime.sendMessage({ action: "rateRequest", domain: host, email, kind: "rate" }, (resp) => {
      btn.textContent = "Send";
      btn.disabled = false;
      msg.style.color = resp && resp.ok ? "#15803d" : "#dc2626";
      msg.textContent = resp && resp.ok ? "Request sent. Thank you." : "Couldn't send. Please try again.";
    });
  });
}

// Owner "Get Verified" claim + the end-user request form. Hidden once a site is
// verified (nothing to ask for).
function buildVerify(name, host, score, verified) {
  if (!host) return "";
  if (verified) {
    return `
      <div class="verify">
        <div class="vtitle">Verified</div>
        <div class="ws-connected">✓ ${name} has a verified TrustModel evaluation.</div>
      </div>`;
  }
  const verifyUrl = `https://trustmodel.ai/get-verified?domain=${encodeURIComponent(host)}&src=ext`;
  return `
    <div class="verify">
      <div class="vtitle">Make this official</div>
      <a class="vbtn vprimary" href="${verifyUrl}" target="_blank">This is my site &mdash; Get Verified</a>
      ${rateFormHtml(host)}
    </div>`;
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
        <p><strong>${data.name}</strong> scored <strong>${data.score}/10</strong> &mdash; below the "Generally Safe" threshold of 6.0. See the verification options below.</p>
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
      <div style="font-size: 10px; color: #94a3b8; margin: 2px 0 6px;">${hostname} · ${String(data.type || "site").toUpperCase()}</div>
      <span class="tier-badge" style="background: ${tierBg}; color: ${tierText};">${data.tier}</span>${data.verified ? `<span class="prelim-badge" style="background:#dcfce7;color:#15803d;">✓ Verified</span>` : `<span class="prelim-badge">Preliminary</span>`}
    </div>
    ${data.verified ? "" : `<div class="disclaimer"><strong>Preliminary score.</strong> An outside-in estimate from public signals (privacy policy, trust center, security, public AI use) &mdash; not a verified TrustModel evaluation. It can change once ${data.name} completes verification.</div>`}
    ${risksHtml}
    ${posHtml}
    <div class="cta">
      ${ctaHtml}
      <div class="links">
        <a class="primary" href="${detailUrl}" target="_blank">Full Rankings</a>
        <a class="secondary" href="https://trustmodel.ai/leaderboard" target="_blank">All Categories</a>
      </div>
    </div>
    ${buildVerify(data.name, hostname, data.score, data.verified)}
  `;
  wireRateForm(hostname);
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

// ── Workspace: connect this extension to your org so IT sees your AI usage ──

function renderWorkspace(enr) {
  const el = document.getElementById("workspace");
  if (!el) return;

  if (enr && enr.ingestToken) {
    const org = enr.org || "your organization";
    const who = enr.email ? ` as ${enr.email}` : "";
    el.innerHTML =
      `<h3>Workspace</h3>` +
      `<div class="ws-connected">✓ Reporting to <span class="org">${org}</span>${who}</div>` +
      `<div class="ws-sub">Your AI usage is shared with your organization's TrustModel console.</div>` +
      `<div class="ws-row">` +
        `<button class="ws-btn" id="ws-report">Report now</button>` +
        (enr.managed ? "" : `<button class="ws-btn secondary" id="ws-disc">Disconnect</button>`) +
      `</div>`;
    const rep = document.getElementById("ws-report");
    if (rep)
      rep.addEventListener("click", () => {
        rep.textContent = "Reporting…";
        rep.disabled = true;
        chrome.runtime.sendMessage({ action: "reportNow" }, () => {
          rep.textContent = "Report now";
          rep.disabled = false;
        });
      });
    const disc = document.getElementById("ws-disc");
    if (disc)
      disc.addEventListener("click", () =>
        chrome.runtime.sendMessage({ action: "disconnectWorkspace" }, loadWorkspace),
      );
    return;
  }

  el.innerHTML =
    `<h3>Workspace</h3>` +
    `<div class="ws-note">Invited by your employer? Paste the code from your invite email to connect &mdash; ` +
    `your AI usage is then shared with your organization. Nothing is sent until you connect.</div>` +
    `<div class="ws-row">` +
      `<input class="ws-input" id="ws-code" placeholder="Invite code" />` +
      `<button class="ws-btn" id="ws-connect">Connect</button>` +
    `</div>` +
    `<div class="ws-err" id="ws-err"></div>`;
  const btn = document.getElementById("ws-connect");
  btn.addEventListener("click", () => {
    const code = document.getElementById("ws-code").value;
    document.getElementById("ws-err").textContent = "";
    btn.textContent = "Connecting…";
    btn.disabled = true;
    chrome.runtime.sendMessage({ action: "connectWorkspace", code }, (resp) => {
      btn.textContent = "Connect";
      btn.disabled = false;
      if (resp && resp.ok) loadWorkspace();
      else document.getElementById("ws-err").textContent = (resp && resp.error) || "Could not connect.";
    });
  });
}

function loadWorkspace() {
  chrome.runtime.sendMessage({ action: "getEnrollment" }, renderWorkspace);
}

loadWorkspace();
