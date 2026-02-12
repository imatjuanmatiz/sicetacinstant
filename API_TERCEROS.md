# API SICETAC - Guia Para Terceros

Esta guia documenta como consumir el servicio de calculo SICETAC desde sistemas externos.

## 1) Endpoint productivo

- Base URL: `https://sicetac-api-mcp.onrender.com`
- Endpoint principal: `POST /consulta`

URL completa:

`https://sicetac-api-mcp.onrender.com/consulta`

## 2) Request minimo

```json
{
  "origen": "Bogotá",
  "destino": "Medellín"
}
```

## 3) Request recomendado (controlado)

```json
{
  "origen": "Bogotá",
  "destino": "Medellín",
  "vehiculo": "C3S3",
  "carroceria": "GENERAL",
  "resumen": true
}
```

## 4) Parametros soportados

- `origen` (string, requerido)
- `destino` (string, requerido)
- `vehiculo` (string, opcional, default recomendado: `C3S3`)
- `carroceria` (string, opcional, default recomendado: `GENERAL`)
- `mes` (number, opcional, formato `YYYYMM`)
- `resumen` (boolean, opcional)
  - `true`: salida compacta con `H2/H4/H8`
  - `false`: salida detallada del modelo

## 5) Ejemplo cURL (resumen)

```bash
curl -s -X POST "https://sicetac-api-mcp.onrender.com/consulta" \
  -H "Content-Type: application/json" \
  -d '{
    "origen":"Bogotá",
    "destino":"Medellín",
    "vehiculo":"C3S3",
    "carroceria":"GENERAL",
    "resumen":true
  }'
```

## 6) Estructura de respuesta (resumen con variantes)

La respuesta puede traer una o varias rutas.

Ejemplo esperado:

```json
{
  "origen": "Bogotá",
  "destino": "Medellín",
  "configuracion": "C3S3",
  "mes": 202602,
  "carroceria": "GENERAL",
  "modo_viaje": "CARGADO",
  "variantes": [
    {
      "NOMBRE_SICE": "BOGOTÁ _ MEDELLÍN",
      "ID_SICE": 106,
      "totales": {
        "H2": 3688541.43,
        "H4": 3839748.27,
        "H8": 4142158.07
      }
    }
  ]
}
```

## 7) Reglas de consumo recomendadas

Para integradores externos:

1. Siempre iterar `variantes` si existe.
2. Si no existe `variantes`, usar la ruta principal.
3. No asumir una unica ruta por origen/destino.
4. Mostrar `H2`, `H4`, `H8` como escenarios logisticos.
5. Formatear valores en COP en capa cliente.

## 8) Manejo de errores

Ejemplos comunes:

- `404 Not Found`: endpoint incorrecto.
- `500` con detalle de tablas: problema temporal de lectura/carga en backend.
- Error de validacion: payload incompleto o invalido.

## 9) Endpoint de salud

Puede usarse para monitoreo:

- `GET /health`

URL:

`https://sicetac-api-mcp.onrender.com/health`

## 10) Recomendaciones de integracion

1. Definir timeout de cliente de 20 a 60 segundos.
2. Reintentar 1-2 veces ante errores transitorios de red.
3. Loggear request/response con mascara de datos sensibles.
4. Versionar contratos de respuesta en el sistema consumidor.

