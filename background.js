/**
 * TrustModel Safety Check — Background Service Worker
 *
 * Looks up the live TrustScore for the current site (TRUS-2549) and updates
 * the extension badge with the trust score color.
 */

// ── Shadow AI traffic detection (watches outbound calls to known AI platforms) ──
importScripts("ai-detect.js");
// ── Workspace enrollment + reporting (only transmits when enrolled) ──
importScripts("enroll.js");

// ── Badge color logic ──

// The same bands and colours as the popup and the floating badge, which follow
// the published tiers (A 90+, B 75-89, C 65-74, D 50-64, F <50). The toolbar
// used 80/65/50/30, so a 78 was lime here and blue elsewhere (TRUS-2623).
function getBadgeColor(score) {
  if (score >= 90) return "#22c55e"; // green  — Exemplary
  if (score >= 75) return "#3b82f6"; // blue   — Trustworthy
  if (score >= 65) return "#a3e635"; // lime   — Needs Attention
  if (score >= 50) return "#f59e0b"; // amber  — Use With Caution
  return "#ef4444"; // red — High Risk
}

function getBadgeText(score) {
  if (score >= 80) return "✓";
  if (score >= 65) return "~";
  if (score >= 50) return "!";
  return "✗";
}

// ── Live preliminary TrustScore for ANY site (TRUS-2549) ──
// Calls the public scan-on-demand oracle and caches per host. There is no
// offline fallback: a stale bundled score contradicted the live one (TRUS-2620).
const TM_API_BASE = "https://api.trustmodel.ai";
const SCORE_TTL_MS = 6 * 60 * 60 * 1000;

function gradeTier(grade, verified) {
  // Maps API letter grade to the canonical tier labels published on trustmodel.ai/agentcert
  if (verified)      return "Verified";
  if (grade === "A") return "Exemplary";        // 90-100
  if (grade === "B") return "Trustworthy";      // 75-89
  if (grade === "C") return "Needs Attention";  // 65-74
  if (grade === "D") return "Use With Caution"; // 50-64
  if (grade === "F") return "High Risk";        // <50
  return "Preliminary";
}

function fetchSiteScore(url, cb) {
  // Single source of truth: the same /v1/public/site-score/ endpoint used by
  // the supply-chain console and the Chrome extension preliminary scanner.
  // All three surfaces (toolbar badge, bottom-right badge, popup) call this
  // function, so they always return the same number from the same source.
  //
  // Cache strategy: API-sourced entries are cached for SCORE_TTL_MS (6h) —
  // identical to what the supply-chain console shows for the same domain.
  //
  // cb(data, status): data is null when there's no score; status is
  // "unavailable" when the API couldn't be reached or refused (429, 5xx,
  // timeout), so callers can say so instead of showing a number (TRUS-2620).

  let host;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { cb(null); return; }
  if (!host || /(^|\.)trustmodel\.ai$/.test(host)) { cb(null); return; }

  const key = "score:" + host;
  chrome.storage.local.get([key], (res) => {
    const cached = res[key];
    // Only serve cache if it came from the live API (source === "api")
    // and hasn't expired. Static-DB entries are never cached, so they
    // never block a fresh API fetch.
    if (cached && (cached.source === "api" || !cached.source) && Date.now() - cached.at < SCORE_TTL_MS) {
      cb(cached.data);
      return; // cache hit — popup.js reads score:<host> directly, no extra write needed
    }

    fetch(`${TM_API_BASE}/v1/public/site-score/${encodeURIComponent(host)}/`, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j) => {
        let data;
        if (j && j.assessed && j.trust_score != null) {
          const verified = j.score_tier === "verified" || j.score_tier === "monitored";
          data = {
            name:        j.name || host,
            score:       Math.round(Number(j.trust_score)), // 0-100 — supply-chain canonical
            grade:       j.grade || "",
            tier:        gradeTier(j.grade, verified),
            type:        "site",
            verified,
            preliminary: !verified,
          };
          // Cache API result — this is the shared truth across all three surfaces
          // score:<host> is the single cache key — popup.js reads it directly
          // from storage without a SW round-trip (MV3 blank popup fix).
          chrome.storage.local.set({ [key]: { at: Date.now(), source: "api", data } });
        } else {
          // Site is reachable but unassessed — no score to show
          data = null;
        }
        cb(data);
      })
      .catch(() => {
        // API unreachable, rate-limited or erroring: no number at all. The
        // bundled table used to stand in here with a different, stale score
        // (openai.com 89 "Highly Trusted" against a live 52/D) (TRUS-2620).
        cb(null, "unavailable");
      });
  });
}

// ── What the popup shows for each tab (TRUS-2620) ──
// The popup reads tab:<id> (it has no tabs permission). The entry used to
// outlive the page it was written for, so after navigating, the popup showed
// the previous site's score. Now it is removed when a new page starts loading
// or the tab closes, every result is recorded (including "no score" and
// "unavailable"), and a lookup that finishes after the tab has moved on is
// not recorded.
const tabNav = {}; // tabId → page loads seen; in memory, so lost on SW restart

function rememberTab(tabId, nav, url, data, status) {
  if (!tabId || tabNav[tabId] !== nav) return;
  chrome.storage.local.set({
    ["tab:" + tabId]: { data: data || null, url, unavailable: status === "unavailable" },
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabNav[tabId];
  chrome.storage.local.remove("tab:" + tabId);
});

// ── Update badge when tab changes ──

function paintBadge(tabId, data) {
  if (!tabId) return;
  if (data) {
    chrome.action.setBadgeText({ tabId, text: String(data.score) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: getBadgeColor(data.score) });
    chrome.action.setTitle({ tabId, title: `TrustScore: ${data.score}/100 — ${data.tier}` });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
    chrome.action.setTitle({ tabId, title: "TrustModel Safety Check — No score yet for this site" });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    tabNav[tabId] = (tabNav[tabId] || 0) + 1;
    chrome.storage.local.remove("tab:" + tabId);
  }
  if (changeInfo.status === "complete" && tab.url) {
    const nav = tabNav[tabId];
    fetchSiteScore(tab.url, (data, status) => {
      rememberTab(tabId, nav, tab.url, data, status);
      paintBadge(tabId, data);
    });
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      fetchSiteScore(tab.url, (data) => {
        if (data) {
          chrome.action.setBadgeText({ tabId: tab.id, text: String(data.score) });
          chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: getBadgeColor(data.score) });
        } else {
          chrome.action.setBadgeText({ tabId: tab.id, text: "" });
        }
      });
    }
  } catch {}
});

// ── Shadow AI: observe outbound traffic to the curated AI endpoints only ──
// (No request bodies are read; detection is metadata only — see ai-detect.js.)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    recordDetection(details.url, details.initiator, details.documentUrl);
  },
  { urls: AI_MATCH_PATTERNS },
  []
);

// ── Message handler for popup ──

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getScore") {
    const tabId = sender && sender.tab && sender.tab.id;
    const nav = tabNav[tabId];
    fetchSiteScore(request.url, (data, status) => {
      // Write by tabId so popup can read it without needing tab.url.
      rememberTab(tabId, nav, request.url, data, status);
      // The toolbar badge too: tabs.onUpdated only sees tab.url on the AI
      // hosts we have permission for, so on every other site the toolbar
      // stayed blank (TRUS-2623). Skipped if the tab has moved on.
      if (tabId && tabNav[tabId] === nav) paintBadge(tabId, data);
      sendResponse(data);
    });
    return true;
  }
  // End-user "rate/verify this site" request → backend emails us + the site's
  // own support inbox (TRUS-2549). Replaces the mailto flow.
  if (request.action === "rateRequest") {
    fetch(`${TM_API_BASE}/v1/public/rate-request/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: request.domain,
        requester_email: request.email,
        kind: request.kind || "rate",
        message: request.message || "",
      }),
    })
      .then((r) => sendResponse({ ok: r.ok }))
      .catch(() => sendResponse({ ok: false }));
    return true; // async
  }
  if (request.action === "getShadowAI") {
    getShadowAI(sendResponse);
    return true; // async response
  }
  if (request.action === "clearShadowAI") {
    clearShadowAI(sendResponse);
    return true; // async response
  }
  // Reliable per-page Shadow-AI detection from the content script (SW-lifecycle
  // independent). recordDetection ignores non-AI hosts.
  // Open the action popup programmatically (MV3, Chrome 127+).
  // Called when the user clicks the bottom-right badge — same result as
  // clicking the toolbar icon.
  if (request.action === "openPopup") {
    if (chrome.action.openPopup) {
      chrome.action.openPopup()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
    } else {
      sendResponse({ ok: false }); // Chrome <127 fallback handled in content.js
    }
    return true;
  }
  // Keep-alive ping from the popup so the service worker stays alive.
  if (request.action === "ping") {
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === "recordPageVisit") {
    const src = (sender && sender.tab && sender.tab.url) || request.url;
    recordDetection(request.url, src, request.url);
    sendResponse({ ok: true });
    return true;
  }
  // ── Workspace enrollment (TRUS-2535) ──
  if (request.action === "getEnrollment") {
    getEnrollment((enr) => sendResponse(enr));
    return true;
  }
  if (request.action === "connectWorkspace") {
    connectWithInvite(request.code, request.apiBase, sendResponse);
    return true;
  }
  if (request.action === "disconnectWorkspace") {
    disconnect(sendResponse);
    return true;
  }
  if (request.action === "reportNow") {
    transmitNow(sendResponse);
    return true;
  }
  return true;
});

// ── Enrollment lifecycle: adopt managed config, then report on a schedule ──
function tmBootstrapReporting() {
  applyManagedConfig(() => {});
  chrome.alarms.create("tm-report", { periodInMinutes: 15 });
}
chrome.runtime.onInstalled.addListener((details) => {
  // On update: flush the score cache so any stale 0-10 entries from prior
  // versions are replaced by fresh 0-100 scores from the live API.
  if (details.reason === "update") {
    chrome.storage.local.get(null, (all) => {
      // tab:<id> entries were never cleared before TRUS-2620, so drop those too.
      // cs:<host> was written on every scored page and never read (TRUS-2624).
      const toRemove = Object.keys(all).filter(
        (k) => k.startsWith("score:") || k.startsWith("tab:") || k.startsWith("cs:"),
      );
      if (toRemove.length) chrome.storage.local.remove(toRemove);
    });
  }
  tmBootstrapReporting();
});
chrome.runtime.onStartup.addListener(tmBootstrapReporting);

// score:<host> entries past their TTL are never served again, but they were
// never removed either, so local storage grew into a list of every site
// visited (TRUS-2624). Pruned on startup and with the 15-minute alarm.
function pruneScoreCache() {
  chrome.storage.local.get(null, (all) => {
    const now = Date.now();
    const stale = Object.keys(all).filter(
      (k) => k.startsWith("score:") && !(all[k] && now - all[k].at < SCORE_TTL_MS),
    );
    if (stale.length) chrome.storage.local.remove(stale);
  });
}
chrome.runtime.onStartup.addListener(pruneScoreCache);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tm-report") {
    transmitNow(() => {});
    pruneScoreCache();
  }
});
