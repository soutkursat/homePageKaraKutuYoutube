/* karakutuyoutube.com — scroll scenes, particles, nav. No dependencies.
 * Every scene is a tall <section class="scene"> with a sticky child. Its scroll
 * progress p (0 → 1) drives transforms/opacity only (GPU-friendly).
 * With prefers-reduced-motion the <html> has no .motion class: scenes are not
 * pinned, nothing is animated and the static (fully assembled) layout shows. */
(function () {
  'use strict'
  var root = document.documentElement
  var MOTION = root.classList.contains('motion')

  // ---------- helpers ----------
  function clamp(v, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return v < a ? a : v > b ? b : v }
  function seg(p, a, b) { return clamp((p - a) / (b - a)) }
  function lerp(a, b, t) { return a + (b - a) * t }
  function eo(t) { return 1 - Math.pow(1 - t, 3) }                                     // ease-out
  function eio(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }   // ease-in-out
  function $(s, c) { return (c || document).querySelector(s) }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)) }
  function k(scene, name) { return $('[data-k="' + name + '"]', scene) }
  function show(el, op, tf) {
    el.style.opacity = op
    if (tf != null) el.style.transform = tf
    el.style.visibility = op < 0.02 ? 'hidden' : 'visible'
  }
  var mqStack = window.matchMedia('(max-width: 900px)')

  // ---------- year ----------
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear() })

  // ---------- nav: mobile menu + progress ----------
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
    mqStack.addEventListener && mqStack.addEventListener('change', function () { setMenu(false) })
  }
  var navBar = $('.nav-progress')

  // ---------- card spotlight ----------
  $$('.spot').forEach(function (el) {
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
  // SCENES
  // =====================================================================
  var scenes = []
  function addScene(name, def) {
    var el = $('[data-scene="' + name + '"]')
    if (!el) return
    def.el = el
    def.enter = def.enter || 0
    def.p = -1
    scenes.push(def)
  }

  // ---------- 1 · HERO ----------
  addScene('hero', {
    init: function () {
      var s = this.el
      this.giant = k(s, 'giant'); this.content = k(s, 'content'); this.box = k(s, 'box')
      this.statement = k(s, 'statement'); this.hint = k(s, 'hint')
      this.rest = $$('.chip-outline, .hero-title, .hero-lead, .hero-cta', this.content)
    },
    update: function (p) {
      var g = eio(seg(p, 0.06, 0.78))
      this.giant.style.transform = 'scale(' + (1 + g * 7.5) + ')'
      this.giant.style.opacity = 1 - seg(p, 0.42, 0.76)
      var c = eo(seg(p, 0.02, 0.32))
      this.rest.forEach(function (el, i) {
        var dir = i === 0 ? -1 : 1
        show(el, 1 - c, 'translate3d(0,' + (dir * c * (50 + i * 18)) + 'px,0)')
      })
      var b = eio(seg(p, 0.08, 0.8))
      this.box.style.opacity = seg(p, 0.04, 0.2) * (1 - seg(p, 0.6, 0.85))
      this.box.style.transform = 'translate(-50%,-50%) scale(' + (0.6 + b * 9) + ') rotate(' + (b * 45) + 'deg)'
      var st = eo(seg(p, 0.6, 0.88))
      show(this.statement, st, 'translateY(-50%) translateY(' + (1 - st) * 40 + 'px) scale(' + lerp(0.92, 1, st) + ')')
      this.hint.style.opacity = 1 - seg(p, 0, 0.06)
    }
  })

  // ---------- 2 · THUMBNAIL STUDIO → DASHBOARD ----------
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
        'perspective(1400px) translate3d(' + tx + 'px,' + ty + 'px,0) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(' + sc + ')')

      // thumbnails pop out of the card, hang around, then dive back in
      var back = eio(seg(p, 0.48, 0.58))
      this.thumbs.forEach(function (el, i) {
        var t = eo(seg(p, 0.15 + i * 0.045, 0.3 + i * 0.045))
        var o = t * (1 - back)
        var tg = self.targets[i]
        var float = Math.sin(p * 40 + i * 1.7) * 5 * o
        show(el, clamp(t * 1.6) * (1 - back),
          'translate(-50%,-50%) translate3d(' + tg[0] * o + 'px,' + (tg[1] * o + float) + 'px,0) rotate(' + tg[2] * o + 'deg) scale(' + lerp(0.3, 1, o) + ')')
      })

      var aIn = eo(seg(p, 0.04, 0.14)), aOut = seg(p, 0.46, 0.55)
      show(this.textA, aIn * (1 - aOut), 'translate3d(0,' + ((1 - aIn) * 36 - aOut * 36) + 'px,0)')

      // B · dashboard shell appears where the card landed, pieces assemble
      var sh = eo(seg(p, 0.6, 0.7))
      show(this.dash, sh, this.stack
        ? 'perspective(1400px) translate3d(' + (1 - sh) * W * 0.7 + 'px,0,0) rotateY(' + (-(1 - sh) * 32) + 'deg)'
        : 'none')
      this.pieces.forEach(function (pc, i) {
        var last = i === self.pieces.length - 1
        var t = last ? eo(seg(p, 0.86, 0.93)) : eo(seg(p, 0.63 + i * 0.03, 0.76 + i * 0.03))
        var u = 1 - t
        show(pc.el, t, 'translate3d(' + pc.fx * self.DW * u + 'px,' + pc.fy * self.DW * u + 'px,0) rotate(' + pc.r * u + 'deg) scale(' + lerp(0.9, 1, t) + ')')
      })
      var bIn = eo(seg(p, 0.7, 0.8))
      show(this.textB, bIn, 'translate3d(0,' + (1 - bIn) * 36 + 'px,0)')
    }
  })

  // ---------- 3 · CHANNEL PROMPT ----------
  addScene('prompt', {
    enter: 0.55,
    anchors: { prompt: 0.32 },
    init: function () {
      var s = this.el
      this.text = k(s, 'text'); this.mock = k(s, 'mock'); this.chan = k(s, 'chan')
      this.rows = $$('[data-row]', s); this.checks = this.rows.map(function (r) { return $('b', r) })
      this.scan = k(s, 'scan'); this.out = k(s, 'out'); this.copy = k(s, 'copy'); this.claude = k(s, 'claude')
      this.type = k(s, 'type'); this.full = this.type.textContent; this.shown = -1
      this.steps = $$('li', k(s, 'flow'))

    },
    measure: function () {
      // fit the mock into its cell (its height depends on content, not on the cell)
      var cell = this.mock.parentNode
      this.fit = Math.min(1, (cell.clientHeight - 8) / this.mock.offsetHeight, cell.clientWidth / this.mock.offsetWidth)
    },
    update: function (p) {
      var t0 = eo(seg(p, 0, 0.12))
      show(this.text, t0, 'translate3d(0,' + (1 - t0) * 36 + 'px,0)')
      show(this.mock, t0, 'perspective(1400px) translate3d(0,' + (1 - t0) * 80 + 'px,0) rotateX(' + (1 - t0) * 22 + 'deg) scale(' + lerp(0.9, 1, t0) * this.fit + ')')

      var step = p < 0.17 ? 0 : p < 0.5 ? 1 : p < 0.82 ? 2 : 3
      this.steps.forEach(function (li, i) { li.classList.toggle('on', i <= step) })

      var c = eo(seg(p, 0.08, 0.16))
      show(this.chan, c, 'translate3d(' + (1 - c) * -30 + 'px,0,0)')
      var o = eo(seg(p, 0.5, 0.58))
      var scanT = seg(p, 0.38, 0.5)
      var self = this
      this.rows.forEach(function (row, i) {
        var t = eo(seg(p, 0.17 + i * 0.035, 0.25 + i * 0.035))
        show(row, t * (1 - 0.75 * o), 'translate3d(' + (1 - t) * 40 + 'px,0,0)')
        var ck = seg(scanT, (i + 0.3) / 5, (i + 0.9) / 5)
        self.checks[i].style.opacity = ck
        self.checks[i].style.transform = 'scale(' + lerp(0.4, 1, eo(ck)) + ')'
      })
      this.scan.style.opacity = scanT > 0 && scanT < 1 ? 1 : 0
      this.scan.style.transform = 'translate3d(0,' + (scanT * 470 - 20) + '%,0)'

      show(this.out, o, 'translate3d(0,' + (1 - o) * 40 + 'px,0) scale(' + lerp(0.96, 1, o) + ')')
      var ty = seg(p, 0.56, 0.82)
      var n = Math.round(this.full.length * ty)
      if (n !== this.shown) {
        this.shown = n
        this.type.textContent = this.full.slice(0, n)
        this.type.classList.toggle('typing', ty > 0 && ty < 1)
      }
      this.copy.style.opacity = seg(p, 0.82, 0.86)
      var cl = eo(seg(p, 0.84, 0.92))
      show(this.claude, cl, 'translate3d(0,' + (1 - cl) * 24 + 'px,0) scale(' + lerp(0.94, 1, cl) + ')')
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
      for (var i = 0; i < this.nodes.length; i++) {
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
      var self = this
      this.loop = function (ts) {
        if (!self.live) { self.raf = 0; return }
        self.dots.forEach(function (d, i) {
          var L = self.lens[i]; if (!L) return
          var dir = i % 2 ? -1 : 1
          var f = ((ts / 2600 + i * 0.23) % 1 + 1) % 1
          if (dir < 0) f = 1 - f
          var pt = self.lines[i].getPointAtLength(f * L)
          d.setAttribute('cx', pt.x); d.setAttribute('cy', pt.y)
          d.style.opacity = String(Math.sin(f * Math.PI) * 0.95)
        })
        self.raf = requestAnimationFrame(self.loop)
      }
      if (!MOTION) { this.measure() }
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
      show(this.head, h, 'translate3d(0,' + (1 - h) * 36 + 'px,0)')
      var c = eo(seg(p, 0.08, 0.22))
      show(this.core, c, 'translate(-50%,-50%) scale(' + lerp(0.4, 1, c) + ')')
      var self = this
      this.nodes.forEach(function (n, i) {
        var l = eio(seg(p, 0.2 + i * 0.06, 0.4 + i * 0.06))
        self.lines[i].style.strokeDashoffset = String(1 - l)
        self.ghosts[i].style.opacity = String(c)
        var t = eo(seg(p, 0.32 + i * 0.06, 0.44 + i * 0.06))
        show(n, t, 'translate(-50%,-50%) scale(' + lerp(0.6, 1, t) + ')')
      })
      var live = p > 0.66 && p < 1
      if (live !== this.live) {
        this.live = live
        if (live && !this.raf) this.raf = requestAnimationFrame(this.loop)
        if (!live) this.dots.forEach(function (d) { d.style.opacity = '0' })
      }
    }
  })

  if (!MOTION) $$('.flow li').forEach(function (li) { li.classList.add('on') })

  // ---------- scene engine ----------
  scenes.forEach(function (s) { s.init() })

  function measureAll() {
    var vh = window.innerHeight
    scenes.forEach(function (s) {
      if (s.measure) s.measure()
      s.total = Math.max(1, s.el.offsetHeight - vh + s.enter * vh)
      s.p = -1
      // anchors land on a moment where the scene is already readable
      if (s.anchors) Object.keys(s.anchors).forEach(function (id) {
        var a = document.getElementById(id)
        if (a) a.style.top = Math.max(0, s.anchors[id] * s.total - s.enter * vh) + 'px'
      })
    })
  }

  var queued = false
  function frame() {
    queued = false
    var vh = window.innerHeight, y = window.scrollY
    var docH = root.scrollHeight - vh
    if (navBar) navBar.style.setProperty('--page-p', docH > 0 ? (y / docH).toFixed(4) : 0)
    if (gridEl) gridEl.style.setProperty('--grid-y', (-(y * 0.12) % 56).toFixed(2) + 'px')
    if (!MOTION) return
    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect()
      if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) {
        if (s.live && s.update) s.update(r.top > 0 ? 0 : 1)
        return
      }
      var p = clamp((s.enter * vh - r.top) / s.total)
      if (Math.abs(p - s.p) < 0.0002) return
      s.p = p
      s.update(p)
    })
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(frame) } }

  var gridEl = $('.bg-grid')
  var lastW = window.innerWidth, lastH = window.innerHeight
  function onResize() {
    // mobile URL-bar show/hide only changes height a little: skip heavy re-measure
    var w = window.innerWidth, h = window.innerHeight
    if (w === lastW && Math.abs(h - lastH) < 120 && scenes[0] && scenes[0].total) { request(); return }
    lastW = w; lastH = h
    measureAll(); request()
  }

  if (MOTION) {
    measureAll()
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('load', function () { measureAll(); request() })
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measureAll(); request() })
    frame()
  } else {
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', function () { scenes.forEach(function (s) { if (s.measure && s.lens !== undefined) s.measure() }) })
    frame()
  }

  // =====================================================================
  // BACKGROUND PARTICLES (constellation, drifts + parallax with scroll)
  // =====================================================================
  var cv = $('.bg-particles')
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d')
    var acc = (getComputedStyle(root).getPropertyValue('--accent-rgb') || '255,255,255').trim()
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    var W = 0, H = 0, pts = []
    function size() {
      W = window.innerWidth; H = window.innerHeight
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      var n = W < 700 ? 26 : 56
      if (pts.length !== n) {
        pts = []
        for (var i = 0; i < n; i++) {
          var z = 0.25 + Math.random() * 0.75
          pts.push({ x: Math.random() * W, y: Math.random() * H, z: z, vx: (Math.random() - 0.5) * 0.12 * z, vy: (Math.random() - 0.5) * 0.12 * z, red: Math.random() < 0.35 })
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H)
      var sy = window.scrollY, i, j, a, b
      var P = pts.map(function (p) {
        var y = ((p.y - sy * 0.06 * p.z) % H + H) % H
        return { x: p.x, y: y, z: p.z, red: p.red }
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
    function tick() {
      if (!document.hidden) {
        pts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10
          if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10
        })
        draw()
      }
      requestAnimationFrame(tick)
    }
    size()
    window.addEventListener('resize', function () { size(); if (!MOTION) draw() })
    if (MOTION) requestAnimationFrame(tick)
    else draw()
  }
})()
