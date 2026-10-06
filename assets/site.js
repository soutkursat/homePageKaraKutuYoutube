/* karakutuyoutube.com — scroll scenes, particles, nav, "haber ver" modal. No dependencies.
 *
 * Scroll engine
 * - Every pinned scene is a tall <section class="scene"> with a sticky child. Its progress p (0 → 1)
 *   is computed from CACHED offsets + window.scrollY, so a frame never forces a layout read.
 * - The visible value eases towards the scroll target (critically damped lerp). This removes the
 *   stutter of uneven touch-scroll deltas on phones and makes slow scrolling buttery.
 * - Heights come from the sticky element (100svh), not innerHeight, so the mobile URL bar
 *   appearing/disappearing does not make anything jump.
 * - The hero is not scrubbed: the first scroll plays its zoom as a timed animation.
 * - Scenes always animate (the owner wants them even when the OS asks for reduced motion, e.g. Windows
 *   "Animation effects" off). In that case <html> gets .calm and only the endless decorative loops stop
 *   (particles, grid drift, light breathing, eco pulses). ?sade in the URL gives the fully static
 *   layout (no .motion class: nothing pinned, everything assembled). */
(function () {
  'use strict'
  var root = document.documentElement
  var MOTION = root.classList.contains('motion')
  var CALM = root.classList.contains('calm')
  // ARKA KAPI / FALLBACK: false yaparsan (ya da adrese ?klasik eklersen) sahnelerin içindeki bütün
  // animasyonlar eskisi gibi tamamen kaydırmaya bağlı çalışır ve sahneler eski uzunluklarına döner.
  var TIMED_ANIMATIONS = true
  var TIMED = TIMED_ANIMATIONS && !/[?&]klasik\b/.test(location.search)
  var COARSE = window.matchMedia('(pointer: coarse)').matches

  // ---------- helpers ----------
  function clamp(v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v }
  function seg(p, a, b) { return clamp((p - a) / (b - a)) }
  function lerp(a, b, t) { return a + (b - a) * t }
  function eo(t) { return 1 - Math.pow(1 - t, 3) }                                     // ease-out
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }   // ease-in-out
  function $(s, c) { return (c || document).querySelector(s) }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)) }
  function k(scene, name) { return $('[data-k="' + name + '"]', scene) }
  function r3(n) { return Math.round(n * 1000) / 1000 }
  function show(el, op, tf) {
    op = r3(op)
    if (el._op !== op) { el._op = op; el.style.opacity = op; el.style.visibility = op < 0.02 ? 'hidden' : 'visible' }
    if (tf != null && el._tf !== tf) { el._tf = tf; el.style.transform = tf }
  }
  function absTop(el) { var y = 0; while (el) { y += el.offsetTop; el = el.offsetParent } return y }
  var mqStack = window.matchMedia('(max-width: 900px)')

  // ---------- year ----------
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear() })

  // ---------- nav: mobile menu ----------
  var toggle = $('.nav-toggle')
  var menu = $('#mobile-menu')
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç')
    menu.hidden = !open
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(menu.hidden) })
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false) })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus() } })
    document.addEventListener('click', function (e) { if (!menu.hidden && !e.target.closest('.site-nav')) setMenu(false) })
    if (mqStack.addEventListener) mqStack.addEventListener('change', function () { setMenu(false) })
  }
  var navBar = $('.nav-progress')

  // ---------- card spotlight (mouse only) ----------
  if (!COARSE) $$('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect()
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px')
      el.style.setProperty('--my', (e.clientY - r.top) + 'px')
    })
    el.addEventListener('pointerleave', function () { el.style.removeProperty('--mx'); el.style.removeProperty('--my') })
  })

  // ---------- reveal on scroll ----------
  if (MOTION && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return
        var el = en.target
        var sibs = $$('.reveal', el.parentNode)
        el.style.setProperty('--d', Math.min(sibs.indexOf(el), 5) * 80 + 'ms')
        el.classList.add('in')
        io.unobserve(el)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    $$('.reveal').forEach(function (el) { io.observe(el) })
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in') })
  }

  // =====================================================================
  // SCROLL SCENES
  // =====================================================================
  var scenes = []
  function addScene(name, def) {
    var el = $('[data-scene="' + name + '"]')
    if (!el) return
    def.el = el
    def.sticky = $('.sticky', el)
    def.enter = def.enter || 0
    def.cur = -1; def.target = 0
    if (!TIMED && def.classic) def.update = def.classic
    if (TIMED && el.getAttribute('data-len-timed')) el.style.setProperty('--len', el.getAttribute('data-len-timed'))
    def.tw = {}
    scenes.push(def)
  }
  // Timed sub-animation: once "on" it plays by itself (0 → 1 in dur ms) and rewinds when "on" turns
  // false. The scroll only decides WHEN it starts, so text types and pieces assemble without scrubbing.
  function tw(s, key, on, dur) {
    var t = s.tw[key] || (s.tw[key] = { v: 0, to: 0, dur: dur })
    t.to = on ? 1 : 0; t.dur = dur
    return t.v
  }
  function stepTweens(s, dt) {
    var moved = false
    for (var key in s.tw) {
      var t = s.tw[key]
      if (t.v === t.to) continue
      var d = dt / t.dur
      t.v = t.to > t.v ? Math.min(t.to, t.v + d) : Math.max(t.to, t.v - d)
      moved = true
    }
    return moved
  }
  function tweensPending(s) {
    for (var key in s.tw) if (s.tw[key].v !== s.tw[key].to) return true
    return false
  }
  function fitInto(card) {
    var cell = card.parentNode
    return Math.min(1, (cell.clientHeight - 8) / card.offsetHeight, cell.clientWidth / card.offsetWidth)
  }

  // ---------- 0 · HERO (scrubbed; the first scroll auto-advances to Channel Prompt) ----------
  addScene('hero', {
    span: 0.75,
    init: function () {
      var s = this.el
      this.giant = k(s, 'giant'); this.box = k(s, 'box'); this.hint = k(s, 'hint')
      this.rest = $$('.chip-outline, .hero-title, .hero-lead, .hero-cta', k(s, 'content'))
      this.zoom = COARSE ? 5 : 8
    },
    update: function (p) {
      var g = eio(seg(p, 0, 0.9))
      show(this.giant, 1 - seg(p, 0.35, 0.85), 'translate3d(0,0,0) scale(' + r3(1 + g * this.zoom) + ')')
      var c = eo(seg(p, 0, 0.35))
      this.rest.forEach(function (el, i) {
        var dir = i === 0 ? -1 : 1
        show(el, 1 - c, 'translate3d(0,' + r3(dir * c * (50 + i * 18)) + 'px,0)')
      })
      var b = eio(seg(p, 0.04, 0.9))
      show(this.box, seg(p, 0.02, 0.15) * (1 - seg(p, 0.55, 0.85)), 'translate(-50%,-50%) scale(' + r3(0.6 + b * 9) + ') rotate(' + r3(b * 45) + 'deg)')
      show(this.hint, 1 - seg(p, 0, 0.1))
    }
  })

  // ---------- 1 · CHANNEL PROMPT ----------
  addScene('prompt', {
    enter: 0.55,
    anchors: { prompt: 0.3 },
    init: function () {
      var s = this.el
      this.text = k(s, 'text'); this.mock = k(s, 'mock'); this.chan = k(s, 'chan')
      this.rows = $$('[data-row]', s); this.checks = this.rows.map(function (r) { return $('b', r) })
      this.glows = this.rows.map(function (r) { return $('.pm-glow', r) })
      this.out = k(s, 'out'); this.copy = k(s, 'copy'); this.claude = k(s, 'claude')
      this.type = k(s, 'type'); this.full = this.type.textContent; this.shown = -1
      this.steps = $$('li', k(s, 'flow'))
    },
    measure: function () { this.fit = fitInto(this.mock) },
    classic: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.mock, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var step = p < 0.17 ? 0 : p < 0.5 ? 1 : p < 0.82 ? 2 : 3
      if (step !== this.step) { this.step = step; this.steps.forEach(function (li, i) { li.classList.toggle('on', i <= step) }) }

      var c = eo(seg(p, 0.08, 0.16))
      show(this.chan, c, 'translate3d(' + r3((1 - c) * -30) + 'px,0,0)')
      var o = eo(seg(p, 0.5, 0.58))
      var scanT = seg(p, 0.33, 0.5)
      var self = this
      this.rows.forEach(function (row, i) {
        var t = eo(seg(p, 0.17 + i * 0.035, 0.25 + i * 0.035))
        show(row, t * (1 - 0.75 * o), 'translate3d(' + r3((1 - t) * 40) + 'px,0,0)')
        var gl = eo(seg(scanT, i / 5, (i + 1) / 5))
        show(self.glows[i], gl)
        show(self.checks[i], gl, 'scale(' + r3(lerp(0.4, 1, gl)) + ')')
      })

      show(this.out, o, 'translate3d(0,' + r3((1 - o) * 40) + 'px,0) scale(' + r3(lerp(0.96, 1, o)) + ')')
      var ty = seg(p, 0.56, 0.82)
      var n = Math.round(this.full.length * ty)
      if (n !== this.shown) {
        this.shown = n
        this.type.textContent = this.full.slice(0, n)
      }
      var typing = ty > 0 && n < this.full.length
      if (typing !== this.typing) { this.typing = typing; this.type.classList.toggle('typing', typing) }
      show(this.copy, seg(p, 0.82, 0.86))
      var cl = eo(seg(p, 0.84, 0.92))
      show(this.claude, cl, 'translate3d(0,' + r3((1 - cl) * 24) + 'px,0) scale(' + r3(lerp(0.94, 1, cl)) + ')')
    },
    update: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.mock, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var chanT = tw(this, 'chan', p >= 0.06, 450)
      var rowsT = tw(this, 'rows', p >= 0.06 && chanT > 0.6, 900)
      var scanT = tw(this, 'scan', p >= 0.06 && rowsT >= 1, 1100)
      var outT = tw(this, 'out', p >= 0.06 && scanT >= 1, 400)
      var ty = tw(this, 'type', outT >= 1, 1900)
      var clT = tw(this, 'claude', ty >= 1, 500)

      var step = clT > 0 ? 3 : outT > 0 ? 2 : rowsT > 0 ? 1 : 0
      if (step !== this.step) { this.step = step; this.steps.forEach(function (li, i) { li.classList.toggle('on', i <= step) }) }

      var c = eo(chanT)
      show(this.chan, c, 'translate3d(' + r3((1 - c) * -30) + 'px,0,0)')
      var o = eo(outT)
      var self = this
      this.rows.forEach(function (row, i) {
        var t = eo(seg(rowsT, i * 0.14, i * 0.14 + 0.44))
        show(row, t * (1 - 0.75 * o), 'translate3d(' + r3((1 - t) * 40) + 'px,0,0)')
        var gl = eo(seg(scanT, i / 5, (i + 1) / 5))
        show(self.glows[i], gl)
        show(self.checks[i], gl, 'scale(' + r3(lerp(0.4, 1, gl)) + ')')
      })

      show(this.out, o, 'translate3d(0,' + r3((1 - o) * 40) + 'px,0) scale(' + r3(lerp(0.96, 1, o)) + ')')
      var n = Math.round(this.full.length * ty)
      if (n !== this.shown) { this.shown = n; this.type.textContent = this.full.slice(0, n) }
      var typing = ty > 0 && n < this.full.length
      if (typing !== this.typing) { this.typing = typing; this.type.classList.toggle('typing', typing) }
      show(this.copy, seg(clT, 0, 0.5))
      var cl = eo(clT)
      show(this.claude, cl, 'translate3d(0,' + r3((1 - cl) * 24) + 'px,0) scale(' + r3(lerp(0.94, 1, cl)) + ')')
    }
  })

  // ---------- 2 · THUMBNAIL STUDIO → 3 · DASHBOARD ----------
  var THUMB_TARGETS = [[-0.5, -0.62, -8], [0.52, -0.58, 7], [-0.52, 0.6, 5], [0.5, 0.64, -6]]
  addScene('products', {
    enter: 0.55,
    anchors: { thumbnail: 0.12 },
    init: function () {
      var s = this.el
      this.textA = k(s, 'textA'); this.textB = k(s, 'textB')
      this.visA = k(s, 'visA'); this.visB = k(s, 'visB')
      this.studio = k(s, 'studio'); this.dash = k(s, 'dash')
      this.thumbs = $$('[data-thumb]', s)
      this.pieces = $$('[data-piece]', s).map(function (el) {
        var v = el.getAttribute('data-piece').split(',').map(Number)
        return { el: el, fx: v[0], fy: v[1], r: v[2] }
      })
    },
    measure: function () {
      this.stack = mqStack.matches
      var W = this.studio.offsetWidth, H = this.studio.offsetHeight
      var cW = this.visA.clientWidth, cH = this.visA.clientHeight
      var tw = W * (this.stack ? 0.42 : 0.44), th = tw * 9 / 16
      var overX = this.stack ? -6 : 36
      var self = this
      this.W = W; this.H = H
      this.targets = THUMB_TARGETS.map(function (t, i) {
        self.thumbs[i].style.width = tw + 'px'
        var maxX = cW / 2 - tw / 2 + overX, maxY = cH / 2 - th / 2 - 6
        return [clamp(t[0] * W, -maxX, maxX), clamp(t[1] * H, -maxY, maxY), t[2]]
      })
      this.dx = (this.visB.offsetLeft + this.visB.offsetWidth / 2) - (this.visA.offsetLeft + this.visA.offsetWidth / 2)
      this.dy = (this.visB.offsetTop + this.visB.offsetHeight / 2) - (this.visA.offsetTop + this.visA.offsetHeight / 2)
      this.sB = this.dash.offsetWidth / W
      this.DW = this.dash.offsetWidth
    },
    classic: function (p) {
      var self = this, W = this.W, H = this.H
      // A · studio card flies towards the viewer
      var inA = eo(seg(p, 0, 0.14))
      var m = eio(seg(p, 0.56, 0.7))
      var tx = 0, ty = (1 - inA) * H * 0.45, sc = lerp(0.6, 1, inA), rx = (1 - inA) * 34, ry = 0
      if (!this.stack) { tx += this.dx * m; ty += this.dy * m; sc *= lerp(1, this.sB, m); ry = -m * 12 }
      else { tx -= m * W * 0.7; ry = m * 32; sc *= lerp(1, 0.86, m) }
      show(this.studio, inA * (1 - seg(p, 0.62, 0.7)),
        'perspective(1400px) translate3d(' + r3(tx) + 'px,' + r3(ty) + 'px,0) rotateX(' + r3(rx) + 'deg) rotateY(' + r3(ry) + 'deg) scale(' + r3(sc) + ')')

      // thumbnails pop out of the card, hang around, then dive back in
      var back = eio(seg(p, 0.48, 0.58))
      this.thumbs.forEach(function (el, i) {
        var t = eo(seg(p, 0.15 + i * 0.045, 0.3 + i * 0.045))
        var o = t * (1 - back)
        var tg = self.targets[i]
        show(el, clamp(t * 1.6) * (1 - back),
          'translate(-50%,-50%) translate3d(' + r3(tg[0] * o) + 'px,' + r3(tg[1] * o) + 'px,0) rotate(' + r3(tg[2] * o) + 'deg) scale(' + r3(lerp(0.3, 1, o)) + ')')
      })

      var aIn = eo(seg(p, 0.04, 0.14)), aOut = seg(p, 0.46, 0.55)
      show(this.textA, aIn * (1 - aOut), 'translate3d(0,' + r3((1 - aIn) * 36 - aOut * 36) + 'px,0)')

      // B · dashboard shell appears where the card landed, pieces assemble
      var sh = eo(seg(p, 0.6, 0.7))
      show(this.dash, sh, this.stack
        ? 'perspective(1400px) translate3d(' + r3((1 - sh) * W * 0.7) + 'px,0,0) rotateY(' + r3(-(1 - sh) * 32) + 'deg)'
        : 'none')
      this.pieces.forEach(function (pc, i) {
        var last = i === self.pieces.length - 1
        var t = last ? eo(seg(p, 0.86, 0.93)) : eo(seg(p, 0.63 + i * 0.03, 0.76 + i * 0.03))
        var u = 1 - t
        show(pc.el, t, 'translate3d(' + r3(pc.fx * self.DW * u) + 'px,' + r3(pc.fy * self.DW * u) + 'px,0) rotate(' + r3(pc.r * u) + 'deg) scale(' + r3(lerp(0.9, 1, t)) + ')')
      })
      var bIn = eo(seg(p, 0.7, 0.8))
      show(this.textB, bIn, 'translate3d(0,' + r3((1 - bIn) * 36) + 'px,0)')
    },
    update: function (p) {
      var self = this, W = this.W, H = this.H
      // A · studio card flies towards the viewer (scroll)
      var inA = eo(seg(p, 0, 0.14))
      var m = eio(seg(p, 0.56, 0.7))
      var tx = 0, ty = (1 - inA) * H * 0.45, sc = lerp(0.6, 1, inA), rx = (1 - inA) * 34, ry = 0
      if (!this.stack) { tx += this.dx * m; ty += this.dy * m; sc *= lerp(1, this.sB, m); ry = -m * 12 }
      else { tx -= m * W * 0.7; ry = m * 32; sc *= lerp(1, 0.86, m) }
      show(this.studio, inA * (1 - seg(p, 0.62, 0.7)),
        'perspective(1400px) translate3d(' + r3(tx) + 'px,' + r3(ty) + 'px,0) rotateX(' + r3(rx) + 'deg) rotateY(' + r3(ry) + 'deg) scale(' + r3(sc) + ')')

      // thumbnails pop out by themselves, and dive back in before the card turns into the dashboard
      var th = tw(this, 'thumbs', p >= 0.13 && p < 0.47 && inA > 0.9, 1000)
      this.thumbs.forEach(function (el, i) {
        var o = eo(seg(th, i * 0.15, i * 0.15 + 0.55))
        var tg = self.targets[i]
        show(el, clamp(o * 1.6),
          'translate(-50%,-50%) translate3d(' + r3(tg[0] * o) + 'px,' + r3(tg[1] * o) + 'px,0) rotate(' + r3(tg[2] * o) + 'deg) scale(' + r3(lerp(0.3, 1, o)) + ')')
      })

      var aIn = eo(seg(p, 0.04, 0.14)), aOut = seg(p, 0.46, 0.55)
      show(this.textA, aIn * (1 - aOut), 'translate3d(0,' + r3((1 - aIn) * 36 - aOut * 36) + 'px,0)')

      // B · dashboard shell appears where the card landed (scroll), pieces assemble by themselves
      var sh = eo(seg(p, 0.6, 0.7))
      show(this.dash, sh, this.stack
        ? 'perspective(1400px) translate3d(' + r3((1 - sh) * W * 0.7) + 'px,0,0) rotateY(' + r3(-(1 - sh) * 32) + 'deg)'
        : 'none')
      var pc = tw(this, 'pieces', p >= 0.64 && sh > 0.6, 1500)
      var last = this.pieces.length - 1
      this.pieces.forEach(function (piece, i) {
        var t = i === last ? eo(seg(pc, 0.82, 1)) : eo(seg(pc, i * 0.1, i * 0.1 + 0.45))
        var u = 1 - t
        show(piece.el, t, 'translate3d(' + r3(piece.fx * self.DW * u) + 'px,' + r3(piece.fy * self.DW * u) + 'px,0) rotate(' + r3(piece.r * u) + 'deg) scale(' + r3(lerp(0.9, 1, t)) + ')')
      })
      var bIn = eo(seg(p, 0.66, 0.76))
      show(this.textB, bIn, 'translate3d(0,' + r3((1 - bIn) * 36) + 'px,0)')
    }
  })

  // ---------- 3b · CHANNEL PROFILE & TRACKING (Dashboard) ----------
  addScene('profile', {
    enter: 0.55,
    anchors: { takip: 0.4 },
    init: function () {
      var s = this.el
      this.text = k(s, 'text'); this.card = k(s, 'card')
      this.url = k(s, 'url'); this.urlWrap = this.url.parentNode; this.fullUrl = this.url.textContent; this.shown = -1
      this.ok = k(s, 'ok'); this.tiles = $$('[data-tile]', s); this.count = k(s, 'count'); this.countN = -1
      this.rivals = $$('[data-rival]', s); this.sub = $('.pf-sub', s); this.challenge = k(s, 'challenge'); this.track = k(s, 'track')
      this.fill = k(s, 'fill'); this.dots = $$('[data-dot]', s)
    },
    measure: function () { this.fit = fitInto(this.card) },
    classic: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.card, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var ty = seg(p, 0.1, 0.26)
      var n = Math.round(this.fullUrl.length * ty)
      if (n !== this.shown) {
        this.shown = n
        this.url.textContent = this.fullUrl.slice(0, n)
      }
      var typing = ty > 0 && n < this.fullUrl.length
      if (typing !== this.typing) { this.typing = typing; this.urlWrap.classList.toggle('typing', typing) }
      var ok = eo(seg(p, 0.26, 0.3))
      show(this.ok, ok, 'scale(' + r3(lerp(0.7, 1, ok)) + ')')
      this.tiles.forEach(function (el, i) {
        var t = eo(seg(p, 0.28 + i * 0.03, 0.38 + i * 0.03))
        show(el, t, 'translate3d(0,' + r3((1 - t) * 18) + 'px,0) scale(' + r3(lerp(0.9, 1, t)) + ')')
      })
      var cnt = Math.round(64 * eo(seg(p, 0.36, 0.5)))
      if (cnt !== this.countN) { this.countN = cnt; this.count.textContent = cnt }
      this.rivals.forEach(function (el, i) {
        var t = eo(seg(p, 0.48 + i * 0.04, 0.58 + i * 0.04))
        show(el, t, 'translate3d(' + r3(-(1 - t) * 24) + 'px,0,0)')
      })
      var ch = eo(seg(p, 0.6, 0.68))
      show(this.challenge, ch, 'translate3d(0,' + r3((1 - ch) * 16) + 'px,0)')
      var tr = eo(seg(p, 0.64, 0.72))
      show(this.track, tr, 'translate3d(0,' + r3((1 - tr) * 16) + 'px,0)')
      var f = eio(seg(p, 0.72, 0.9))
      show(this.fill, 1, 'scaleX(' + r3(f * 0.6667) + ')')
      this.dots.forEach(function (el, i) {
        var t = i < 3 ? eo(seg(f, i / 3 - 0.02, i / 3 + 0.08)) : eo(seg(p, 0.9, 0.96))
        show(el, lerp(0.25, 1, t), 'scale(' + r3(lerp(0.7, 1, t)) + ')')
      })
    },
    update: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.card, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var urlT = tw(this, 'url', p >= 0.06 && t0 > 0.5, 1000)
      var okT = tw(this, 'ok', urlT >= 1, 300)
      var tilesT = tw(this, 'tiles', urlT >= 1, 900)
      var rivT = tw(this, 'rivals', tilesT >= 1, 650)
      var chT = tw(this, 'challenge', rivT >= 1, 400)
      var trT = tw(this, 'track', chT >= 1, 400)
      var fT = tw(this, 'fill', trT >= 1, 1200)

      var n = Math.round(this.fullUrl.length * urlT)
      if (n !== this.shown) { this.shown = n; this.url.textContent = this.fullUrl.slice(0, n) }
      var typing = urlT > 0 && n < this.fullUrl.length
      if (typing !== this.typing) { this.typing = typing; this.urlWrap.classList.toggle('typing', typing) }
      var ok = eo(okT)
      show(this.ok, ok, 'scale(' + r3(lerp(0.7, 1, ok)) + ')')
      this.tiles.forEach(function (el, i) {
        var t = eo(seg(tilesT, i * 0.1, i * 0.1 + 0.5))
        show(el, t, 'translate3d(0,' + r3((1 - t) * 18) + 'px,0) scale(' + r3(lerp(0.9, 1, t)) + ')')
      })
      var cnt = Math.round(64 * eo(seg(tilesT, 0.3, 1)))
      if (cnt !== this.countN) { this.countN = cnt; this.count.textContent = cnt }
      show(this.sub, eo(seg(rivT, 0, 0.4)))
      this.rivals.forEach(function (el, i) {
        var t = eo(seg(rivT, i * 0.2, i * 0.2 + 0.6))
        show(el, t, 'translate3d(' + r3(-(1 - t) * 24) + 'px,0,0)')
      })
      var ch = eo(chT)
      show(this.challenge, ch, 'translate3d(0,' + r3((1 - ch) * 16) + 'px,0)')
      var tr = eo(trT)
      show(this.track, tr, 'translate3d(0,' + r3((1 - tr) * 16) + 'px,0)')
      var f = eio(seg(fT, 0, 0.85))
      show(this.fill, 1, 'scaleX(' + r3(f * 0.6667) + ')')
      this.dots.forEach(function (el, i) {
        var t = i < 3 ? eo(seg(f, i / 3 - 0.02, i / 3 + 0.08)) : eo(seg(fT, 0.85, 1))
        show(el, lerp(0.25, 1, t), 'scale(' + r3(lerp(0.7, 1, t)) + ')')
      })
    }
  })

  // ---------- 5 · ECOSYSTEM ----------
  var SVGNS = 'http://www.w3.org/2000/svg'
  addScene('eco', {
    enter: 0.5,
    anchors: { ekosistem: 0.7 },
    init: function () {
      var s = this.el
      this.head = k(s, 'head'); this.stage = k(s, 'estage'); this.svg = k(s, 'svg'); this.core = k(s, 'core')
      this.coreCube = $('.eco-cube', this.core)
      this.nodes = $$('[data-node]', s)
      this.ghosts = []; this.lines = []; this.dots = []
      var i
      for (i = 0; i < this.nodes.length; i++) {
        var g = document.createElementNS(SVGNS, 'path'); g.setAttribute('class', 'ghost'); this.svg.appendChild(g); this.ghosts.push(g)
      }
      for (i = 0; i < this.nodes.length; i++) {
        var l = document.createElementNS(SVGNS, 'path'); l.setAttribute('pathLength', '1')
        l.style.strokeDasharray = '1'; l.style.strokeDashoffset = MOTION ? '1' : '0'
        this.svg.appendChild(l); this.lines.push(l)
      }
      if (MOTION && !CALM) {
        for (i = 0; i < this.nodes.length; i++) {
          var d = document.createElementNS(SVGNS, 'circle'); d.setAttribute('r', '3.2'); d.style.opacity = '0'
          this.svg.appendChild(d); this.dots.push(d)
        }
      }
      this.live = false
      if (!MOTION) this.measure()
    },
    animate: function (ts) {
      var self = this
      this.dots.forEach(function (d, i) {
        var L = self.lens[i]; if (!L) return
        var f = ((ts / 2600 + i * 0.23) % 1 + 1) % 1
        if (i % 2) f = 1 - f
        var pt = self.lines[i].getPointAtLength(f * L)
        d.setAttribute('cx', pt.x.toFixed(1)); d.setAttribute('cy', pt.y.toFixed(1))
        d.style.opacity = (Math.sin(f * Math.PI) * 0.95).toFixed(2)
      })
    },
    measure: function () {
      var w = this.stage.clientWidth, h = this.stage.clientHeight
      this.svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h)
      var cx = this.core.offsetLeft, cy = this.core.offsetTop - this.core.offsetHeight / 2 + this.coreCube.offsetHeight / 2
      var self = this
      this.lens = this.nodes.map(function (n, i) {
        var x = n.offsetLeft, y = n.offsetTop
        var mx = (cx + x) / 2, my = (cy + y) / 2
        var dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1
        var bend = (i % 2 ? -1 : 1) * Math.min(60, len * 0.16)
        var d = 'M' + cx + ' ' + cy + ' Q' + (mx - dy / len * bend) + ' ' + (my + dx / len * bend) + ' ' + x + ' ' + y
        self.ghosts[i].setAttribute('d', d); self.lines[i].setAttribute('d', d)
        return self.lines[i].getTotalLength()
      })
    },
    classic: function (p) {
      var h = eo(seg(p, 0, 0.14))
      show(this.head, h, 'translate3d(0,' + r3((1 - h) * 36) + 'px,0)')
      var c = eo(seg(p, 0.08, 0.22))
      show(this.core, c, 'translate(-50%,-50%) scale(' + r3(lerp(0.4, 1, c)) + ')')
      var self = this
      this.nodes.forEach(function (n, i) {
        var l = eio(seg(p, 0.2 + i * 0.06, 0.4 + i * 0.06))
        self.lines[i].style.strokeDashoffset = String(r3(1 - l))
        self.ghosts[i].style.opacity = String(r3(c))
        var t = eo(seg(p, 0.32 + i * 0.06, 0.44 + i * 0.06))
        show(n, t, 'translate(-50%,-50%) scale(' + r3(lerp(0.6, 1, t)) + ')')
      })
      var live = p > 0.66 && p < 1
      if (live !== this.live) {
        this.live = live
        if (!live) this.dots.forEach(function (d) { d.style.opacity = '0' })
      }
    },
    update: function (p) {
      var h = eo(seg(p, 0, 0.14))
      show(this.head, h, 'translate3d(0,' + r3((1 - h) * 36) + 'px,0)')
      var coreT = tw(this, 'core', p >= 0.06, 600)
      var linesT = tw(this, 'lines', p >= 0.12 && coreT >= 1, 1900)
      var c = eo(coreT)
      show(this.core, c, 'translate(-50%,-50%) scale(' + r3(lerp(0.4, 1, c)) + ')')
      var self = this
      this.nodes.forEach(function (n, i) {
        var l = eio(seg(linesT, i * 0.11, i * 0.11 + 0.5))
        self.lines[i].style.strokeDashoffset = String(r3(1 - l))
        self.ghosts[i].style.opacity = String(r3(c))
        var t = eo(seg(linesT, i * 0.11 + 0.3, i * 0.11 + 0.56))
        show(n, t, 'translate(-50%,-50%) scale(' + r3(lerp(0.6, 1, t)) + ')')
      })
      var live = linesT >= 1 && p < 1
      if (live !== this.live) {
        this.live = live
        if (!live) this.dots.forEach(function (d) { d.style.opacity = '0' })
      }
    }
  })

  if (!MOTION) $$('.flow li').forEach(function (li) { li.classList.add('on') })
  scenes.forEach(function (s) { s.init() })

  // ---------- size units (instead of container query units: older phone browsers lack cqw/cqh) ----------
  // --vw/--vh = 1% of a visual cell, --cu = 1% of a mock-up card; the CSS sizes everything with them.
  var visCells = $$('.vis'), cards = $$('.studio, .dash, .pmock, .prof, .thumb'), dashEl = $('.dash')
  function units() {
    visCells.forEach(function (v) {
      v.style.setProperty('--vw', (v.clientWidth / 100) + 'px')
      v.style.setProperty('--vh', (v.clientHeight / 100) + 'px')
    })
    cards.forEach(function (c) { c.style.setProperty('--cu', (c.offsetWidth / 100) + 'px') })
    if (dashEl) dashEl.classList.toggle('compact', dashEl.offsetWidth <= 440)
  }

  // ---------- engine ----------
  var gridEl = $('.bg-grid')  // animated by CSS only (compositor), never by scroll
  function measureAll() {
    units()
    scenes.forEach(function (s) {
      if (s.measure) s.measure()
      s.H = s.sticky.offsetHeight || window.innerHeight
      s.top = absTop(s.el)
      s.height = s.el.offsetHeight
      s.total = s.span ? s.span * s.H : Math.max(1, s.height - s.H + s.enter * s.H)
      s.cur = -1
      // anchors land on a moment where the scene is already readable
      if (s.anchors) Object.keys(s.anchors).forEach(function (id) {
        var a = document.getElementById(id)
        if (a) a.style.top = Math.max(0, s.anchors[id] * s.total - s.enter * s.H) + 'px'
      })
    })
    units() // thumbnails got their pixel widths in measure()
  }

  var running = false, lastTs = 0, scrollY = window.scrollY, adv = null
  var TAU = COARSE ? 95 : 80   // ms; smoothing time constant
  function targets() {
    scrollY = window.scrollY
    scenes.forEach(function (s) { s.target = clamp((scrollY + s.enter * s.H - s.top) / s.total) })
  }
  function tick(ts) {
    var dt = lastTs ? Math.min(64, ts - lastTs) : 16
    lastTs = ts
    var busy = false
    var vh = window.innerHeight
    var a = 1 - Math.exp(-dt / TAU)
    scenes.forEach(function (s) {
      var near = scrollY > s.top - vh * 1.4 && scrollY < s.top + s.height + vh * 0.4
      var next
      if (!near || s.cur < 0) next = s.target            // off-screen: snap, no work
      else {
        next = s.cur + (s.target - s.cur) * a
        if (Math.abs(s.target - next) < 0.0004) next = s.target
        else busy = true
      }
      var moved = stepTweens(s, near ? dt : 1e9)
      if (next !== s.cur || moved) { s.cur = next; s.update(next) }
      if (tweensPending(s)) busy = true
      if (s.live && near) { s.animate(ts); busy = true }
    })
    if (adv) {
      var t = clamp((ts - adv.start) / adv.dur)
      window.scrollTo(0, Math.round(lerp(adv.from, adv.to, eio(t))))
      targets()
      if (t >= 1) { adv = null; root.style.scrollBehavior = '' }
      busy = true
    }
    if (busy) requestAnimationFrame(tick)
    else { running = false; lastTs = 0 }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick) } }

  function onScroll() {
    targets()
    if (navBar) {
      var docH = root.scrollHeight - window.innerHeight
      navBar.style.setProperty('--page-p', docH > 0 ? (scrollY / docH).toFixed(4) : 0)
    }
    if (MOTION) kick()
  }

  var lastW = window.innerWidth
  function remeasure() { measureAll(); targets(); kick() }
  if (MOTION) {
    measureAll(); targets()
    // ---- intro: at the very top, one short scroll/swipe/key glides to Channel Prompt ----
    var promptScene = scenes.filter(function (s) { return s.el.getAttribute('data-scene') === 'prompt' })[0]
    var atTop = function () { return window.scrollY <= 10 && !$('dialog[open]') && !(menu && !menu.hidden) }
    var startAdvance = function () {
      if (adv || !promptScene) return
      // land where the channel and the first videos are already on screen
      var to = Math.round(promptScene.top - promptScene.enter * promptScene.H + 0.27 * promptScene.total)
      root.style.scrollBehavior = 'auto'   // CSS smooth scrolling would fight the glide
      adv = { from: window.scrollY, to: to, start: performance.now(), dur: COARSE ? 1250 : 1450 }
      kick()
    }
    window.addEventListener('wheel', function (e) {
      if (adv) { e.preventDefault(); return }
      if (e.deltaY > 0 && atTop()) { e.preventDefault(); startAdvance() }
    }, { passive: false })
    var touchY = null
    window.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY }, { passive: true })
    window.addEventListener('touchmove', function (e) {
      if (adv) { if (e.cancelable) e.preventDefault(); return }
      if (touchY == null || !atTop()) return
      if (touchY - e.touches[0].clientY > 6) { if (e.cancelable) e.preventDefault(); startAdvance() }
    }, { passive: false })
    window.addEventListener('keydown', function (e) {
      var down = /^(ArrowDown|PageDown| |Spacebar)$/.test(e.key)
      if (!down || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target.tagName || ''))) return
      if (adv) { e.preventDefault(); return }
      if (atTop()) { e.preventDefault(); startAdvance() }
    })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', function () {
      // the mobile URL bar only changes the height: layout is in svh/vh, nothing to re-measure
      if (window.innerWidth === lastW) return
      lastW = window.innerWidth
      remeasure()
    })
    window.addEventListener('orientationchange', function () { setTimeout(remeasure, 250) })
    window.addEventListener('load', remeasure)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure)
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { remeasure() })
      ro.observe(document.body)
    }
    kick()
  } else {
    units()
    window.addEventListener('load', units)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(units)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', function () { units(); scenes.forEach(function (s) { if (s.lens !== undefined) s.measure() }) })
    onScroll()
  }

  // =====================================================================
  // BACKGROUND PARTICLES (constellation drift; scroll parallax on desktop only)
  // =====================================================================
  var cv = $('.bg-particles')
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d')
    var acc = (getComputedStyle(root).getPropertyValue('--accent-rgb') || '255,255,255').trim()
    var dpr = Math.min(window.devicePixelRatio || 1, COARSE ? 1 : 1.5)
    var PW = 0, PH = 0, pts = []
    var frameGap = COARSE ? 33 : 0, lastDraw = 0
    var size = function () {
      PW = window.innerWidth; PH = window.innerHeight
      cv.width = Math.round(PW * dpr); cv.height = Math.round(PH * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      var n = PW < 700 ? 24 : 56
      if (pts.length !== n) {
        pts = []
        for (var i = 0; i < n; i++) {
          var z = 0.25 + Math.random() * 0.75
          pts.push({ x: Math.random() * PW, y: Math.random() * PH, z: z, vx: (Math.random() - 0.5) * 0.12 * z, vy: (Math.random() - 0.5) * 0.12 * z, red: Math.random() < 0.35 })
        }
      }
    }
    var draw = function () {
      ctx.clearRect(0, 0, PW, PH)
      var sy = COARSE ? 0 : window.scrollY, i, j, a, b
      var P = pts.map(function (p) {
        return { x: p.x, y: ((p.y - sy * 0.06 * p.z) % PH + PH) % PH, z: p.z, red: p.red }
      })
      ctx.lineWidth = 1
      for (i = 0; i < P.length; i++) {
        for (j = i + 1; j < P.length; j++) {
          a = P[i]; b = P[j]
          var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy
          if (d2 < 15000) {
            ctx.strokeStyle = 'rgba(' + acc + ',' + (0.07 * (1 - d2 / 15000)).toFixed(3) + ')'
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
      }
      for (i = 0; i < P.length; i++) {
        a = P[i]
        ctx.fillStyle = a.red ? 'rgba(' + acc + ',' + (0.25 + a.z * 0.35).toFixed(2) + ')' : 'rgba(255,255,255,' + (0.08 + a.z * 0.22).toFixed(2) + ')'
        ctx.beginPath(); ctx.arc(a.x, a.y, 0.6 + a.z * 1.3, 0, 6.2832); ctx.fill()
      }
    }
    var ptick = function (ts) {
      if (!document.hidden && ts - lastDraw >= frameGap) {
        var step = lastDraw ? Math.min(3, (ts - lastDraw) / 16.7) : 1
        lastDraw = ts
        pts.forEach(function (p) {
          p.x += p.vx * step; p.y += p.vy * step
          if (p.x < -10) p.x = PW + 10; else if (p.x > PW + 10) p.x = -10
          if (p.y < -10) p.y = PH + 10; else if (p.y > PH + 10) p.y = -10
        })
        draw()
      }
      requestAnimationFrame(ptick)
    }
    size()
    var pw = window.innerWidth
    window.addEventListener('resize', function () {
      if (COARSE && window.innerWidth === pw) return   // ignore URL-bar height changes on phones
      pw = window.innerWidth; size(); if (!MOTION || CALM) draw()
    })
    if (MOTION && !CALM) requestAnimationFrame(ptick)
    else draw()
  }

  // =====================================================================
  // "AÇILINCA HABER VER" MODAL
  // =====================================================================
  var dlg = $('#notify')
  if (dlg && typeof dlg.showModal === 'function') {
    var form = $('.notify-form', dlg), done = $('.notify-done', dlg), opts = $('.notify-opts', dlg)
    var mailToggle = $('[data-mail-toggle]', dlg), waLink = $('[data-wa]', dlg)
    var msg = $('.notify-msg', dlg), submitBtn = $('button[type="submit"]', form), emailIn = form.elements.email
    var product = ''
    var doneHtml = $('.notify-done p', dlg).innerHTML
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

    var openNotify = function (name) {
      product = name
      $$('[data-product]', dlg).forEach(function (el) { el.textContent = name })
      waLink.href = 'https://wa.me/905377935090?text=' + encodeURIComponent('Merhaba, ' + name + ' açıldığında haber verir misiniz?')
      $('.notify-done p', dlg).innerHTML = doneHtml
      form.hidden = true; done.hidden = true; opts.hidden = false
      mailToggle.setAttribute('aria-expanded', 'false')
      msg.textContent = ''; msg.className = 'notify-msg'
      submitBtn.disabled = false; submitBtn.textContent = 'E-postama gönder'
      dlg.showModal()
    }
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-notify]')
      if (!t) return
      e.preventDefault()
      openNotify(t.getAttribute('data-notify'))
    })
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close()
    })
    mailToggle.addEventListener('click', function () {
      var open = form.hidden
      form.hidden = !open
      mailToggle.setAttribute('aria-expanded', String(open))
      if (open) setTimeout(function () { emailIn.focus() }, 30)
    })
    emailIn.addEventListener('input', function () { if (msg.textContent) { msg.textContent = ''; msg.className = 'notify-msg' } })
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var email = emailIn.value.trim()
      msg.className = 'notify-msg'; msg.textContent = ''
      if (!EMAIL_RE.test(email)) {
        msg.className = 'notify-msg err'; msg.textContent = 'Geçerli bir e-posta adresi yaz.'
        emailIn.focus(); return
      }
      submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor…'
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, product: product, website: form.elements.website.value })
      }).then(function (r) {
        return r.json().catch(function () { return {} }).then(function (d) { return { ok: r.ok, d: d } })
      }).then(function (res) {
        if (!res.ok) throw new Error(res.d.error || '')
        $$('[data-email]', dlg).forEach(function (el) { el.textContent = email })
        if (res.d.already) $('.notify-done p', dlg).textContent = 'Bu adres ' + product + ' listesinde zaten var. Açıldığında haber vereceğiz.'
        form.hidden = true; opts.hidden = true; done.hidden = false
        form.reset()
      }).catch(function (err) {
        msg.className = 'notify-msg err'
        msg.textContent = err.message || 'Şu an gönderemedik. WhatsApp seçeneğini deneyebilirsin.'
        submitBtn.disabled = false; submitBtn.textContent = 'E-postama gönder'
      })
    })
  }
})()
