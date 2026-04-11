/**
 * TrustModel Safety Check — Background Service Worker
 *
 * Matches the current website domain against the TrustModel score database.
 * Updates the extension badge with the trust score color.
 */

// ── Score Database (bundled — 281 systems mapped to domains) ──

const DOMAIN_SCORES = {
  // COTS / Enterprise Apps
  "workday.com": { name: "Workday", score: 5.2, tier: "Use With Caution", type: "cots", slug: "workday" },
  "sap.com": { name: "SAP SuccessFactors", score: 5.7, tier: "Use With Caution", type: "cots", slug: "sap-successfactors" },
  "salesforce.com": { name: "Salesforce", score: 8.1, tier: "Highly Trusted", type: "cots", slug: "salesforce" },
  "hubspot.com": { name: "HubSpot", score: 8.5, tier: "Highly Trusted", type: "cots", slug: "hubspot" },
  "atlassian.com": { name: "Jira / Atlassian", score: 8.5, tier: "Highly Trusted", type: "cots", slug: "jira" },
  "zendesk.com": { name: "Zendesk", score: 8.0, tier: "Highly Trusted", type: "cots", slug: "zendesk" },
  "servicenow.com": { name: "ServiceNow", score: 7.1, tier: "Generally Safe", type: "cots", slug: "servicenow" },
  "intercom.com": { name: "Intercom", score: 8.5, tier: "Highly Trusted", type: "cots", slug: "intercom" },
  "adp.com": { name: "ADP", score: 5.7, tier: "Use With Caution", type: "cots", slug: "adp" },
  "ukg.com": { name: "UKG", score: 5.7, tier: "Use With Caution", type: "cots", slug: "ukg" },
  "paychex.com": { name: "Paychex", score: 5.7, tier: "Use With Caution", type: "cots", slug: "paychex" },
  "bamboohr.com": { name: "BambooHR", score: 7.2, tier: "Generally Safe", type: "cots", slug: "bamboohr" },
  "rippling.com": { name: "Rippling", score: 5.0, tier: "Use With Caution", type: "cots", slug: "rippling" },
  "gusto.com": { name: "Gusto", score: 6.8, tier: "Generally Safe", type: "cots", slug: "gusto" },
  "greenhouse.com": { name: "Greenhouse", score: 7.5, tier: "Generally Safe", type: "cots", slug: "greenhouse" },
  "lever.co": { name: "Lever", score: 7.2, tier: "Generally Safe", type: "cots", slug: "lever" },
  "icims.com": { name: "iCIMS", score: 7.1, tier: "Generally Safe", type: "cots", slug: "icims" },
  "oracle.com": { name: "Oracle HCM", score: 5.9, tier: "Use With Caution", type: "cots", slug: "netsuite" },
  "netsuite.com": { name: "NetSuite", score: 5.9, tier: "Use With Caution", type: "cots", slug: "netsuite" },
  "intuit.com": { name: "QuickBooks / Intuit", score: 7.4, tier: "Generally Safe", type: "cots", slug: "quickbooks" },
  "quickbooks.intuit.com": { name: "QuickBooks", score: 7.4, tier: "Generally Safe", type: "cots", slug: "quickbooks" },
  "xero.com": { name: "Xero", score: 7.5, tier: "Generally Safe", type: "cots", slug: "xero" },
  "freshbooks.com": { name: "FreshBooks", score: 7.1, tier: "Generally Safe", type: "cots", slug: "freshbooks" },
  "freshworks.com": { name: "Freshdesk", score: 7.2, tier: "Generally Safe", type: "cots", slug: "freshdesk" },
  "freshdesk.com": { name: "Freshdesk", score: 7.2, tier: "Generally Safe", type: "cots", slug: "freshdesk" },
  "pipedrive.com": { name: "Pipedrive", score: 6.6, tier: "Generally Safe", type: "cots", slug: "pipedrive" },
  "close.com": { name: "Close", score: 6.6, tier: "Generally Safe", type: "cots", slug: "close" },
  "copper.com": { name: "Copper", score: 6.0, tier: "Generally Safe", type: "cots", slug: "copper" },
  "linear.app": { name: "Linear", score: 7.9, tier: "Generally Safe", type: "cots", slug: "linear" },
  "asana.com": { name: "Asana", score: 8.0, tier: "Highly Trusted", type: "cots", slug: "asana" },
  "clickup.com": { name: "ClickUp", score: 7.4, tier: "Generally Safe", type: "cots", slug: "clickup" },
  "notion.so": { name: "Notion", score: 5.6, tier: "Use With Caution", type: "cots", slug: "notion" },
  "box.com": { name: "Box", score: 8.1, tier: "Highly Trusted", type: "cots", slug: "box" },
  "dropbox.com": { name: "Dropbox", score: 6.8, tier: "Generally Safe", type: "cots", slug: "dropbox" },
  "mailchimp.com": { name: "Mailchimp", score: 6.7, tier: "Generally Safe", type: "cots", slug: "mailchimp" },
  "klaviyo.com": { name: "Klaviyo", score: 7.2, tier: "Generally Safe", type: "cots", slug: "klaviyo" },
  "activecampaign.com": { name: "ActiveCampaign", score: 7.2, tier: "Generally Safe", type: "cots", slug: "activecampaign" },
  "sage.com": { name: "Sage", score: 5.7, tier: "Use With Caution", type: "cots", slug: "sage" },
  "cal.com": { name: "Cal.com", score: 5.6, tier: "Use With Caution", type: "cots", slug: "calcom" },

  // AI Model Companies
  "openai.com": { name: "OpenAI (GPT-5)", score: 8.9, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "chat.openai.com": { name: "ChatGPT", score: 8.9, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "chatgpt.com": { name: "ChatGPT", score: 8.9, tier: "Highly Trusted", type: "model", slug: "gpt-5" },
  "anthropic.com": { name: "Anthropic (Claude)", score: 8.5, tier: "Highly Trusted", type: "model", slug: "claude-sonnet-45" },
  "claude.ai": { name: "Claude", score: 8.5, tier: "Highly Trusted", type: "model", slug: "claude-sonnet-45" },
  "gemini.google.com": { name: "Gemini", score: 9.0, tier: "Highly Trusted", type: "model", slug: "gemini-25-pro" },
  "deepmind.google": { name: "Google DeepMind", score: 9.0, tier: "Highly Trusted", type: "model", slug: "gemini-25-pro" },
  "x.ai": { name: "xAI (Grok)", score: 8.3, tier: "Highly Trusted", type: "model", slug: "grok-4" },
  "meta.ai": { name: "Meta (Llama)", score: 8.3, tier: "Highly Trusted", type: "model", slug: "llama-4-maverick" },
  "mistral.ai": { name: "Mistral", score: 8.1, tier: "Highly Trusted", type: "model", slug: "medium-31" },
  "perplexity.ai": { name: "Perplexity", score: 8.1, tier: "Highly Trusted", type: "model", slug: "sonar-reasoning-pro" },
  "deepseek.com": { name: "DeepSeek", score: 7.9, tier: "Generally Safe", type: "model", slug: "r1-0528" },

  // HR AI Vendors (from benchmark)
  "hirevue.com": { name: "HireVue", score: 7.4, tier: "Generally Safe", type: "cots", slug: "hirevue" },
  "eightfold.ai": { name: "Eightfold.ai", score: 5.5, tier: "Use With Caution", type: "cots", slug: "eightfold" },
  "beamery.com": { name: "Beamery TalentGPT", score: 6.4, tier: "Generally Safe", type: "cots", slug: "beamery" },
  "phenom.com": { name: "Phenom People AI", score: 6.2, tier: "Generally Safe", type: "cots", slug: "phenom" },
  "seekout.com": { name: "SeekOut AI", score: 6.2, tier: "Generally Safe", type: "cots", slug: "seekout" },
  "paradox.ai": { name: "Paradox Olivia", score: 5.9, tier: "Use With Caution", type: "cots", slug: "paradox" },
  "harver.com": { name: "Pymetrics (Harver)", score: 7.7, tier: "Generally Safe", type: "cots", slug: "harver" },

  // MCP Server Repos (GitHub pages)
  "stripe.com": { name: "Stripe", score: 4.5, tier: "Use With Caution", type: "mcp", slug: "stripe" },
  "cloudflare.com": { name: "Cloudflare", score: 4.5, tier: "Use With Caution", type: "mcp", slug: "cloudflare" },
  "databricks.com": { name: "Databricks", score: 6.6, tier: "Generally Safe", type: "mcp", slug: "databricks" },
  "snowflake.com": { name: "Snowflake", score: 7.6, tier: "Generally Safe", type: "mcp", slug: "snowflake" },
  "grafana.com": { name: "Grafana", score: 7.6, tier: "Generally Safe", type: "mcp", slug: "grafana" },
  "sentry.io": { name: "Sentry", score: 7.6, tier: "Generally Safe", type: "mcp", slug: "sentry" },
  "figma.com": { name: "Figma", score: 6.8, tier: "Generally Safe", type: "mcp", slug: "figma" },
  "supabase.com": { name: "Supabase", score: 4.8, tier: "Use With Caution", type: "mcp", slug: "supabase" },
  "mongodb.com": { name: "MongoDB", score: 4.8, tier: "Use With Caution", type: "mcp", slug: "mongodb" },
  "auth0.com": { name: "Auth0", score: 4.1, tier: "Use With Caution", type: "mcp", slug: "auth0" },
  "drata.com": { name: "Drata", score: 6.4, tier: "Generally Safe", type: "mcp", slug: "drata" },
};

// ── Badge color logic ──

function getBadgeColor(score) {
  if (score >= 8.0) return "#22c55e"; // green
  if (score >= 6.0) return "#a3e635"; // lime
  if (score >= 4.0) return "#f59e0b"; // amber
  if (score >= 2.0) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getBadgeText(score) {
  if (score >= 8.0) return "✓";
  if (score >= 6.0) return "~";
  if (score >= 4.0) return "!";
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

// ── Update badge when tab changes ──

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const data = lookupDomain(tab.url);
    if (data) {
      chrome.action.setBadgeText({ tabId, text: data.score.toString() });
      chrome.action.setBadgeBackgroundColor({ tabId, color: getBadgeColor(data.score) });
      chrome.action.setTitle({ tabId, title: `TrustScore: ${data.score}/10 — ${data.tier}` });
    } else {
      chrome.action.setBadgeText({ tabId, text: "" });
      chrome.action.setTitle({ tabId, title: "TrustModel Safety Check — No score for this site" });
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const data = lookupDomain(tab.url);
      if (data) {
        chrome.action.setBadgeText({ tabId: tab.id, text: data.score.toString() });
        chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: getBadgeColor(data.score) });
      } else {
        chrome.action.setBadgeText({ tabId: tab.id, text: "" });
      }
    }
  } catch {}
});

// ── Message handler for popup ──

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getScore") {
    const data = lookupDomain(request.url);
    sendResponse(data);
  }
  return true;
});
