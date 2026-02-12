const DEFAULT_API_URL = "https://sicetac-api-mcp.onrender.com/consulta";
const CAPTURE_WEBHOOK_URL = (process.env.ROUTE_CAPTURE_WEBHOOK_URL || "").trim();
const CAPTURE_WEBHOOK_SECRET = (process.env.CAPTURE_WEBHOOK_SECRET || "").trim();
const ALLOWED_VEHICLES = new Set(["C278", "C289", "C2910", "C2M10", "C3", "C2S2", "C2S3", "C3S2", "C3S3", "V3"]);
const ALLOWED_BODY_TYPES = new Set([
  "GENERAL",
  "ESTIBA",
  "PLATAFORMA",
  "ESTACAS GRANEL SOLIDO",
  "ESTIBAS GRANEL SOLIDO",
  "PLATAFORMA GRANEL SOLIDO",
  "FURGON GENERAL",
  "FURGON GRANEL SOLIDO",
  "FURGON REFRIGERADO",
  "PORTACONTENEDORES",
  "TANQUE - GRANEL LIQUIDO",
  "VOLCO",
]);

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
    carroceria: cleanText(body?.carroceria) || "GENERAL",
    resumen: parseBoolean(body?.resumen, true),
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
  const totalViaje = asNumber(
    result?.total_viaje ?? variant?.total_viaje ?? (totalesPorHoras && (totalesPorHoras.H8 ?? totalesPorHoras.h8))
  );
  const peajes = asNumber(result?.peajes ?? variant?.peajes);
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
    total_viaje: totalViaje,
    total_viaje_cop: fmtCOP(totalViaje),
    peajes,
    peajes_cop: fmtCOP(peajes),
    totales_por_horas: totalesPorHoras,
    totales_por_horas_cop: totalesPorHorasCop,
  };
}

function buildNormalized(data, input, requestedRoute) {
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
  const singleRoutePeajes = asNumber(base?.peajes ?? data?.peajes);
  const singleRoute = base
    ? {
        nombre: data?.NOMBRE_SICE || "Ruta principal",
        id_sice: data?.ID_SICE ?? null,
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
        error:
          "Tipo de vehiculo invalido. Valores permitidos: C278, C289, C2910, C2M10, C3, C2S2, C2S3, C3S2, C3S3, V3.",
      },
      { status: 400 }
    );
  }
  if (!ALLOWED_BODY_TYPES.has(input.carroceria)) {
    return Response.json(
      {
        error:
          "Tipo de carroceria invalido. Valores permitidos: GENERAL, ESTIBA, PLATAFORMA, ESTACAS GRANEL SOLIDO, ESTIBAS GRANEL SOLIDO, PLATAFORMA GRANEL SOLIDO, FURGON GENERAL, FURGON GRANEL SOLIDO, FURGON REFRIGERADO, PORTACONTENEDORES, TANQUE - GRANEL LIQUIDO, VOLCO.",
      },
      { status: 400 }
    );
  }

  const requestPayload = {
    origen: input.origen,
    destino: input.destino,
    vehiculo: input.vehiculo,
    carroceria: input.carroceria,
    resumen: input.resumen,
  };

  const res = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestPayload),
  });

  const data = await res.json();
  if (!res.ok) {
    return Response.json(data, { status: res.status });
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
