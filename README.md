# Sicetac Instant

MVP web sin LLM: extrae origen/destino con reglas simples y llama al API SICETAC.

## Sicetac Lab (sandbox)
Esta copia incluye formulario estructurado (origen, destino, vehiculo, carroceria).

## Env
- `SICETAC_API_URL` (default: https://sicetac-api-mcp.onrender.com/consulta)
- `ROUTE_CAPTURE_WEBHOOK_URL` (opcional): URL para capturar consultas de usuarios.
  - Se envia un POST JSON por cada calculo exitoso.
- `CAPTURE_WEBHOOK_SECRET` (opcional): secreto compartido para proteger el webhook de captura.

## Dev
```bash
npm install
npm run dev
```

## API
POST `/api/route`

Body (JSON):
```json
{
  "origen": "Bogotá",
  "destino": "Barranquilla",
  "vehiculo": "C3S3",
  "carroceria": "GENERAL",
  "resumen": true
}
```

Respuesta:
```json
{
  "ok": true,
  "normalized": {
    "meta": { "origen": "Bogotá", "destino": "Barranquilla" },
    "routes": [
      {
        "nombre": "Ruta principal",
        "id_sice": 106,
        "total_viaje_cop": "$ 7.531.476",
        "peajes_cop": "$ 869.600"
      }
    ],
    "texto": "Ruta consultada: ..."
  },
  "raw": {}
}
```
