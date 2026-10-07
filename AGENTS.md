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
- `api/notify.js` — Vercel Function behind the "Açılınca haber ver" modal: saves the e-mail to
  Supabase and sends the Dashboard register link (`/giris`) with Resend. No dependencies.
  Env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`
  (optional `DASHBOARD_URL`). Without them it answers 503 and the modal points to WhatsApp.
- `supabase/launch_waitlist.sql` — re-runnable table + RLS (no policies = service role only).

## How the scroll scenes work
- Order: hero → Channel Prompt → Thumbnail Studio → Dashboard (morph) → Kanal profili/takip →
  Mentörlük → Ekosistem → Sistemler → SSS → CTA.
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

## Decisions specific to this site (agreed with the owner)
- **No theme picker.** The hub is red only; `theme.js` and the blue/mono swatches are intentionally
  left out. Still never hard-code accent colours: use the tokens.
- **Motion-heavy by design.** DESIGN.md's "no parallax" rule is relaxed here for the landing
  experience (pinned scenes, scroll-scaled hero, particles). The static layout stays available via `?sade`.
- Only true claims: unfinished tools are "Yakında", no invented numbers or testimonials.

## Before every commit
- Check 1440×900, 1366×768, 390×844 and 390×664: no horizontal scroll, nothing overlapping.
- Check with `prefers-reduced-motion: reduce` (animated + calm) and with `?sade` (static).
- WhatsApp `wa.me` texts: plain text, no emoji.
