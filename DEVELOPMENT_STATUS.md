# Development status — karakutuyoutube.com (hub site)

Last updated: 2026-11-19 (recovery session). Reconstructed from the repository and Git history only;
the transcript of the previous cloud session was not accessible.

## 1. Repository state
| Item | Value |
|---|---|
| Remote | `soutkursat/homePageKaraKutuYoutube` |
| Default branch (no `main`) | `claude/kind-carson-uolh3c` |
| Latest commit | `d28252a` — "Remove dead scroll and empty gaps on desktop" (2026-10-07) |
| Total commits | 7, all from one earlier cloud session (`session_01YLe1h5…`) |
| Open / closed PRs | none |
| Classic-mode reference commit | `7b97b60` (last commit before timed animations) |

The failed session expected the branch `claude/sweet-ramanujan-12wwx4`, which had never been pushed
to GitHub (hence "branch or commit not found"). It was recreated locally from `d28252a`; nothing is
missing compared with the default branch.

## 2. Completed features
- **Static landing page** (`index.html`, `assets/site.css`, `assets/site.js`), Turkish copy, no build
  step, no dependencies. SEO: title/description, canonical, OG/Twitter (`assets/og.png` 1200×630),
  JSON-LD, `robots.txt`, `sitemap.xml`, favicon.
- **Scroll scene engine**: cached offsets, eased progress, svh-based heights, per-scene `update(p)`.
- **Scenes** (in order): hero (KARA KUTU zoom + intro glide `startAdvance`) → Channel Prompt (row glow
  scan, prompt typing) → Thumbnail Studio (thumbnails pop out) → morph into the Dashboard → Kanal
  profili/takip (URL typing, tiles, competitors, challenge, session history) → Mentörlük → Ekosistem map
  → Sistemler cards → SSS → CTA → footer.
- **Timed in-scene animations** (`tw()`), "no dead scroll" tuning (`eq()`), shorter page (`data-len-timed`).
- **Fallbacks**: `?klasik` / `TIMED_ANIMATIONS = false` (fully scroll-scrubbed), `?sade` (static
  layout), `.calm` when the OS reports reduced motion (scenes still animate, decorative loops stop).
- **Phone-browser compatibility**: no `cqw`/`@container`; `--vw/--vh/--cu` set by `units()`;
  `.dash.compact`.
- **Background**: CSS-animated grid, particles (disabled parallax on phones).
- **Nav**: desktop links + accessible mobile menu.
- **"Açılınca haber ver" modal**: WhatsApp or e-mail. `api/notify.js` (Vercel Function) validates,
  rate-limits (best effort, per instance), upserts into Supabase `launch_waitlist`, sends the
  Dashboard register link via Resend; 503 + WhatsApp fallback when env vars are missing.
- **Supabase SQL**: `supabase/launch_waitlist.sql` (re-runnable, RLS on, no policies).
- **Vercel config**: www → apex redirect, cache headers for assets, security headers, `cleanUrls`.

## 3. Verified in the recovery session (2026-11-19)
- `node --check` passes for `assets/site.js` and `api/notify.js`.
- Headless Chromium, full wheel scroll: no JS errors, no failed requests, no horizontal scroll at
  1440×900, 1366×768, 390×844, 390×664, plus `?sade`, `?klasik` and `reducedMotion: reduce` (`.calm`).
- Not re-verified: visual overlap per frame, the 3-identical-steps audit, real phone browsers.

## 4. Confirmed by the owner (2026-11-19)
- Natro DNS is connected and working for the site.
- No changes were made or requested after 2026-10-07: `d28252a` is the latest state, nothing was lost.
- Channel Prompt and Thumbnail Studio have **no addresses yet**: keep them "Yakında", linked to the
  in-page anchors (`#prompt`, `#thumbnail`), with the "Açılınca haber ver" modal.

### Still unknown
- Whether `launch_waitlist.sql` was run, and whether the Vercel env vars (`SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MAIL_FROM`) and the Resend domain are set up
  (without them the e-mail option answers 503 and points to WhatsApp).

## 5. Known issues / small inconsistencies (not fixed yet)
- `brand-kit/HUB-SITE.md` mentions `example/index.html`, which is not in this repo.
- `brand-kit/ECOSYSTEM.md` still lists the hub site as "Planned".
- `assets/site.js` header comment says "The hero is not scrubbed"; since `e5ef323` scrolling back
  scrubs the hero zoom (CLAUDE.md describes the current behaviour).
- Rate limiting in `api/notify.js` is in-memory per function instance (acceptable, not strict).
- Waitlist notification when a product launches is manual (`notified_at`, example query in the SQL file).
- HUB-SITE.md "later" items not started: social proof (real results only), separate pages
  (`/mentorluk`, `/blog`).

## 6. Recommended next steps
1. Owner confirms the e-mail waitlist setup (Supabase SQL, Vercel env vars, Resend domain).
2. Visual review on the owner's real phone and desktop of the current timed version.
3. Small doc/comment fixes from section 5 (no behaviour change).
4. When Channel Prompt / Thumbnail Studio get their subdomains: switch badges to "Yayında", link the
   cards, update JSON-LD and ECOSYSTEM.md, notify the waitlist.
