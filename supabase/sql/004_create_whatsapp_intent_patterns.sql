create table if not exists public.search_intent_patterns (
  id bigint generated always as identity primary key,
  pattern_text text not null unique,
  pattern_type text not null default 'prefix',
  normalized_action text not null default 'route_lookup',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.search_intent_patterns (pattern_text, pattern_type, normalized_action, notes)
values
  ('quiero que me traigas el valor del flete de', 'prefix', 'route_lookup', 'Patron comercial largo'),
  ('quiero saber el costo de', 'prefix', 'route_lookup', 'Pregunta directa'),
  ('quiero saber el precio de', 'prefix', 'route_lookup', 'Pregunta directa'),
  ('calcula el valor de la ruta', 'prefix', 'route_lookup', 'Solicitud de calculo'),
  ('dime el costo de', 'prefix', 'route_lookup', 'Solicitud corta'),
  ('dime el valor de', 'prefix', 'route_lookup', 'Solicitud corta'),
  ('precio de', 'prefix', 'route_lookup', 'Patron corto'),
  ('valor de', 'prefix', 'route_lookup', 'Patron corto'),
  ('costo de', 'prefix', 'route_lookup', 'Patron corto'),
  ('necesito', 'prefix', 'route_lookup', 'Patron ambiguo frecuente')
on conflict (pattern_text) do update set
  pattern_type = excluded.pattern_type,
  normalized_action = excluded.normalized_action,
  notes = excluded.notes,
  updated_at = now();

create table if not exists public.whatsapp_message_patterns (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  phone text,
  event text,
  message_text text not null,
  cleaned_text text,
  matched_intent_pattern text,
  parse_success boolean not null default false,
  detected_origin text,
  detected_destination text,
  detected_vehicle text,
  detected_body_type text,
  detected_hours numeric,
  detected_tons numeric,
  municipios_detected jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_whatsapp_message_patterns_created_at on public.whatsapp_message_patterns (created_at desc);
create index if not exists idx_whatsapp_message_patterns_phone on public.whatsapp_message_patterns (phone);
create index if not exists idx_whatsapp_message_patterns_parse_success on public.whatsapp_message_patterns (parse_success);
