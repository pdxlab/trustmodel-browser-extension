# Chrome Web Store — Listing Package (TrustModel Safety Check)

Everything needed to submit. Upload the zip of the build in `manifest.json`, then paste the fields below into the Chrome Web Store Developer Dashboard. The disclosures below were updated for TRUS-2617 / TRUS-2621 (Nov 2026); keep them in step with `privacy-policy.html` and the code.

---

## Store listing fields

**Name**
TrustModel Safety Check

**Summary** (short description, ≤132 chars)
Independent TrustScores for the AI you use, plus Shadow-AI detection — see which external AI platforms your browser talks to.

**Category**
Productivity   (alternate: Developer Tools)

**Language**
English (United States)

**Detailed description**
```
TrustModel Safety Check puts an independent trust rating on the AI you use — and shows you the AI you didn't know you were using.

TRUSTSCORE FOR THE SITES YOU USE
As you browse, the extension shows an independent 0–100 TrustScore for the website you're on — the same ratings published at trustmodel.ai. A color badge sits in your toolbar, and a small indicator appears on scored sites.

SHADOW AI, SURFACED
Most "AI usage" is invisible. This extension notices your browser's calls to 19 known external AI services — OpenAI/ChatGPT, Anthropic/Claude, Google Gemini, Microsoft & GitHub Copilot, xAI/Grok, Mistral, Cohere, Perplexity, DeepSeek, Hugging Face, ElevenLabs, Stability, Character.AI and more — from any website, including AI features built into other sites, and builds a running inventory of which AI services you've touched, from which pages, and how often. It's Shadow-AI discovery, right in the browser.

PRIVATE BY DESIGN
- To look up a TrustScore it sends only the site's domain (slack.com, never acme.slack.com or the page address), with no cookies or identifiers.
- Observes only calls to the known AI services above. The contents of your requests and prompts are never read.
- Your Shadow-AI inventory stays on your device unless you connect it to your organization's workspace. Nothing is sold.

Free. Independent. Built by TrustModel.ai — the AI assurance control plane.
```

**Screenshots** (1280×800, in `assets/`)
- `ss1.png` — TrustScore + Shadow-AI together
- `ss2.png` — Shadow-AI detection focus
- `ss3.png` — on-page TrustScore badge

**Small promo tile** (440×280): `assets/promo-small.png`
**Marquee promo tile** (1400×560): `assets/promo-marquee.png`
**Store icon** (128×128): `icons/icon128.png` (in the zip)

---

## Privacy practices tab (required)

**Single purpose**
```
Show independent trust ratings (TrustScore) for the websites the user visits, and detect when the browser communicates with known external AI platforms so the user (and, if they connect, their organization) can see Shadow-AI usage.
```

**Permission justifications**
- **activeTab** — read the active tab's URL to look up and display its TrustScore.
- **storage** — store the local Shadow-AI inventory, cached scores (by domain, expiring) and settings on the device.
- **alarms** — send the workspace report every 15 minutes (only when connected) and remove expired cached scores.
- **webRequest** — observe (never modify or block) requests to a fixed, curated list of known AI-platform endpoints in order to detect Shadow-AI usage.
- **host permissions (`*://*/*`, `wss://*/*`)** — Chrome reports a request to an extension only when it has access to both the request's host and the page that made it. Access to all sites lets the extension notice calls to the listed AI services made from any page (AI features built into other sites), and `wss://` covers AI WebSocket APIs. The webRequest filter lists only the AI endpoints; no other requests are observed. The install-time warning is unchanged from v2.2.5 ("Read and change all your data on all websites", already required by the content script).
- **content script on all sites** — inject a small, read-only on-page TrustScore indicator on scored sites; it reads only the page's URL, no page content.

**Data usage disclosures** — check these to match the code:
- ☑ Does NOT sell or transfer user data to third parties (beyond the single purpose).
- ☑ Does NOT use or transfer user data for purposes unrelated to the item's single purpose.
- ☑ Does NOT use or transfer user data to determine creditworthiness / for lending.
- **Data collected — tick these** (Compliance to confirm the category choices):
  - **Web history**: the registrable domain of each public site visited is sent to api.trustmodel.ai for its TrustScore (no subdomain, path, query or cookies).
  - **Personally identifiable information**: the user's email address, only when they submit the rate/verify form, and the work email returned when they connect a workspace.
  - **User activity** (network monitoring): only when connected to a workspace, per-AI-service call counts and times are sent to the user's organization.
- Not collected: website content, page text, request or prompt contents, keystrokes, location, health, financial, or authentication information.

**Privacy policy URL**
https://trustmodel.ai/chrome-extension-privacy   (served by trustclone-plan-builder; keep it in step with `store/privacy-policy.html` — Google requires a reachable URL)

---

## Submission checklist
1. ☐ Zip built for the version in `manifest.json`: manifest + background.js + ai-detect.js + enroll.js + content.js + schema.json + popup/ + icons/ + vendor/ (vendor/ holds the Public Suffix List library the lookups need)
2. ☐ The live policy at trustmodel.ai/chrome-extension-privacy (trustclone-plan-builder `src/pages/ChromeExtensionPrivacy.tsx`) says the same as `privacy-policy.html`
3. ☐ Upload zip → fill the fields above → add 3 screenshots + 2 promo tiles
4. ☐ Set visibility (Public / Unlisted) and submit for review
5. Google review typically takes a few days for an extension requesting webRequest + host permissions. Expect possible questions on the host-permission justification — the answer is "Chrome only reports a request to an extension that can access the page that made it; the webRequest filter observes known AI endpoints only, metadata only."

> Note: this build includes opt-in workspace reporting (invite code or managed policy; `enroll.js`) and per-site TrustScore lookups (domain only). Both are disclosed above and in `privacy-policy.html`; there is no separate local-only build.
