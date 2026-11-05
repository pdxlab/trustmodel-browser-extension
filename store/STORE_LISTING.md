# Chrome Web Store — Listing Package (TrustModel Safety Check v1.1.0)

Everything needed to submit. Upload `trustmodel-safety-check-v1.1.0.zip`, then paste the fields below into the Chrome Web Store Developer Dashboard.

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

TRUSTSCORE FOR EVERY AI SYSTEM
As you browse, the extension shows an independent 0–10 TrustScore for AI models, enterprise apps, agents, and MCP services — the same ratings published at trustmodel.ai. A color badge sits in your toolbar, and a small indicator appears on scored sites.

SHADOW AI, SURFACED
Most "AI usage" is invisible. This extension watches your browser's traffic to a curated list of 26+ known external AI platforms — OpenAI/ChatGPT, Anthropic/Claude, Google Gemini, Microsoft & GitHub Copilot, xAI/Grok, Mistral, Cohere, Perplexity, DeepSeek, Hugging Face, ElevenLabs, Stability, Character.AI and more — and builds a running inventory of which AI services you've touched, from which pages, and how often. It's Shadow-AI discovery, right in the browser.

PRIVATE BY DESIGN
- Watches only the known AI endpoints above — never your general browsing.
- Reads request metadata only. The contents of your requests and prompts are never read.
- Everything stays on your device. Nothing is collected, sent, or sold.

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
Show independent trust ratings (TrustScore) for AI systems and websites the user visits, and detect when the browser communicates with known external AI platforms so the user can see their Shadow-AI usage.
```

**Permission justifications**
- **activeTab** — read the active tab's URL to look up and display its TrustScore.
- **storage** — store the local Shadow-AI inventory and user settings on the device.
- **webRequest** — observe (never modify or block) requests to a fixed, curated list of known AI-platform endpoints in order to detect Shadow-AI usage.
- **host permissions (the 26 AI-platform domains listed in the manifest)** — required to observe traffic to those specific AI services only. No other hosts are accessed by the background worker.
- **content script on all sites** — inject a small, read-only on-page TrustScore indicator on scored sites; it reads only the page's URL, no page content.

**Data usage disclosures** — check these to match the code:
- ☑ Does NOT sell or transfer user data to third parties (beyond the single purpose).
- ☑ Does NOT use or transfer user data for purposes unrelated to the item's single purpose.
- ☑ Does NOT use or transfer user data to determine creditworthiness / for lending.
- **Data collected: NONE transmitted.** All AI-usage metadata is stored locally on the device and never leaves the browser. (If asked "what data do you collect," the honest answer for this version is: none is sent off-device.)

**Privacy policy URL**
https://trustmodel.ai/extension-privacy   (host `store/privacy-policy.html` there before submitting — Google requires a reachable URL)

---

## Submission checklist
1. ☑ Zip built: `trustmodel-safety-check-v1.1.0.zip` (manifest + background.js + ai-detect.js + content.js + popup/ + icons/)
2. ☐ Host `privacy-policy.html` at trustmodel.ai/extension-privacy (or your chosen URL) and paste it in the form
3. ☐ Upload zip → fill the fields above → add 3 screenshots + 2 promo tiles
4. ☐ Set visibility (Public / Unlisted) and submit for review
5. Google review typically takes a few days for an extension requesting webRequest + host permissions. Expect possible questions on the host-permission justification — the answer is "observe known AI endpoints only, metadata-only, on-device."

> Note: this listed build is **local-only** (nothing leaves the device) to keep review fast and the privacy policy trivial. The enterprise/managed build that reports the inventory into the TrustModel Shadow-AI inventory (TRUS-2265) is a separate distribution (managed install / different data disclosures) — do not fold it into this public listing.
