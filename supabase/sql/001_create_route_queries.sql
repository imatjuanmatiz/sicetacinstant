-- Tabla para registrar consultas de rutas calculadas desde sicetac-lab.
create table if not exists public.route_queries (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null default 'sicetac-lab',
  origin text not null,
  destination text not null,
  vehicle text not null default 'C3S3',
  body_type text not null default 'GENERAL',
  summary_mode boolean not null default true,
  mode text,
  month_code int,
  routes_count int not null default 0,
  payload jsonb not null
);

create index if not exists idx_route_queries_created_at on public.route_queries (created_at desc);
create index if not exists idx_route_queries_origin_destination on public.route_queries (origin, destination);

