# Development status — karakutuyoutube.com (hub site)

Last updated: 2026-11-24. History before this date was reconstructed from the repository and Git log.

## 1. Repository state
| Item | Value |
|---|---|
| Remote | `soutkursat/homePageKaraKutuYoutube` |
| Default branch (no `main`) | `claude/kind-carson-uolh3c` |
| Work branch of 2026-11-19 | `claude/sweet-ramanujan-12wwx4` (pull request into the default branch) |
| Merged | [PR #1](https://github.com/soutkursat/homePageKaraKutuYoutube/pull/1) (thumbnails, lessons, security) |
| Cloud tooling | rtk v0.49.0 + caveman plugin, installed by the environment setup script (see CLAUDE.md) |
| Classic-mode reference commit | `7b97b60` (last commit before timed animations) |
| Deployment | Live on Vercel; Natro DNS connected (confirmed by the owner). |
| Changes between 2026-10-07 and 2026-11-19 | None (confirmed by the owner). |

## 2. Completed features
- **Static landing page** (`index.html`, `assets/site.css`, `assets/site.js`), Turkish copy, no build
  step, no dependencies. SEO: title/description, canonical, OG/Twitter (`assets/og.png`), JSON-LD
  `@graph` (Organization, WebSite, 8 × VideoObject), `robots.txt`, `sitemap.xml`, favicon.
- **Scroll scene engine** and scenes (mentorship first since 2026-11-24): hero → Mentörlük Paneli →
  Kanal profili/takip → Mentörlük → Channel Prompt → **Ücretsiz dersler** → Thumbnail Studio → Ekosistem →
  Sistemler → SSS → CTA. Hero copy and CTAs ("Mentörlüğü keşfet", WhatsApp) point to mentorship.
- **Timed in-scene animations**, "no dead scroll" tuning, fallbacks `?klasik`, `?sade`, `.calm`.
- **Phone-browser compatibility** (no `cqw`/`@container`, `--vw/--vh/--cu`, `.dash.compact`).
- **"Açılınca haber ver" modal** + `api/notify.js` (Supabase `launch_waitlist` + Resend).
- **2026-11-19**
  - Real-looking example thumbnails (Higgsfield) in Thumbnail Studio (5) and Channel Prompt (5 row
    thumbnails + channel avatar). No text baked into the images; titles are HTML overlays. Not tied
    to any real video.
  - "Ücretsiz dersler" section with 8 videos from `@kursatyoutube` (the 4 requested ones featured:
    algoritma, NotebookLM seri üretim sistemi, yapay zekayla senaryo, prompt mühendisi), self-hosted
    WebP thumbnails, in-page `youtube-nocookie` player, subscribe CTA, nav links.
  - Security headers (CSP with script hash, HSTS, X-Frame-Options, Permissions-Policy, COOP).
  - `api/notify.js` hardening (Origin check, JSON-only, body limit, stricter e-mail rule, trusted IP
    header, no response bodies in logs).
  - Copy: stronger Channel Prompt / Thumbnail Studio / Sistemler texts, new FAQ entry about free
    lessons, secondary CTA "Önce ücretsiz derslere bak", meta description.

## 3. Verified on 2026-11-19
- `node --check` passes for `assets/site.js` and `api/notify.js`.
- `api/notify.js` mock-request tests: 405 (GET), 403 (foreign Origin), 415 (form post), 413 (big body),
  honeypot 200, 400 (bad e-mail / product), 503 without env vars, same-origin preview host allowed.
- Headless Chromium with the `vercel.json` headers applied, full wheel scroll: no JS errors, no CSP
  violations, no horizontal scroll at 1440×900, 1366×768, 390×844, 390×664, plus `?sade`, `?klasik`
  and `reducedMotion: reduce`.
- Screenshots reviewed: pinned scenes at 390×664 and 1366×768, lessons section on desktop and phone,
  player opens, closes with Esc, removes the iframe and returns focus to the card.

## 4. Unknown / needs the owner
- Whether the Supabase SQL ran and the Vercel env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `MAIL_FROM`) and the Resend domain are set up (without them the e-mail option shows
  "şu an kapalı" and points to WhatsApp, by design).
- Final URLs of Channel Prompt and Thumbnail Studio (not decided yet; still "Yakında").

## 5. Known issues / limitations
- Rate limiting in `api/notify.js` is in-memory per function instance (best effort).
- Waitlist notification on launch is manual (`notified_at`, example query in the SQL file).
- The lessons list is static: new YouTube videos must be added by hand (see CLAUDE.md).
- Vercel preview deployments may block the Vercel toolbar because of the CSP.
- HUB-SITE.md "later" items not started: real social proof, separate pages (`/mentorluk`, `/blog`).

## 6. Recommended next steps
1. After merge: check production headers (`curl -I https://karakutuyoutube.com`) and the browser console.
2. Owner review of the new visuals and lessons section on a real phone.
3. When Channel Prompt / Thumbnail Studio get subdomains: switch badges to "Yayında", link the cards,
   add `connect-src`/links as needed, update JSON-LD and ECOSYSTEM.md, notify the waitlist.
4. Optional: an automatic weekly refresh of the lessons list from the channel RSS (Vercel cron is not
   available on the free plan; a GitHub Action could open a PR instead).
5. Optional: real student results (with permission) for a social-proof section.
