# Sicetac Instant - Ultimas Actualizaciones

Fecha de corte: 2026-02-12

## 1) Integracion Frontend -> API SICETAC

- El frontend ahora consume el endpoint estructurado de Render (`/consulta`) para no perder campos de negocio.
- Si `SICETAC_API_URL` apunta por error a `/consulta_texto` o `/consulta_resumen`, se corrige automaticamente a `/consulta`.
- El request saliente incluye por defecto:
  - `vehiculo: "C3S3"`
  - `carroceria: "GENERAL"`
  - `resumen: true`

Archivo clave:
- `app/api/route/route.js`

## 2) Extractor de ruta de texto libre

Se robustecio el parser para detectar origen/destino en varios formatos:

- `origen a destino`
- `origen para destino`
- `origen -> destino`
- `origen - destino`

Tambien se limpia puntuacion y espacios extra.

Archivo clave:
- `app/api/route/route.js`

## 3) Soporte correcto de variantes (multi-ruta)

Se ajusto el mapeo para cubrir distintos nombres de campo devueltos por backend:

- `SICETAC_VARIANTES`
- `variantes`
- `VARIANTES`

Cada variante se normaliza con:

- nombre de ruta
- `id_sice`
- total viaje (y formateado COP)
- peajes (y formateado COP)
- totales por hora (`H2`, `H4`, `H8`)

Archivo clave:
- `app/api/route/route.js`

## 4) Formateo monetario y presentacion

- Se agrego formateo COP con `Intl.NumberFormat("es-CO", { currency: "COP" })`.
- El UI muestra resultados por tarjeta de ruta.
- Se muestran `H2/H4/H8` formateados cuando estan disponibles.

Archivo clave:
- `app/page.jsx`

## 5) Diagnostico tecnico en pantalla

Se agrego un bloque `Ver diagnostico tecnico` para depuracion operativa, incluyendo:

- `api_url` efectiva usada por el frontend
- deteccion de `totales` en payload
- llaves raiz recibidas
- payload `raw` completo

Archivos clave:
- `app/api/route/route.js`
- `app/page.jsx`

## 6) Verificacion local

Comando validado despues de los cambios:

```bash
npm run build
```

Resultado: build exitoso.

## 7) Nota operativa de despliegue Vercel

Si aparece `EPERM: uv_cwd` al desplegar con CLI:

1. Salir al home (`cd ~`) y volver a entrar al proyecto.
2. Verificar permisos de Terminal sobre `Documents` en macOS.
3. Reintentar:

```bash
cd "/Users/atiemppoia/Documents/New project/sicetacinstant"
vercel --prod
```

