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
 * - With prefers-reduced-motion the <html> has no .motion class: nothing is pinned or animated and
 *   the static (fully assembled) layout shows. */
(function () {
  'use strict'
  var root = document.documentElement
  var MOTION = root.classList.contains('motion')
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
  // HERO (timed: one scroll plays the whole zoom)
  // =====================================================================
  var hero = (function () {
    var s = $('[data-scene="hero"]')
    if (!s) return null
    var h = {
      giant: k(s, 'giant'), box: k(s, 'box'), statement: k(s, 'statement'), hint: k(s, 'hint'),
      rest: $$('.chip-outline, .hero-title, .hero-lead, .hero-cta', k(s, 'content')),
      p: 0, from: 0, to: 0, start: 0, dur: 1, running: false
    }
    h.update = function (p) {
      var g = eio(seg(p, 0.04, 0.78))
      show(h.giant, 1 - seg(p, 0.42, 0.74), 'translate3d(0,0,0) scale(' + r3(1 + g * 8) + ')')
      var c = eo(seg(p, 0, 0.3))
      h.rest.forEach(function (el, i) {
        var dir = i === 0 ? -1 : 1
        show(el, 1 - c, 'translate3d(0,' + r3(dir * c * (50 + i * 18)) + 'px,0)')
      })
      var b = eio(seg(p, 0.06, 0.82))
      show(h.box, seg(p, 0.02, 0.16) * (1 - seg(p, 0.58, 0.84)), 'translate(-50%,-50%) scale(' + r3(0.6 + b * 9) + ') rotate(' + r3(b * 45) + 'deg)')
      var st = eo(seg(p, 0.58, 1))
      show(h.statement, st, 'translateY(-50%) translateY(' + r3((1 - st) * 40) + 'px) scale(' + r3(lerp(0.9, 1, st)) + ')')
      show(h.hint, 1 - seg(p, 0, 0.08))
    }
    h.play = function (to, now) {
      if (to === h.to) return
      h.from = h.p; h.to = to; h.start = now
      h.dur = (to ? 1500 : 900) * Math.abs(to - h.p) + 1
      h.running = true
    }
    h.tick = function (now) {
      if (!h.running) return false
      var t = clamp((now - h.start) / h.dur)
      h.p = lerp(h.from, h.to, h.to ? eio(t) : eo(t))
      h.update(h.p)
      if (t >= 1) h.running = false
      return h.running
    }
    return h
  })()

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
    scenes.push(def)
  }
  function fitInto(card) {
    var cell = card.parentNode
    return Math.min(1, (cell.clientHeight - 8) / card.offsetHeight, cell.clientWidth / card.offsetWidth)
  }

  // ---------- 1 · CHANNEL PROMPT ----------
  addScene('prompt', {
    enter: 0.55,
    anchors: { prompt: 0.3 },
    init: function () {
      var s = this.el
      this.text = k(s, 'text'); this.mock = k(s, 'mock'); this.chan = k(s, 'chan')
      this.rows = $$('[data-row]', s); this.checks = this.rows.map(function (r) { return $('b', r) })
      this.scan = k(s, 'scan'); this.out = k(s, 'out'); this.copy = k(s, 'copy'); this.claude = k(s, 'claude')
      this.type = k(s, 'type'); this.full = this.type.textContent; this.shown = -1
      this.steps = $$('li', k(s, 'flow'))
    },
    measure: function () { this.fit = fitInto(this.mock) },
    update: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.mock, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var step = p < 0.17 ? 0 : p < 0.5 ? 1 : p < 0.82 ? 2 : 3
      if (step !== this.step) { this.step = step; this.steps.forEach(function (li, i) { li.classList.toggle('on', i <= step) }) }

      var c = eo(seg(p, 0.08, 0.16))
      show(this.chan, c, 'translate3d(' + r3((1 - c) * -30) + 'px,0,0)')
      var o = eo(seg(p, 0.5, 0.58))
      var scanT = seg(p, 0.38, 0.5)
      var self = this
      this.rows.forEach(function (row, i) {
        var t = eo(seg(p, 0.17 + i * 0.035, 0.25 + i * 0.035))
        show(row, t * (1 - 0.75 * o), 'translate3d(' + r3((1 - t) * 40) + 'px,0,0)')
        var ck = seg(scanT, (i + 0.3) / 5, (i + 0.9) / 5)
        show(self.checks[i], ck, 'scale(' + r3(lerp(0.4, 1, eo(ck))) + ')')
      })
      show(this.scan, scanT > 0 && scanT < 1 ? 1 : 0, 'translate3d(0,' + r3(scanT * 470 - 20) + '%,0)')

      show(this.out, o, 'translate3d(0,' + r3((1 - o) * 40) + 'px,0) scale(' + r3(lerp(0.96, 1, o)) + ')')
      var ty = seg(p, 0.56, 0.82)
      var n = Math.round(this.full.length * ty)
      if (n !== this.shown) {
        this.shown = n
        this.type.textContent = this.full.slice(0, n)
        this.type.classList.toggle('typing', ty > 0 && ty < 1)
      }
      show(this.copy, seg(p, 0.82, 0.86))
      var cl = eo(seg(p, 0.84, 0.92))
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
    update: function (p) {
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
      this.rivals = $$('[data-rival]', s); this.challenge = k(s, 'challenge'); this.track = k(s, 'track')
      this.fill = k(s, 'fill'); this.dots = $$('[data-dot]', s)
    },
    measure: function () { this.fit = fitInto(this.card) },
    update: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + r3((1 - t0) * 36) + 'px,0)')
      show(this.card, t0, 'perspective(1400px) translate3d(0,' + r3((1 - t0) * 80) + 'px,0) rotateX(' + r3((1 - t0) * 22) + 'deg) scale(' + r3(lerp(0.9, 1, t0) * this.fit) + ')')

      var ty = seg(p, 0.1, 0.26)
      var n = Math.round(this.fullUrl.length * ty)
      if (n !== this.shown) {
        this.shown = n
        this.url.textContent = this.fullUrl.slice(0, n)
        this.urlWrap.classList.toggle('typing', ty < 1)
      }
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
      if (MOTION) {
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
    update: function (p) {
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
    }
  })

  if (!MOTION) $$('.flow li').forEach(function (li) { li.classList.add('on') })
  scenes.forEach(function (s) { s.init() })

  // ---------- engine ----------
  var gridEl = $('.bg-grid')  // animated by CSS only (compositor), never by scroll
  var heroEnd = 0
  function measureAll() {
    scenes.forEach(function (s) {
      if (s.measure) s.measure()
      s.H = s.sticky.offsetHeight || window.innerHeight
      s.top = absTop(s.el)
      s.height = s.el.offsetHeight
      s.total = Math.max(1, s.height - s.H + s.enter * s.H)
      s.cur = -1
      // anchors land on a moment where the scene is already readable
      if (s.anchors) Object.keys(s.anchors).forEach(function (id) {
        var a = document.getElementById(id)
        if (a) a.style.top = Math.max(0, s.anchors[id] * s.total - s.enter * s.H) + 'px'
      })
    })
    if (hero) { var hs = $('[data-scene="hero"]'); heroEnd = absTop(hs) + hs.offsetHeight }
  }

  var running = false, lastTs = 0, scrollY = window.scrollY
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
      if (next !== s.cur) { s.cur = next; s.update(next) }
      if (s.live && near) { s.animate(ts); busy = true }
    })
    if (hero && hero.tick(ts)) busy = true
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
    if (hero && MOTION) hero.play(scrollY > 6 ? 1 : 0, performance.now())
    if (MOTION) kick()
  }

  var lastW = window.innerWidth
  function remeasure() { measureAll(); targets(); kick() }
  if (MOTION) {
    measureAll(); targets()
    if (hero) {
      // landing in the middle of the page (reload, anchor): no intro replay
      if (scrollY > 6) { hero.p = 1; hero.to = 1; hero.update(1) } else hero.update(0)
      // the very first wheel/touch at the top starts the zoom immediately
      var intro = function (e) {
        if (window.scrollY > 6) return
        if (e.type === 'wheel' && e.deltaY <= 0) return
        hero.play(1, performance.now()); kick()
      }
      window.addEventListener('wheel', intro, { passive: true })
      window.addEventListener('touchmove', intro, { passive: true })
      window.addEventListener('keydown', function (e) { if (/^(ArrowDown|PageDown|Space| )$/.test(e.key || e.code)) intro(e) })
    }
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
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', function () { scenes.forEach(function (s) { if (s.lens !== undefined) s.measure() }) })
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
      pw = window.innerWidth; size(); if (!MOTION) draw()
    })
    if (MOTION) requestAnimationFrame(ptick)
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
