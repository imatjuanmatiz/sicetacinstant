import { BODY_TYPE_OPTIONS, normalizeBodyType, VEHICLE_OPTIONS } from "../../lib/sicetac-options";

const DEFAULT_API_URL = "https://sicetac-api-mcp.onrender.com/consulta";
const CAPTURE_WEBHOOK_URL = (process.env.ROUTE_CAPTURE_WEBHOOK_URL || "").trim();
const CAPTURE_WEBHOOK_SECRET = (process.env.CAPTURE_WEBHOOK_SECRET || "").trim();
const ALLOWED_VEHICLES = new Set(VEHICLE_OPTIONS);
const ALLOWED_BODY_TYPES = new Set(BODY_TYPE_OPTIONS);
const CONTAINER_TYPES = new Set(["CARGADO", "VACIO"]);
const TRIP_MODES = new Set(["CARGADO", "VACIO"]);

function resolveApiUrl() {
  const configured = (process.env.SICETAC_API_URL || DEFAULT_API_URL).trim();
  // Forzamos endpoint estructurado para no perder H2/H4/H8 ni variantes.
  if (configured.endsWith("/consulta_texto")) return configured.replace(/\/consulta_texto$/, "/consulta");
  if (configured.endsWith("/consulta_resumen")) return configured.replace(/\/consulta_resumen$/, "/consulta");
  return configured;
}

function extractRoute(message) {
  const text = message.replace(/\s+/g, " ").trim();
  const clean = (s) => s.replace(/^[,.;:\s]+|[,.;:\s]+$/g, "").trim();

  // patrones: "A a B", "de A a B", "de A para B"
  const patterns = [
    /^(?:de\s+)?(.+?)\s+a\s+(.+)$/i,
    /^(?:de\s+)?(.+?)\s+para\s+(.+)$/i,
    /^(.+?)\s*->\s*(.+)$/i,
    /^(.+?)\s*-\s*(.+)$/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const origen = clean(match[1]);
      const destino = clean(match[2]);
      if (origen && destino) return { origen, destino };
    }
  }

  return null;
}

function parseBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

async function parseInput(req) {
  const contentType = req.headers.get("content-type") || "";
  let body = {};

  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const form = await req.formData();
    body = Object.fromEntries(form.entries());
  }

  let origen = cleanText(body?.origen);
  let destino = cleanText(body?.destino);
  const message = cleanText(body?.message);

  if ((!origen || !destino) && message) {
    const extracted = extractRoute(message);
    if (extracted) {
      origen = origen || extracted.origen;
      destino = destino || extracted.destino;
    }
  }

  return {
    origen,
    destino,
    vehiculo: cleanText(body?.vehiculo) || "C3S3",
    carroceria: normalizeBodyType(cleanText(body?.carroceria)),
    modo_viaje: cleanText(body?.modo_viaje).toUpperCase() || "CARGADO",
    tipo_contenedor: cleanText(body?.tipo_contenedor).toUpperCase() || null,
    viaje_redondo: parseBoolean(body?.viaje_redondo, false),
    tipo_contenedor_regreso: cleanText(body?.tipo_contenedor_regreso).toUpperCase() || null,
    rutasid_ida: cleanText(body?.rutasid_ida) || null,
    rutasid_regreso: cleanText(body?.rutasid_regreso) || null,
    resumen: parseBoolean(body?.resumen, true),
    detalle_costos: parseBoolean(body?.detalle_costos, false),
    detalle_consumo: parseBoolean(body?.detalle_consumo, false),
    mes: body?.mes ?? null,
    rutasid: cleanText(body?.rutasid) || null,
    horas_logisticas: body?.horas_logisticas ?? null,
    peajes: parseBoolean(body?.peajes, true),
    raw_message: message || null,
  };
}

function asNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtCOP(value) {
  const n = asNumber(value);
  if (n === null) return null;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

function summarizeVariant(variant) {
  const result = variant?.RESULTADO || variant?.resultado || {};
  const totalesPorHoras = variant?.totales || result?.totales || null;
  const peajesResumen = variant?.peajes_resumen || result?.peajes_resumen || {};
  const totalViaje = asNumber(
    result?.total_viaje ?? variant?.total_viaje ?? (totalesPorHoras && (totalesPorHoras.H8 ?? totalesPorHoras.h8))
  );
  const peajes = asNumber(peajesResumen?.total_peajes ?? result?.peajes ?? variant?.peajes);
  const totalesPorHorasCop =
    totalesPorHoras && typeof totalesPorHoras === "object"
      ? Object.fromEntries(Object.entries(totalesPorHoras).map(([k, v]) => [k, fmtCOP(v) || v]))
      : null;

  return {
    nombre:
      variant?.NOMBRE_SICE ||
      variant?.nombre_sice ||
      variant?.nombre_ruta ||
      "Ruta sin nombre",
    id_sice: variant?.ID_SICE ?? variant?.id_sice ?? null,
    total_km: asNumber(variant?.total_km),
    estimado: Boolean(variant?.estimado),
    total_viaje: totalViaje,
    total_viaje_cop: fmtCOP(totalViaje),
    peajes,
    peajes_cop: fmtCOP(peajes),
    totales_por_horas: totalesPorHoras,
    totales_por_horas_cop: totalesPorHorasCop,
  };
}

function routeOptions(leg) {
  return Array.isArray(leg?.variantes)
    ? leg.variantes
        .map((variant) => ({
          id: String(variant?.RUTASID ?? variant?.ID_SICE ?? ""),
          nombre: variant?.NOMBRE_SICE || variant?.nombre_sice || "Ruta oficial",
        }))
        .filter((variant) => variant.id)
    : [];
}

function buildNormalized(data, input, requestedRoute) {
  if (data?.ida && data?.regreso && String(data?.tipo_consulta || "").startsWith("VIAJE_REDONDO")) {
    const ida = data.ida;
    const regreso = data.regreso;
    const totales = data?.totales && typeof data.totales === "object" ? data.totales : null;
    const selectionRequired = Boolean(data?.requiere_seleccion_ruta);
    const routes = selectionRequired
      ? []
      : [
          {
            nombre: "Ida cargada + regreso con contenedor vacío",
            total_viaje: asNumber(totales?.H8),
            total_viaje_cop: fmtCOP(totales?.H8),
            peajes: null,
            peajes_cop: null,
            totales_por_horas: totales,
            totales_por_horas_cop: totales
              ? Object.fromEntries(Object.entries(totales).map(([k, v]) => [k, fmtCOP(v) || v]))
              : null,
          },
        ];
    const lines = [
      `Viaje redondo: ${ida?.origen || requestedRoute?.origen || "N/A"} -> ${ida?.destino || requestedRoute?.destino || "N/A"}`,
      "Ida: contenedor cargado. Regreso: contenedor vacío.",
    ];
    if (selectionRequired) lines.push("Selecciona una ruta oficial para cada sentido antes de calcular el total.");
    if (totales) lines.push(`Totales: ${Object.entries(totales).map(([k, v]) => `${k}: ${fmtCOP(v) || v}`).join(" | ")}`);

    return {
      input,
      meta: {
        origen: ida?.origen ?? requestedRoute?.origen ?? null,
        destino: ida?.destino ?? requestedRoute?.destino ?? null,
        configuracion: ida?.configuracion ?? requestedRoute?.vehiculo ?? null,
        mes: ida?.mes ?? null,
        carroceria: ida?.carroceria ?? requestedRoute?.carroceria ?? null,
        modo_viaje: "CARGADO",
        tipo_contenedor: "CARGADO",
        viaje_redondo: true,
        valor_plaza_no_aplica: data?.valor_plaza_regreso_no_aplica ?? null,
      },
      routes,
      selection_required: selectionRequired,
      route_options: { ida: routeOptions(ida), regreso: routeOptions(regreso) },
      texto: lines.join("\n"),
    };
  }

  const base = data?.SICETAC || data;
  const configuracion =
    base?.configuracion ||
    data?.configuracion ||
    data?.vehiculo ||
    data?.tipo_vehiculo ||
    "C3S3";
  const rawVariants = data?.SICETAC_VARIANTES || data?.variantes || data?.VARIANTES;
  const variants = Array.isArray(rawVariants)
    ? rawVariants.map(summarizeVariant)
    : [];

  const singleRouteTotales =
    (data?.totales && typeof data.totales === "object" ? data.totales : null) ||
    (base?.totales && typeof base.totales === "object" ? base.totales : null);
  const singleRouteTotal = asNumber(
    base?.total_viaje ??
      data?.total_viaje ??
      (singleRouteTotales && (singleRouteTotales.H8 ?? singleRouteTotales.h8))
  );
  const singleRoutePeajes = asNumber(
    data?.peajes_resumen?.total_peajes ??
      base?.peajes_resumen?.total_peajes ??
      base?.peajes ??
      data?.peajes
  );
  const singleRoute = base
    ? {
        nombre: data?.NOMBRE_SICE || data?.detalle_lookup?.nombre_sice || "Ruta principal",
        id_sice: data?.rutasid ?? data?.ID_SICE ?? data?.detalle_lookup?.rutasid ?? null,
        total_km: asNumber(base?.total_km),
        estimado: Boolean(base?.estimado),
        total_viaje: singleRouteTotal,
        total_viaje_cop: fmtCOP(singleRouteTotal),
        peajes: singleRoutePeajes,
        peajes_cop: fmtCOP(singleRoutePeajes),
        totales_por_horas: singleRouteTotales,
        totales_por_horas_cop:
          singleRouteTotales
            ? Object.fromEntries(Object.entries(singleRouteTotales).map(([k, v]) => [k, fmtCOP(v) || v]))
            : null,
      }
    : null;

  const routes = variants.length > 0 ? variants : singleRoute ? [singleRoute] : [];

  const lines = [];
  lines.push(
    `Ruta consultada: ${base?.origen || requestedRoute?.origen || "N/A"} -> ${base?.destino || requestedRoute?.destino || "N/A"}`
  );
  if (base?.configuracion) lines.push(`Configuracion: ${base.configuracion}`);
  if (routes.length > 1) lines.push(`Variantes encontradas: ${routes.length}`);

  routes.forEach((r, idx) => {
    const header = routes.length > 1 ? `Ruta ${idx + 1}` : "Resultado";
    lines.push(`${header}: ${r.nombre}${r.id_sice ? ` (ID SICE ${r.id_sice})` : ""}`);
    if (r.total_km !== null) lines.push(`- Distancia: ${r.total_km} km`);
    if (r.estimado) lines.push("VALOR ESTIMADO: 30 km en terreno ondulado; peajes $0.");
    if (r.total_viaje_cop) lines.push(`- Total viaje: ${r.total_viaje_cop}`);
    if (r.peajes_cop) lines.push(`- Peajes: ${r.peajes_cop}`);
    if (r.totales_por_horas && typeof r.totales_por_horas === "object") {
      const entries = Object.entries(r.totales_por_horas)
        .map(([k, v]) => `${k}: ${fmtCOP(v) || v}`)
        .join(" | ");
      if (entries) lines.push(`- Totales por horas: ${entries}`);
    }
  });

  return {
    input,
    meta: {
      origen: base?.origen ?? requestedRoute?.origen ?? null,
      destino: base?.destino ?? requestedRoute?.destino ?? null,
      configuracion,
      mes: base?.mes ?? null,
      carroceria: base?.carroceria ?? null,
      modo_viaje: data?.MODO_VIAJE || data?.modo_viaje || null,
      tipo_contenedor: data?.tipo_contenedor || base?.tipo_contenedor || null,
      viaje_redondo: Boolean(data?.viaje_redondo || String(data?.tipo_consulta || "").startsWith("VIAJE_REDONDO")),
      valor_plaza_no_aplica: data?.valor_plaza_no_aplica || base?.valor_plaza_no_aplica || null,
    },
    routes,
    texto: lines.join("\n"),
  };
}

function buildDiagnostics(data, requestPayload) {
  const base = data?.SICETAC || data;
  const rawVariants = data?.SICETAC_VARIANTES || data?.variantes || data?.VARIANTES;
  return {
    api_url: resolveApiUrl(),
    request_payload: requestPayload,
    has_root_totales: !!(data?.totales && typeof data.totales === "object"),
    has_sicetac_totales: !!(base?.totales && typeof base.totales === "object"),
    has_variantes: Array.isArray(rawVariants) && rawVariants.length > 0,
    root_keys: data && typeof data === "object" ? Object.keys(data) : [],
  };
}

async function parseBackendResponse(res) {
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const rawText = await res.text();

  if (contentType.includes("application/json")) {
    try {
      return {
        ok: true,
        data: rawText ? JSON.parse(rawText) : {},
        rawText,
      };
    } catch {
      return {
        ok: false,
        error: {
          error: "El backend devolvio JSON invalido.",
          backend_status: res.status,
          backend_content_type: contentType,
        },
      };
    }
  }

  try {
    return {
      ok: true,
      data: rawText ? JSON.parse(rawText) : {},
      rawText,
    };
  } catch {
    return {
      ok: false,
      error: {
        error: "El backend SICETAC no devolvio JSON. Probablemente esta en error temporal.",
        backend_status: res.status,
        backend_content_type: contentType || "desconocido",
        backend_preview: rawText.slice(0, 240),
      },
    };
  }
}

async function captureRouteQuery(payload) {
  if (!CAPTURE_WEBHOOK_URL) return;
  try {
    const headers = { "Content-Type": "application/json" };
    if (CAPTURE_WEBHOOK_SECRET) headers["x-capture-secret"] = CAPTURE_WEBHOOK_SECRET;
    await fetch(CAPTURE_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // No bloquea la respuesta de negocio por falla de captura.
  }
}

export async function POST(req) {
  const input = await parseInput(req);
  if (!input.origen || !input.destino) {
    return Response.json(
      { error: "No pude detectar origen y destino. Ej: 'Bogotá a Barranquilla'." },
      { status: 400 }
    );
  }
  if (!ALLOWED_VEHICLES.has(input.vehiculo)) {
    return Response.json(
      {
        error: `Tipo de vehiculo invalido. Valores permitidos: ${VEHICLE_OPTIONS.join(", ")}.`,
      },
      { status: 400 }
    );
  }
  if (!ALLOWED_BODY_TYPES.has(input.carroceria)) {
    return Response.json(
      {
        error: `Tipo de carroceria invalido. Valores permitidos: ${BODY_TYPE_OPTIONS.join(", ")}.`,
      },
      { status: 400 }
    );
  }
  if (!TRIP_MODES.has(input.modo_viaje)) {
    return Response.json({ error: "Condición de viaje inválida. Usa CARGADO o VACIO." }, { status: 400 });
  }
  if (input.tipo_contenedor && input.carroceria !== "Portacontenedores") {
    return Response.json(
      { error: "El tipo de contenedor solo aplica con carrocería Portacontenedores." },
      { status: 400 }
    );
  }
  if (input.tipo_contenedor && !CONTAINER_TYPES.has(input.tipo_contenedor)) {
    return Response.json({ error: "Tipo de contenedor inválido. Usa CARGADO o VACIO." }, { status: 400 });
  }
  if (input.viaje_redondo && input.modo_viaje !== "CARGADO") {
    return Response.json(
      { error: "El viaje redondo con contenedor vacío inicia con un viaje cargado." },
      { status: 400 }
    );
  }
  if (input.viaje_redondo && input.carroceria !== "Portacontenedores") {
    return Response.json(
      { error: "El viaje redondo con regreso de contenedor vacío requiere carrocería Portacontenedores." },
      { status: 400 }
    );
  }
  if (input.viaje_redondo && input.tipo_contenedor_regreso !== "VACIO") {
    return Response.json(
      { error: "El regreso del viaje redondo debe indicar contenedor vacío." },
      { status: 400 }
    );
  }
  if (input.viaje_redondo && input.tipo_contenedor === "VACIO") {
    return Response.json(
      { error: "El viaje redondo requiere contenedor cargado en la ida y contenedor vacío en el regreso." },
      { status: 400 }
    );
  }

  const requestPayload = {
    origen: input.origen,
    destino: input.destino,
    vehiculo: input.vehiculo,
    carroceria: input.carroceria,
    modo_viaje: input.modo_viaje,
    resumen: input.resumen,
    peajes: input.peajes,
    detalle_costos: input.detalle_costos,
    detalle_consumo: input.detalle_consumo,
    mes: input.mes,
    rutasid: input.rutasid,
    horas_logisticas: input.horas_logisticas,
  };
  if (input.tipo_contenedor) requestPayload.tipo_contenedor = input.tipo_contenedor;
  if (input.viaje_redondo) {
    requestPayload.viaje_redondo = true;
    requestPayload.tipo_contenedor_regreso = input.tipo_contenedor_regreso;
  }
  if (input.rutasid_ida) requestPayload.rutasid_ida = input.rutasid_ida;
  if (input.rutasid_regreso) requestPayload.rutasid_regreso = input.rutasid_regreso;

  const res = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  });

  const parsed = await parseBackendResponse(res);
  if (!parsed.ok) {
    return Response.json(parsed.error, { status: 502 });
  }

  const data = parsed.data;
  if (!res.ok) {
    return Response.json(data, { status: res.status || 502 });
  }

  const responsePayload = {
    ok: true,
    normalized: buildNormalized(data, input.raw_message, requestPayload),
    diagnostics: buildDiagnostics(data, requestPayload),
    raw: data,
  };

  await captureRouteQuery({
    ts: new Date().toISOString(),
    request: requestPayload,
    summary: responsePayload.normalized?.meta || null,
    routes_count: responsePayload.normalized?.routes?.length || 0,
  });

  return Response.json(responsePayload);
}
