/**
 * TrustModel — Shadow AI traffic detection (v1.1)
 *
 * Observes outbound requests to a CURATED list of external AI platforms/services
 * only — never all browsing traffic. Builds a local Shadow-AI inventory of which
 * AI services the browser talks to and from which pages, so IT can see unsanctioned
 * AI use. Loaded into the service worker via importScripts().
 *
 * Privacy: request bodies are never read. We record the AI service, the page origin
 * that initiated the call, a hit count, and timestamps. Nothing leaves the browser
 * unless enterprise reporting is explicitly configured (see REPORTING).
 */

// ── Curated AI endpoints. Keep in sync with host_permissions in manifest.json ──
// Each entry: { id, service, category, host } where host is tested against the
// request hostname. Match patterns (for the webRequest filter) are derived below.
const AI_SERVICES = [
  { id: "openai",      service: "OpenAI / ChatGPT",   category: "LLM API / chat", host: /(^|\.)openai\.com$|^chatgpt\.com$/ },
  { id: "azure-openai",service: "Azure OpenAI",        category: "LLM API",        host: /\.openai\.azure\.com$/ },
  { id: "anthropic",   service: "Anthropic / Claude",  category: "LLM API / chat", host: /(^|\.)anthropic\.com$|^claude\.ai$/ },
  { id: "google-ai",   service: "Google Gemini / Vertex", category: "LLM API / chat", host: /^generativelanguage\.googleapis\.com$|^aiplatform\.googleapis\.com$|^gemini\.google\.com$/ },
  { id: "xai",         service: "xAI / Grok",          category: "LLM API / chat", host: /(^|\.)x\.ai$|^grok\.com$/ },
  { id: "mistral",     service: "Mistral",             category: "LLM API",        host: /^api\.mistral\.ai$/ },
  { id: "cohere",      service: "Cohere",              category: "LLM API",        host: /^api\.cohere\.(ai|com)$/ },
  { id: "perplexity",  service: "Perplexity",          category: "AI search",      host: /(^|\.)perplexity\.ai$/ },
  { id: "deepseek",    service: "DeepSeek",            category: "LLM API / chat", host: /(^|\.)deepseek\.com$/ },
  { id: "huggingface", service: "Hugging Face",        category: "Model host",     host: /(^|\.)huggingface\.co$/ },
  { id: "replicate",   service: "Replicate",           category: "Model host",     host: /^api\.replicate\.com$/ },
  { id: "together",    service: "Together AI",         category: "LLM API",        host: /^api\.together\.(xyz|ai)$/ },
  { id: "groq",        service: "Groq",                category: "LLM API",        host: /^api\.groq\.com$/ },
  { id: "copilot",     service: "GitHub Copilot",      category: "Coding AI",      host: /\.githubcopilot\.com$/ },
  { id: "ms-copilot",  service: "Microsoft Copilot",   category: "Assistant",      host: /^copilot\.microsoft\.com$/ },
  { id: "elevenlabs",  service: "ElevenLabs",          category: "Voice AI",       host: /^api\.elevenlabs\.io$/ },
  { id: "stability",   service: "Stability AI",        category: "Image AI",       host: /^api\.stability\.ai$/ },
  { id: "character",   service: "Character.AI",        category: "Companion AI",   host: /(^|\.)character\.ai$/ },
  { id: "poe",         service: "Poe",                 category: "Chat aggregator",host: /(^|\.)poe\.com$/ },
];

// webRequest filter + host_permissions parity (hardcoded in manifest too).
const AI_MATCH_PATTERNS = [
  "*://*.openai.com/*", "*://chatgpt.com/*", "*://*.openai.azure.com/*",
  "*://*.anthropic.com/*", "*://claude.ai/*",
  "*://generativelanguage.googleapis.com/*", "*://aiplatform.googleapis.com/*", "*://gemini.google.com/*",
  "*://*.x.ai/*", "*://grok.com/*", "*://api.mistral.ai/*", "*://api.cohere.ai/*", "*://api.cohere.com/*",
  "*://*.perplexity.ai/*", "*://*.deepseek.com/*", "*://*.huggingface.co/*",
  "*://api.replicate.com/*", "*://api.together.xyz/*", "*://api.together.ai/*", "*://api.groq.com/*",
  "*://*.githubcopilot.com/*", "*://copilot.microsoft.com/*", "*://api.elevenlabs.io/*",
  "*://api.stability.ai/*", "*://*.character.ai/*", "*://*.poe.com/*",
];

function classifyAIRequest(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const s of AI_SERVICES) if (s.host.test(host)) return s;
  } catch {}
  return null;
}

function pageOriginOf(initiator, documentUrl) {
  const raw = initiator || documentUrl || "";
  try { return new URL(raw).origin; } catch { return raw || "unknown"; }
}

// ── Local Shadow-AI inventory in chrome.storage.local ──
// Shape: { [serviceId]: { id, service, category, hits, firstSeen, lastSeen, pages: {origin: count} } }
const SHADOW_KEY = "shadowAI";

function recordDetection(url, initiator, documentUrl) {
  const svc = classifyAIRequest(url);
  if (!svc) return;
  const origin = pageOriginOf(initiator, documentUrl);
  // Don't count the AI service's own first-party UI as "shadow" against itself.
  const now = Date.now();
  chrome.storage.local.get([SHADOW_KEY], (res) => {
    const inv = res[SHADOW_KEY] || {};
    const e = inv[svc.id] || { id: svc.id, service: svc.service, category: svc.category, hits: 0, firstSeen: now, pages: {} };
    e.hits += 1;
    e.lastSeen = now;
    if (origin && origin !== "unknown") e.pages[origin] = (e.pages[origin] || 0) + 1;
    inv[svc.id] = e;
    chrome.storage.local.set({ [SHADOW_KEY]: inv });
  });
}

function getShadowAI(cb) {
  chrome.storage.local.get([SHADOW_KEY], (res) => {
    const inv = res[SHADOW_KEY] || {};
    const list = Object.values(inv).sort((a, b) => b.lastSeen - a.lastSeen);
    cb({
      services: list,
      serviceCount: list.length,
      totalHits: list.reduce((n, e) => n + e.hits, 0),
    });
  });
}

function clearShadowAI(cb) {
  chrome.storage.local.set({ [SHADOW_KEY]: {} }, () => cb && cb({ ok: true }));
}
