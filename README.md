# karakutuyoutube.com

Kara Kutu YouTube Akademisi'nin tanıtım sayfası. Sistemleri (Mentörlük Paneli, Channel Prompt,
Thumbnail Studio) scroll ile ilerleyen sahnelerle tanıtır ve ziyaretçiyi panele ya da WhatsApp'a yönlendirir.

## Yerelde çalıştırma
Derleme adımı yok, statik bir site:

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Yayına alma (Vercel)
1. Vercel'de yeni proje → bu repo → Framework preset: **Other**, build komutu boş, output: kök dizin.
2. Domains: `karakutuyoutube.com` ve `www.karakutuyoutube.com` ekle (www, `vercel.json` ile apex'e yönlenir).
3. Natro DNS'te Vercel'in gösterdiği kayıtları **aynen** ekle. `dashboard` CNAME kaydına dokunma.

Ayrıntılar: [`CLAUDE.md`](CLAUDE.md), [`brand-kit/HUB-SITE.md`](brand-kit/HUB-SITE.md).

## "Açılınca haber ver" e-postası
`api/notify.js` e-postayı Supabase'e kaydeder ve Resend ile panel kayıt linkini gönderir.
1. Supabase (dashboard ile aynı proje) → SQL Editor → `supabase/launch_waitlist.sql` dosyasını çalıştır.
2. resend.com → Domains → `karakutuyoutube.com` ekle, gösterdiği DNS kayıtlarını Natro'ya ekle → API Key oluştur.
3. Vercel → bu proje → Settings → Environment Variables:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
   `MAIL_FROM` = `Kara Kutu YouTube Akademisi <bildirim@karakutuyoutube.com>` → sonra Redeploy.

Ayarlar yapılmadan e-posta seçeneği "şu an kapalı" der ve kullanıcıyı WhatsApp'a yönlendirir.
