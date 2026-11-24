/**
 * TrustModel Safety Check — Background Service Worker
 *
 * Matches the current website domain against the TrustModel score database.
 * Updates the extension badge with the trust score color.
 */

// ── Shadow AI traffic detection (watches outbound calls to known AI platforms) ──
importScripts("ai-detect.js");
// ── Workspace enrollment + reporting (only transmits when enrolled) ──
importScripts("enroll.js");

// ── Score Database (bundled — 281 systems mapped to domains) ──

const DOMAIN_SCORES = {
  // COTS / Enterprise Apps
  "workday.com": { name: "Workday", score: 52.0, tier: "Use With Caution", type: "cots", slug: "workday" },
  "sap.com": { name: "SAP SuccessFactors", score: 57.0, tier: "Use With Caution", type: "cots", slug: "sap-successfactors" },
  "salesforce.com": { name: "Salesforce", score: 81.0, tier: "Highly Trusted", type: "cots", slug: "salesforce" },
  "hubspot.com": { name: "HubSpot", score: 85.0, tier: "Highly Trusted", type: "cots", slug: "hubspot" },
  "atlassian.com": { name: "Jira / Atlassian", score: 85.0, tier: "Highly Trusted", type: "cots", slug: "jira" },
  "zendesk.com": { name: "Zendesk", score: 80.0, tier: "Highly Trusted", type: "cots", slug: "zendesk" },
  "servicenow.com": { name: "ServiceNow", score: 71.0, tier: "Generally Safe", type: "cots", slug: "servicenow" },
  "intercom.com": { name: "Intercom", score: 85.0, tier: "Highly Trusted", type: "cots", slug: "intercom" },
  "adp.com": { name: "ADP", score: 57.0, tier: "Use With Caution", type: "cots", slug: "adp" },
  "ukg.com": { name: "UKG", score: 57.0, tier: "Use With Caution", type: "cots", slug: "ukg" },
  "paychex.com": { name: "Paychex", score: 57.0, tier: "Use With Caution", type: "cots", slug: "paychex" },
  "bamboohr.com": { name: "BambooHR", score: 72.0, tier: "Generally Safe", type: "cots", slug: "bamboohr" },
  "rippling.com": { name: "Rippling", score: 50.0, tier: "Use With Caution", type: "cots", slug: "rippling" },
  "gusto.com": { name: "Gusto", score: 68.0, tier: "Generally Safe", type: "cots", slug: "gusto" },
  "greenhouse.com": { name: "Greenhouse", score: 75.0, tier: "Generally Safe", type: "cots", slug: "greenhouse" },
  "lever.co": { name: "Lever", score: 72.0, tier: "Generally Safe", type: "cots", slug: "lever" },
  "icims.com": { name: "iCIMS", score: 71.0, tier: "Generally Safe", type: "cots", slug: "icims" },
  "oracle.com": { name: "Oracle HCM", score: 59.0, tier: "Use With Caution", type: "cots", slug: "netsuite" },
  "netsuite.com": { name: "NetSuite", score: 59.0, tier: "Use With Caution", type: "cots", slug: "netsuite" },
  "intuit.com": { name: "QuickBooks / Intuit", score: 74.0, tier: "Generally Safe", type: "cots", slug: "quickbooks" },
  "quickbooks.intuit.com": { name: "QuickBooks", score: 74.0, tier: "Generally Safe", type: "cots", slug: "quickbooks" },
  "xero.com": { name: "Xero", score: 75.0, tier: "Generally Safe", type: "cots", slug: "xero" },
  "freshbooks.com": { name: "FreshBooks", score: 71.0, tier: "Generally Safe", type: "cots", slug: "freshbooks" },
  "freshworks.com": { name: "Freshdesk", score: 72.0, tier: "Generally Safe", type: "cots", slug: "freshdesk" },
  "freshdesk.com": { name: "Freshdesk", score: 72.0, tier: "Generally Safe", type: "cots", slug: "freshdesk" },
  "pipedrive.com": { name: "Pipedrive", score: 66.0, tier: "Generally Safe", type: "cots", slug: "pipedrive" },
  "close.com": { name: "Close", score: 66.0, tier: "Generally Safe", type: "cots", slug: "close" },
  "copper.com": { name: "Copper", score: 60.0, tier: "Generally Safe", type: "cots", slug: "copper" },
  "linear.app": { name: "Linear", score: 79.0, tier: "Generally Safe", type: "cots", slug: "linear" },
  "asana.com": { name: "Asana", score: 80.0, tier: "Highly Trusted", type: "cots", slug: "asana" },
  "clickup.com": { name: "ClickUp", score: 74.0, tier: "Generally Safe", type: "cots", slug: "clickup" },
  "notion.so": { name: "Notion", score: 56.0, tier: "Use With Caution", type: "cots", slug: "notion" },
  "box.com": { name: "Box", score: 81.0, tier: "Highly Trusted", type: "cots", slug: "box" },
  "dropbox.com": { name: "Dropbox", score: 68.0, tier: "Generally Safe", type: "cots", slug: "dropbox" },
  "mailchimp.com": { name: "Mailchimp", score: 67.0, tier: "Generally Safe", type: "cots", slug: "mailchimp" },
  "klaviyo.com": { name: "Klaviyo", score: 72.0, tier: "Generally Safe", type: "cots", slug: "klaviyo" },
  "activecampaign.com": { name: "ActiveCampaign", score: 72.0, tier: "Generally Safe", type: "cots", slug: "activecampaign" },
  "sage.com": { name: "Sage", score: 57.0, tier: "Use With Caution", type: "cots", slug: "sage" },
  "cal.com": { name: "Cal.com", score: 56.0, tier: "Use With Caution", type: "cots", slug: "calcom" },

  // AI Model Companies
  "openai.com": { name: "OpenAI (GPT-5)", score: 89.0, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "chat.openai.com": { name: "ChatGPT", score: 89.0, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "chatgpt.com": { name: "ChatGPT", score: 89.0, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "anthropic.com": { name: "Anthropic (Claude)", score: 85.0, tier: "Highly Trusted", type: "model", slug: "claude-sonnet-45" },
  "claude.ai": { name: "Claude", score: 85.0, tier: "Highly Trusted", type: "model", slug: "claude-sonnet-45" },
  "gemini.google.com": { name: "Gemini", score: 90.0, tier: "Highly Trusted", type: "model", slug: "gemini-25-pro" },
  "deepmind.google": { name: "Google DeepMind", score: 90.0, tier: "Highly Trusted", type: "model", slug: "gemini-25-pro" },
  "x.ai": { name: "xAI (Grok)", score: 83.0, tier: "Highly Trusted", type: "model", slug: "grok-4" },
  "meta.ai": { name: "Meta (Llama)", score: 83.0, tier: "Highly Trusted", type: "model", slug: "llama-4-maverick" },
  "mistral.ai": { name: "Mistral", score: 81.0, tier: "Highly Trusted", type: "model", slug: "medium-31" },
  "perplexity.ai": { name: "Perplexity", score: 81.0, tier: "Highly Trusted", type: "model", slug: "sonar-reasoning-pro" },
  "deepseek.com": { name: "DeepSeek", score: 79.0, tier: "Generally Safe", type: "model", slug: "r1-0528" },

  // HR AI Vendors (from benchmark)
  "hirevue.com": { name: "HireVue", score: 74.0, tier: "Generally Safe", type: "cots", slug: "hirevue" },
  "eightfold.ai": { name: "Eightfold.ai", score: 55.0, tier: "Use With Caution", type: "cots", slug: "eightfold" },
  "beamery.com": { name: "Beamery TalentGPT", score: 64.0, tier: "Generally Safe", type: "cots", slug: "beamery" },
  "phenom.com": { name: "Phenom People AI", score: 62.0, tier: "Generally Safe", type: "cots", slug: "phenom" },
  "seekout.com": { name: "SeekOut AI", score: 62.0, tier: "Generally Safe", type: "cots", slug: "seekout" },
  "paradox.ai": { name: "Paradox Olivia", score: 59.0, tier: "Use With Caution", type: "cots", slug: "paradox" },
  "harver.com": { name: "Pymetrics (Harver)", score: 77.0, tier: "Generally Safe", type: "cots", slug: "harver" },

  // MCP Server Repos (GitHub pages)
  "stripe.com": { name: "Stripe", score: 45.0, tier: "Use With Caution", type: "mcp", slug: "stripe" },
  "cloudflare.com": { name: "Cloudflare", score: 45.0, tier: "Use With Caution", type: "mcp", slug: "cloudflare" },
  "databricks.com": { name: "Databricks", score: 66.0, tier: "Generally Safe", type: "mcp", slug: "databricks" },
  "snowflake.com": { name: "Snowflake", score: 76.0, tier: "Generally Safe", type: "mcp", slug: "snowflake" },
  "grafana.com": { name: "Grafana", score: 76.0, tier: "Generally Safe", type: "mcp", slug: "grafana" },
  "sentry.io": { name: "Sentry", score: 76.0, tier: "Generally Safe", type: "mcp", slug: "sentry" },
  "figma.com": { name: "Figma", score: 68.0, tier: "Generally Safe", type: "mcp", slug: "figma" },
  "supabase.com": { name: "Supabase", score: 48.0, tier: "Use With Caution", type: "mcp", slug: "supabase" },
  "mongodb.com": { name: "MongoDB", score: 48.0, tier: "Use With Caution", type: "mcp", slug: "mongodb" },
  "auth0.com": { name: "Auth0", score: 41.0, tier: "Use With Caution", type: "mcp", slug: "auth0" },
  "drata.com": { name: "Drata", score: 64.0, tier: "Generally Safe", type: "mcp", slug: "drata" },
};

// ── Badge color logic ──

function getBadgeColor(score) {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 65) return "#a3e635"; // lime
  if (score >= 50) return "#f59e0b"; // amber
  if (score >= 30) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getBadgeText(score) {
  if (score >= 80) return "✓";
  if (score >= 65) return "~";
  if (score >= 50) return "!";
  return "✗";
}

// ── Match domain to score ──

function lookupDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");

    // Direct match
    if (DOMAIN_SCORES[hostname]) return DOMAIN_SCORES[hostname];

    // Try parent domain (e.g., app.salesforce.com → salesforce.com)
    const parts = hostname.split(".");
    if (parts.length > 2) {
      const parent = parts.slice(-2).join(".");
      if (DOMAIN_SCORES[parent]) return DOMAIN_SCORES[parent];
    }

    return null;
  } catch {
    return null;
  }
}

// ── Live preliminary TrustScore for ANY site (TRUS-2549) ──
// Calls the public scan-on-demand oracle; caches per host; falls back to the
// bundled static table offline or when a site can't be assessed.
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
  // Cache strategy:
  //   - API-sourced entries: cached for SCORE_TTL_MS (6h) — identical to what
  //     the supply-chain console shows for the same domain.
  //   - Static-DB fallback: used ONLY when the API is unreachable AND no
  //     API-sourced cache entry exists. Never cached, so the next online
  //     request always wins with the live score.

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
        // API unreachable (offline / timeout) — fall back to static DB without
        // caching the API source, so the next online request always gets the live score.
        const fallback = lookupDomain(url);
        if (fallback && host) {
          // Write to score:<host> so the popup can read it from storage if the
          // SW is dead when the popup opens (MV3 blank popup fix).
          chrome.storage.local.set({ [key]: { at: Date.now(), source: "static", data: fallback } });
        }
        cb(fallback);
      });
  });
}

// ── Update badge when tab changes ──

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    fetchSiteScore(tab.url, (data) => {
      if (data) {
        chrome.action.setBadgeText({ tabId, text: String(data.score) });
        chrome.action.setBadgeBackgroundColor({ tabId, color: getBadgeColor(data.score) });
        chrome.action.setTitle({ tabId, title: `TrustScore: ${data.score}/100 — ${data.tier}` });
        // Store by tabId so popup can read it without needing the tabs permission
        chrome.storage.local.set({ ["tab:" + tabId]: { data, url: tab.url } });
      } else {
        chrome.action.setBadgeText({ tabId, text: "" });
        chrome.action.setTitle({ tabId, title: "TrustModel Safety Check — No score yet for this site" });
      }
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
    // A page load is counted once, by the content script's recordPageVisit.
    // Counting its main_frame request here as well counted each visit twice
    // (TRUS-2621).
    if (details.type === "main_frame") return;
    recordDetection(details.url, details.initiator, details.documentUrl);
  },
  { urls: AI_MATCH_PATTERNS },
  []
);

// ── Message handler for popup ──

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getScore") {
    fetchSiteScore(request.url, (data) => {
      // Write by tabId so popup can read it without needing tab.url.
      // This fires at exactly the same moment as the badge — guaranteed.
      if (data && sender && sender.tab && sender.tab.id) {
        chrome.storage.local.set({ ["tab:" + sender.tab.id]: { data, url: request.url } });
      }
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
      const toRemove = Object.keys(all).filter(k => k.startsWith("score:"));
      if (toRemove.length) chrome.storage.local.remove(toRemove);
    });
  }
  tmBootstrapReporting();
});
chrome.runtime.onStartup.addListener(tmBootstrapReporting);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "tm-report") transmitNow(() => {});
});
