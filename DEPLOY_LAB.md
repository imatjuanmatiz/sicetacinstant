# Sicetac Lab - Deployment Runbook

## 1) Crear proyecto separado en Vercel

Objetivo: no afectar `sicetacinstant` de produccion.

1. Crear nuevo proyecto Vercel: `sicetac-lab`.
2. Vincular esta carpeta:

```bash
cd "/Users/atiemppoia/Documents/New project/sicetac-lab"
vercel link --project sicetac-lab --scope atiemppo-s-projects
```

3. Variables en Vercel (Project Settings > Environment Variables):
- `SICETAC_API_URL=https://sicetac-api-mcp.onrender.com/consulta`
- `ROUTE_CAPTURE_WEBHOOK_URL=<url_edge_function>`
- `CAPTURE_WEBHOOK_SECRET=<secreto_fuerte>`

4. Deploy:

```bash
vercel --prod
```

## 2) Crear tabla de captura en Supabase

Ejecutar SQL:

Archivo:
- `supabase/sql/001_create_route_queries.sql`

En Supabase SQL editor, pegar y ejecutar el contenido completo.

## 3) Deploy de Edge Function de captura

Funcion incluida en:
- `supabase/functions/capture-route/index.ts`

Comandos sugeridos (en proyecto Supabase):

```bash
supabase functions deploy capture-route
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set CAPTURE_WEBHOOK_SECRET="<secreto_fuerte>"
```

URL esperada:

`https://<project-ref>.functions.supabase.co/capture-route`

Usar esa URL en `ROUTE_CAPTURE_WEBHOOK_URL` de Vercel.

## 4) Test rapido end-to-end

1. Abrir `sicetac-lab` web.
2. Consultar una ruta (ej. Bogota -> Medellin).
3. Verificar en Supabase:
- tabla `public.route_queries` con nuevo registro.

Test API local del frontend:

```bash
curl -s -X POST "https://<tu-lab>.vercel.app/api/route" \
  -H "Content-Type: application/json" \
  -d '{
    "origen":"Bogota",
    "destino":"Medellin",
    "vehiculo":"C3S3",
    "carroceria":"GENERAL",
    "resumen":true
  }'
```

## 5) Notas

- Si `ROUTE_CAPTURE_WEBHOOK_URL` no esta configurada, el sistema calcula normal y no registra captura.
- Si el webhook falla, no bloquea el resultado al usuario.
- El detalle tecnico se mantiene visible en `Ver diagnostico tecnico` para depuracion del lab.

