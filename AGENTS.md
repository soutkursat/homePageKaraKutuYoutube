# CLAUDE.md — Hub site · Kara Kutu YouTube Akademisi

## Read first
- `brand-kit/ECOSYSTEM.md` — products, domains, infrastructure, shared rules
- `brand-kit/DESIGN.md` — design system (tokens, components, background, checklist)
- `brand-kit/HUB-SITE.md` — plan for this site

## This product
- **What it does:** the landing page of the brand. It introduces Kara Kutu YouTube Akademisi,
  showcases every system with scroll-driven scenes and routes people to them (Dashboard, WhatsApp).
- **Address:** karakutuyoutube.com (www redirects to the apex, see `vercel.json`)
- **Stack:** plain static HTML/CSS/JS, no build step, no dependencies. Deploy as a Vercel project
  with the "Other" preset (output = repo root).
- **Data:** `launch_waitlist` table in the Dashboard's Supabase project (`supabase/launch_waitlist.sql`),
  written only by `api/notify.js` with the service role key.
- **Status:** Mentörlük Paneli is live; Channel Prompt and Thumbnail Studio are shown as "Yakında".

## Files
- `index.html` — all content (Turkish copy, SEO tags, JSON-LD).
- `assets/site.css` — page styles, loaded after `brand-kit/tokens.css`.
- `assets/site.js` — scroll scene engine, background particles, nav.
- `assets/og.png` — 1200×630 share image. `assets/favicon.svg`.
- `assets/img/` — example thumbnails for the Thumbnail Studio and Channel Prompt mock-ups, generated with
  Higgsfield (`gpt_image_2_6`, 16:9, **no text baked in**; the Turkish titles are HTML overlays so they stay
  crisp and editable). `*.webp` = 800 px, `*-s.webp` = 176 px for the Channel Prompt rows,
  `kanal-avatar.webp` = the example channel avatar. They show no real video or channel.
- `assets/yt/` — self-hosted 640×360 WebP thumbnails of the YouTube videos in the "Ücretsiz dersler"
  section (`<videoId>.webp`, from `i.ytimg.com/vi/<id>/maxresdefault.jpg`).
- `api/notify.js` — Vercel Function behind the "Açılınca haber ver" modal: saves the e-mail to
  Supabase and sends the Dashboard register link (`/giris`) with Resend. No dependencies.
  Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`
  (optional `DASHBOARD_URL`). Without them it answers 503 and the modal points to WhatsApp.
- `supabase/launch_waitlist.sql` — re-runnable table + RLS (no policies = service role only).

## How the scroll scenes work
- Order: hero → Channel Prompt → Thumbnail Studio → Dashboard (morph) → Kanal profili/takip →
  Mentörlük → Ücretsiz dersler (`#dersler`) → Ekosistem → Sistemler → SSS → CTA.
- Each pinned scene is `<section class="scene" data-scene="…" style="--len:…vh">` with a
  `.sticky` child. `site.js` turns its scroll position into progress `p` (0 → 1) and each scene's
  `update(p)` sets only `transform`/`opacity`. Timings live in those `update` functions.
- Smoothness rules (phones): progress comes from cached offsets (no layout reads per frame), eases
  towards the scroll target, and uses the sticky height (100svh) instead of innerHeight so the URL
  bar never causes jumps. Never link anything to scroll with sin/wobble; never animate
  `backdrop-filter`/`filter` inside scenes; the background grid moves with a CSS animation only.
- The hero zoom is scrubbed by scroll (`span`), and at the very top one short wheel/swipe/key
  glides the page (eased `window.scrollTo`) into Channel Prompt (`startAdvance`); input is blocked
  only during that ~1.3 s glide.
- **No container query units (`cqw`/`cqh`) or `@container`.** Some phone browsers (older Chromium,
  vendor browsers) don't support them and the mock-ups fall apart. `units()` in `site.js` sets
  `--vw`/`--vh` (1% of a `.vis` cell) and `--cu` (1% of a mock-up card); size mock-up internals with
  `calc(N * var(--cu))`. The narrow dashboard layout is the `.dash.compact` class.
- Channel Prompt rows light up one by one with a glow layer inside each row (`.pm-glow`), so the
  highlight always sits exactly on its row.
- Inside scenes, sub-animations are **timed**: scroll only starts them (`tw(scene, key, on, ms)`),
  then they play by themselves in a chain (typing, rows, tiles, pieces, eco lines) and rewind when the
  visitor scrolls back. Card entrances and the Thumbnail → Dashboard morph stay scroll-driven.
  Timed scene lengths come from `data-len-timed`.
- **No dead scroll** (timed mode): a scene starts when its top enters the viewport (`enter = 1`).
  `eq(scene, p)` gives `e` (0 → 1 while it scrolls into view: content arrives here, so there is never an
  empty gap between scenes) and `q` (0 → 1 while pinned: keep pins short and add a small drift with
  `q` so every scroll step changes the screen). Verify with a full wheel-scroll audit: no step may show
  only the background, and no 3 consecutive steps may look identical.
- **Fallback ("arka kapı")**: `TIMED_ANIMATIONS = false` at the top of `site.js`, or `?klasik` in the
  URL, restores the previous fully scroll-scrubbed version (each scene keeps it as `classic`) with
  the original `--len` values. The last commit before timed animations is `7b97b60`.
- `<html class="motion">` is always added in `<head>` (owner's decision: many desktops report
  `prefers-reduced-motion` because Windows "Animation effects" is off, and the site looked flat there).
  With that OS setting the page also gets `.calm`: scenes still animate, only endless decorative loops
  stop (particles, grid drift, light breathing, eco pulses). `?sade` in the URL skips `.motion`: scenes
  are not pinned and the natural, fully assembled layout shows. Keep that fallback working: every
  animated element must look right with no inline styles.
- In-scene anchors (`#thumbnail`, `#prompt`, `#ekosistem`) are `<span class="anchor">`; JS moves them to
  a readable moment of the scene (`anchors` in each scene).

## Ücretsiz dersler (YouTube) section
- Channel: `youtube.com/@kursatyoutube` (channel id `UCkxMYWUvaXwUkjiREcN48VQ`, RSS:
  `youtube.com/feeds/videos.xml?channel_id=…` gives titles, dates, descriptions).
- Layout: one `.vid-feature` + three `.vid-row` (bento on desktop), then four `.vid-mini` in `.vids-more`.
  Below 720 px `.rail` turns both lists into sideways snap rails that stay inside the page gutter.
- Each card is a real `<a href="https://www.youtube.com/watch?v=…">` (works with no JS and in `?sade`);
  `site.js` opens `#player` (`<dialog>`) and injects a `youtube-nocookie.com` iframe on click, and removes
  it on close. Ctrl/Cmd-click still opens YouTube.
- Card texts come from the real video descriptions; no view counts (they go stale).
- Adding a video: save `assets/yt/<id>.webp` (640×360), copy a card, add a `VideoObject` to the JSON-LD
  `@graph` in `<head>` (name, description, thumbnailUrl, uploadDate, ISO duration).

## Security
- `vercel.json` sends a strict **Content-Security-Policy** plus HSTS, `X-Frame-Options: DENY`,
  `Permissions-Policy`, COOP, nosniff and Referrer-Policy. Only `self`, Google Fonts and
  `www.youtube-nocookie.com` (frames) are allowed.
- The one inline `<script>` in `<head>` is allowed by its **sha256 hash** in the CSP. If you change that
  script, recompute the hash and update `vercel.json`, or the page loses `.motion`:
  `python3 -c "import re,hashlib,base64;s=open('index.html').read();m=re.search(r'<script>(.*?)</script>',s,re.S);print(base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode())"`
- No inline event handlers (`onclick=` …) and no new external scripts; inline `style` attributes are
  allowed (`style-src 'unsafe-inline'`) because scenes use `style="--len:…"`.
- `api/notify.js`: POST + `application/json` only, Origin must be this host (or the apex/www), body ≤ 2 KB,
  honeypot, plain-address e-mail rule (same regex in `site.js`), per-IP rate limit, unique (email, product),
  errors are logged without response bodies. The service role key stays server-side.
- Vercel preview deployments: the Vercel toolbar may be blocked by the CSP there; production is unaffected.

## Decisions specific to this site (agreed with the owner)
- **No theme picker.** The hub is red only; `theme.js` and the blue/mono swatches are intentionally
  left out. Still never hard-code accent colours: use the tokens.
- **Motion-heavy by design.** DESIGN.md's "no parallax" rule is relaxed here for the landing
  experience (pinned scenes, scroll-scaled hero, particles). The static layout stays available via `?sade`.
- Only true claims: unfinished tools are "Yakında", no invented numbers or testimonials.

## Repository, branches and history
- GitHub: `soutkursat/homePageKaraKutuYoutube`. There is **no `main` branch**: the repo's default branch
  is `claude/kind-carson-uolh3c`. Cloud sessions develop on their own `claude/…` branch created from it,
  push only to that branch and open a pull request into the default branch.
- If a cloud session fails with "branch or commit not found", the branch it expected was never pushed.
  Check `git ls-remote origin`, start from the default branch, and never reset/force-push over it.
- Commit history is the only reliable record of past sessions (each commit body explains the why).
  Work that was never committed and pushed is lost when a cloud container is reclaimed.
- Current progress, known issues and next steps: `DEVELOPMENT_STATUS.md`. Update it with every
  meaningful change. Keep `CLAUDE.md` and `AGENTS.md` identical (same content, two names).

## Local run and checks
- `python3 -m http.server 8080` in the repo root → http://localhost:8080 (`/api/notify` does not run
  locally; the modal then falls back to WhatsApp).
- Quick sanity: `node --check assets/site.js && node --check api/notify.js`.
- Headless audit: Playwright + preinstalled Chromium; load each viewport (also `?sade`, `?klasik`,
  `reducedMotion: 'reduce'`), wheel-scroll the whole page, assert no page errors and
  `scrollWidth === clientWidth`. To test the CSP, serve the folder with a tiny server that sends the
  `vercel.json` headers and listen for `securitypolicyviolation` events.
- Cloud environment `homePageKaraKutuYoutube` (personal) allows `www.youtube.com`, `i.ytimg.com`,
  Higgsfield's CDN `d8j0ntlcm91z4.cloudfront.net`, and GitHub release downloads (`github.com`,
  `release-assets.githubusercontent.com`, `objects.githubusercontent.com`).
- Its setup script installs two token savers for Claude Code in every new session (owner's request):
  **rtk** v0.49.0 (`rtk-ai/rtk`, SHA-256 pinned binary in `/usr/local/bin`, global `rtk hook claude`
  PreToolUse hook that compresses command output; `rtk gain` shows savings) and the **caveman** plugin
  (`JuliusBrussee/caveman`, terse replies in the user's language; "stop caveman" / "normal mode" turns it
  off). These are environment settings, not repo files. caveman's optional runtime (`@caveman-ai/cli setup`)
  is not installed. Code, commits, docs and PRs are always written in full sentences.

## Before every commit
- Check 1440×900, 1366×768, 390×844 and 390×664: no horizontal scroll, nothing overlapping.
- Check with `prefers-reduced-motion: reduce` (animated + calm) and with `?sade` (static).
- WhatsApp `wa.me` texts: plain text, no emoji.
