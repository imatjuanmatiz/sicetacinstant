create table if not exists public.plans_catalog (
  code text primary key,
  name text not null,
  description text,
  monthly_route_quota int not null default 30,
  premium_enabled boolean not null default false,
  premium_quota int not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans_catalog (
  code, name, description, monthly_route_quota, premium_enabled, premium_quota
)
values
  ('free', 'Free', 'Consulta SICETAC basica por WhatsApp', 30, false, 0),
  ('pro', 'Pro', 'Mayor volumen de consultas SICETAC por WhatsApp', 250, false, 0),
  ('premium', 'Premium', 'SICETAC y futuras referencias de mercado en plaza', 500, true, 100)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_route_quota = excluded.monthly_route_quota,
  premium_enabled = excluded.premium_enabled,
  premium_quota = excluded.premium_quota,
  updated_at = now();

create table if not exists public.whatsapp_contacts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_message_at timestamptz,
  first_route_at timestamptz,
  last_route_at timestamptz,
  phone text not null unique,
  profile_name text,
  lead_name text,
  company text,
  email text,
  lead_type text,
  status text not null default 'active',
  preferred_vehicle text,
  preferred_body_type text,
  plan_code text not null default 'free' references public.plans_catalog(code),
  plan_status text not null default 'active',
  monthly_route_quota int not null default 0,
  monthly_routes_used int not null default 0,
  premium_enabled boolean not null default false,
  premium_quota int not null default 0,
  premium_used int not null default 0,
  total_routes_analyzed bigint not null default 0,
  billing_cycle_started_at timestamptz,
  billing_cycle_ends_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_whatsapp_contacts_phone on public.whatsapp_contacts (phone);
create index if not exists idx_whatsapp_contacts_plan_code on public.whatsapp_contacts (plan_code);
create index if not exists idx_whatsapp_contacts_last_seen_at on public.whatsapp_contacts (last_seen_at desc);

create table if not exists public.whatsapp_route_queries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  phone text not null references public.whatsapp_contacts(phone) on delete cascade,
  event text not null default 'route_consulted',
  query_kind text not null default 'route_summary',
  query_text text,
  origin text,
  destination text,
  vehicle text,
  body_type text,
  trip_mode text,
  requested_hours numeric,
  requested_tons numeric,
  value_per_ton_requested boolean not null default false,
  used_last_route_context boolean not null default false,
  used_default_vehicle boolean not null default false,
  used_default_body_type boolean not null default false,
  sicetac_reference_total numeric,
  sicetac_reference_bucket text,
  market_reference_total numeric,
  market_reference_bucket text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_whatsapp_route_queries_created_at on public.whatsapp_route_queries (created_at desc);
create index if not exists idx_whatsapp_route_queries_phone on public.whatsapp_route_queries (phone);
create index if not exists idx_whatsapp_route_queries_origin_destination on public.whatsapp_route_queries (origin, destination);
