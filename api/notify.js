/**
 * POST /api/notify — "Açılınca haber ver" e-posta kaydı (Vercel Function, bağımlılık yok).
 *
 * 1) E-postayı Supabase'teki launch_waitlist tablosuna yazar (aynı e-posta + ürün ikinci kez yazılmaz).
 * 2) Kişiye Resend ile panele kayıt linkini içeren bir e-posta gönderir.
 *
 * Vercel ortam değişkenleri (Settings → Environment Variables):
 *   SUPABASE_URL               Dashboard ile aynı Supabase projesi
 *   SUPABASE_SERVICE_ROLE_KEY  Sadece sunucuda kullanılır, tarayıcıya asla gitmez
 *   RESEND_API_KEY             resend.com → API Keys
 *   MAIL_FROM                  örn. "Kara Kutu YouTube Akademisi <bildirim@karakutuyoutube.com>"
 *   DASHBOARD_URL (isteğe bağlı) varsayılan https://dashboard.karakutuyoutube.com
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PRODUCTS = ['Channel Prompt', 'Thumbnail Studio']
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map() // ip -> [timestamps]; best effort, per function instance

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return list.length > MAX_PER_WINDOW
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function mail(product, registerUrl) {
  const subject = `${product} açılınca ilk sen öğreneceksin`
  const text = [
    'Merhaba,',
    '',
    `${product} hazır olduğunda bu adrese haber vereceğiz.`,
    '',
    'Beklerken Kara Kutu paneline kaydolabilirsin. Panelden mentörlük randevusu alır, kanal bilgilerini eklersin:',
    registerUrl,
    '',
    'Kayıt olurken bu e-posta adresini kullanman yeterli.',
    '',
    'Kara Kutu YouTube Akademisi',
    'WhatsApp: +90 537 793 50 90',
  ].join('\n')
  const p = esc(product)
  const html = `<!doctype html><html lang="tr"><body style="margin:0;background:#070708;padding:32px 12px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#f6f6f7">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#121216;border:1px solid #26262c;border-radius:20px">
<tr><td style="padding:32px 28px 8px">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="width:40px;height:40px;background:#e3122c;border-radius:12px;text-align:center;color:#fff;font-size:18px;line-height:40px">&#9654;</td>
<td style="padding-left:12px;font-weight:800;font-size:15px">Kara Kutu YouTube Akademisi</td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px 0">
<p style="margin:0 0 6px;color:#ff5a6e;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Listedesin</p>
<h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:900;letter-spacing:-.02em">${p} açılınca ilk sen öğreneceksin.</h1>
<p style="margin:0 0 14px;color:#a3a3ad;font-size:15px;line-height:1.6">Hazır olduğunda bu adrese haber vereceğiz. Beklerken Kara Kutu paneline kaydolabilirsin: mentörlük randevunu alır, kanal bilgilerini eklersin.</p>
</td></tr>
<tr><td style="padding:10px 28px 8px">
<a href="${esc(registerUrl)}" style="display:inline-block;background:#e3122c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:12px">Panele kayıt ol</a>
</td></tr>
<tr><td style="padding:14px 28px 30px;color:#6e6e78;font-size:12.5px;line-height:1.6">Kayıt olurken bu e-posta adresini kullanman yeterli. Sorun olursa WhatsApp’tan yaz: +90 537 793 50 90<br>Bu e-postayı karakutuyoutube.com üzerinden “Açılınca haber ver” dediğin için aldın.</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    return send(res, 405, { error: 'Sadece POST.' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch (e) { body = {} } }
  body = body || {}

  // honeypot: bots fill the hidden "website" field; pretend success
  if (body.website) return send(res, 200, { ok: true })

  const email = String(body.email || '').trim().toLowerCase()
  const product = String(body.product || '')
  if (!EMAIL_RE.test(email) || email.length > 254) return send(res, 400, { error: 'Geçerli bir e-posta adresi yaz.' })
  if (!PRODUCTS.includes(product)) return send(res, 400, { error: 'Bilinmeyen sistem.' })

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return send(res, 429, { error: 'Çok fazla deneme yaptın. Birkaç dakika sonra tekrar dene.' })

  const sbUrl = process.env.SUPABASE_URL
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  const registerUrl = (process.env.DASHBOARD_URL || 'https://dashboard.karakutuyoutube.com').replace(/\/$/, '') + '/giris'
  if (!sbUrl || !sbKey || !resendKey || !from) {
    return send(res, 503, { error: 'E-posta bildirimi şu an kapalı. WhatsApp seçeneğiyle haber alabilirsin.' })
  }

  const sbHeaders = { apikey: sbKey, authorization: `Bearer ${sbKey}`, 'content-type': 'application/json' }
  const table = `${sbUrl.replace(/\/$/, '')}/rest/v1/launch_waitlist`

  // 1) save (duplicates are ignored → empty array)
  let rows
  try {
    const r = await fetch(`${table}?on_conflict=email,product`, {
      method: 'POST',
      headers: { ...sbHeaders, prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ email, product, source: 'hub' }),
    })
    if (!r.ok) throw new Error(`supabase ${r.status} ${await r.text()}`)
    rows = await r.json()
  } catch (err) {
    console.error('[notify] save failed', err)
    return send(res, 502, { error: 'Kaydedemedik. Biraz sonra tekrar dene ya da WhatsApp’tan yaz.' })
  }
  if (Array.isArray(rows) && rows.length === 0) return send(res, 200, { ok: true, already: true })

  // 2) send the e-mail with the register link
  const m = mail(product, registerUrl)
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: m.subject, html: m.html, text: m.text }),
    })
    if (!r.ok) throw new Error(`resend ${r.status} ${await r.text()}`)
  } catch (err) {
    console.error('[notify] mail failed', err)
    // roll back so the person can try again
    const q = `email=eq.${encodeURIComponent(email)}&product=eq.${encodeURIComponent(product)}`
    await fetch(`${table}?${q}`, { method: 'DELETE', headers: sbHeaders }).catch(() => {})
    return send(res, 502, { error: 'E-postayı gönderemedik. Adresi kontrol edip tekrar dene ya da WhatsApp’ı kullan.' })
  }

  return send(res, 200, { ok: true })
}
