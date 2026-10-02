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
