-- "Açılınca haber ver" listesi (karakutuyoutube.com → /api/notify)
-- Dashboard ile AYNI Supabase projesinde, SQL Editor'de çalıştır. Tekrar çalıştırmak güvenli.
create table if not exists public.launch_waitlist (
  id          bigint generated always as identity primary key,
  email       text not null check (char_length(email) between 5 and 254 and email = lower(email)),
  product     text not null check (product in ('Channel Prompt', 'Thumbnail Studio')),
  source      text not null default 'hub',
  created_at  timestamptz not null default now(),
  notified_at timestamptz,            -- sistem açılıp haber verildiğinde doldur
  unique (email, product)
);

-- RLS açık ve hiç policy yok: tabloya sadece service role (Vercel fonksiyonu) erişebilir.
alter table public.launch_waitlist enable row level security;

-- Örnek: Thumbnail Studio açıldığında haber verilecekler
-- select email from public.launch_waitlist where product = 'Thumbnail Studio' and notified_at is null order by created_at;
