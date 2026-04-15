-- Fix para Supabase Security Advisor: asegurar public.route_queries
-- Esta tabla la escribe una Edge Function con service role, así que
-- habilitar RLS no rompe el flujo esperado.

alter table if exists public.route_queries enable row level security;

-- Sin políticas para anon/authenticated, la tabla queda cerrada para el Data API público.
-- El service role de la Edge Function sigue funcionando.

comment on table public.route_queries is 'Captura interna de consultas de rutas. Tabla cerrada al Data API publico; escritura via Edge Function con service role.';
