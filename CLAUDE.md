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
- **Data:** none.
- **Status:** Mentörlük Paneli is live; Channel Prompt and Thumbnail Studio are shown as "Yakında".

## Files
- `index.html` — all content (Turkish copy, SEO tags, JSON-LD).
- `assets/site.css` — page styles, loaded after `brand-kit/tokens.css`.
- `assets/site.js` — scroll scene engine, background particles, nav.
- `assets/og.png` — 1200×630 share image. `assets/favicon.svg`.

## How the scroll scenes work
- Each pinned scene is `<section class="scene" data-scene="…" style="--len:…vh">` with a
  `.sticky` child. `site.js` turns its scroll position into progress `p` (0 → 1) and each scene's
  `update(p)` sets only `transform`/`opacity`. Timings live in those `update` functions.
- `<html class="motion">` is added in `<head>` unless the visitor prefers reduced motion. Without it
  scenes are not pinned and the markup's natural, fully assembled layout shows. Keep that fallback
  working: every animated element must look right with no inline styles.
- In-scene anchors (`#thumbnail`, `#prompt`, `#ekosistem`) are `<span class="anchor">`; JS moves them to
  a readable moment of the scene (`anchors` in each scene).

## Decisions specific to this site (agreed with the owner)
- **No theme picker.** The hub is red only; `theme.js` and the blue/mono swatches are intentionally
  left out. Still never hard-code accent colours: use the tokens.
- **Motion-heavy by design.** DESIGN.md's "no parallax" rule is relaxed here for the landing
  experience (pinned scenes, scroll-scaled hero, particles). Reduced motion must stay fully supported.
- Only true claims: unfinished tools are "Yakında", no invented numbers or testimonials.

## Before every commit
- Check 1440×900, 1366×768, 390×844 and 390×664: no horizontal scroll, nothing overlapping.
- Check with `prefers-reduced-motion: reduce`.
- WhatsApp `wa.me` texts: plain text, no emoji.
