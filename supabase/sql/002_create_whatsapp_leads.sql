create table if not exists public.whatsapp_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null,
  channel text not null default 'whatsapp',
  phone text not null,
  profile_name text,
  lead_name text,
  company text,
  email text,
  message text,
  route_origin text,
  route_destination text,
  vehicle text,
  body_type text,
  trip_mode text,
  payload jsonb not null
);

create index if not exists idx_whatsapp_leads_created_at on public.whatsapp_leads (created_at desc);
create index if not exists idx_whatsapp_leads_phone on public.whatsapp_leads (phone);
create index if not exists idx_whatsapp_leads_event on public.whatsapp_leads (event);
