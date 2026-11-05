/**
 * TrustModel — Workspace enrollment + reporting (v1.3, TRUS-2535)
 *
 * Turns the local-only Shadow-AI inventory into an org report when (and only
 * when) the extension is enrolled to a workspace. Two enrollment paths, one
 * connected behavior:
 *   • Managed (enterprise): IT pushes an ingest token via chrome.storage.managed
 *     — zero clicks.
 *   • Self-serve: the employee pastes the invite code from their email and we
 *     exchange it at /workforce/connect/ for an ingest token.
 *
 * Until enrolled, nothing is transmitted (the public listing stays local-only).
 * Loaded into the service worker via importScripts() AFTER ai-detect.js, whose
 * AI_SERVICES / SHADOW_KEY globals this reuses.
 */

const DEFAULT_API_BASE = "https://api.trustmodel.ai";
const ENROLL_KEY = "tmEnroll"; // { ingestToken, apiBase, email, org }
const SENT_KEY = "shadowAISent"; // { [serviceId]: hitsReportedSoFar } — the watermark

// Canonical destination host per AI service, chosen to match the backend
// catalog (shadow_ai.ai_catalog). Services the backend doesn't catalog are
// still sent and simply ignored server-side.
const REPORT_HOST = {
  openai: "chatgpt.com",
  "azure-openai": "openai.azure.com",
  anthropic: "claude.ai",
  "google-ai": "gemini.google.com",
  xai: "grok.com",
  mistral: "api.mistral.ai",
  cohere: "api.cohere.com",
  perplexity: "perplexity.ai",
  deepseek: "chat.deepseek.com",
  huggingface: "api-inference.huggingface.co",
  replicate: "api.replicate.com",
  together: "api.together.xyz",
  groq: "api.groq.com",
  copilot: "api.githubcopilot.com",
  "ms-copilot": "copilot.microsoft.com",
  elevenlabs: "api.elevenlabs.io",
  stability: "api.stability.ai",
  character: "character.ai",
  poe: "poe.com",
};

function getEnrollment(cb) {
  chrome.storage.local.get([ENROLL_KEY], (res) => cb(res[ENROLL_KEY] || null));
}

function saveEnrollment(enr, cb) {
  chrome.storage.local.set({ [ENROLL_KEY]: enr }, () => cb && cb(enr));
}

function disconnect(cb) {
  // Clearing the watermark too, so a later re-connect starts a fresh report.
  chrome.storage.local.remove([ENROLL_KEY, SENT_KEY], () => cb && cb({ ok: true }));
}

// Enterprise: adopt an ingest token pushed by IT via managed storage. Does not
// overwrite an existing self-serve enrollment.
function applyManagedConfig(cb) {
  if (!chrome.storage.managed) {
    cb && cb(false);
    return;
  }
  chrome.storage.managed.get(null, (mc) => {
    if (chrome.runtime.lastError || !mc || !mc.ingest_token) {
      cb && cb(false);
      return;
    }
    getEnrollment((existing) => {
      if (existing && existing.ingestToken) {
        cb && cb(false);
        return;
      }
      saveEnrollment(
        {
          ingestToken: mc.ingest_token,
          apiBase: mc.api_base || DEFAULT_API_BASE,
          email: mc.email || "",
          org: mc.org_id || "",
          managed: true,
        },
        () => cb && cb(true),
      );
    });
  });
}

// Self-serve: exchange the one-time invite code for a long-lived ingest token.
function connectWithInvite(inviteCode, apiBase, cb) {
  const base = apiBase || DEFAULT_API_BASE;
  const code = (inviteCode || "").trim();
  if (!code) {
    cb && cb({ ok: false, error: "Enter your invite code." });
    return;
  }
  fetch(`${base}/api/v1/shadow-ai/workforce/connect/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invite_token: code }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(r.status === 401 ? "Invalid or expired invite code." : `Connect failed (${r.status}).`);
      const d = await r.json();
      const enr = { ingestToken: d.ingest_token, apiBase: base, email: d.email, org: d.organization_id };
      saveEnrollment(enr, () => {
        cb && cb({ ok: true, enr });
        transmitNow(() => {}); // report whatever is already in the inventory
      });
    })
    .catch((e) => cb && cb({ ok: false, error: String(e.message || e) }));
}

// Send the hit-count DELTA per AI host since the last successful report, so the
// backend (which sums) never double-counts. The watermark only advances on a
// 2xx, so a failed/queued send is retried whole next time.
function transmitNow(cb) {
  getEnrollment((enr) => {
    if (!enr || !enr.ingestToken) {
      cb && cb({ skipped: "not_enrolled" });
      return;
    }
    chrome.storage.local.get([SHADOW_KEY, SENT_KEY], (res) => {
      const inv = res[SHADOW_KEY] || {};
      const sent = res[SENT_KEY] || {};
      const now = new Date().toISOString();
      const observations = [];
      const nextSent = { ...sent };
      for (const e of Object.values(inv)) {
        const host = REPORT_HOST[e.id];
        if (!host) continue;
        const delta = (e.hits || 0) - (sent[e.id] || 0);
        if (delta > 0) {
          observations.push({ host, observed_at: now, count: delta });
          nextSent[e.id] = e.hits;
        }
      }
      if (observations.length === 0) {
        cb && cb({ sent: 0 });
        return;
      }
      fetch(`${enr.apiBase}/api/v1/shadow-ai/endpoint/observations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${enr.ingestToken}`,
        },
        body: JSON.stringify({ observations }),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`ingest ${r.status}`);
          chrome.storage.local.set({ [SENT_KEY]: nextSent }, () =>
            cb && cb({ sent: observations.length }),
          );
        })
        .catch((e) => cb && cb({ error: String(e.message || e) }));
    });
  });
}
