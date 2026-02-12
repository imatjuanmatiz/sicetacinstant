import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CAPTURE_SECRET = Deno.env.get("CAPTURE_WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type CaptureBody = {
  ts?: string;
  request?: {
    origen?: string;
    destino?: string;
    vehiculo?: string;
    carroceria?: string;
    resumen?: boolean;
  };
  summary?: {
    modo_viaje?: string;
    mes?: number;
  };
  routes_count?: number;
};

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (CAPTURE_SECRET) {
    const incomingSecret = req.headers.get("x-capture-secret") || "";
    if (!incomingSecret || incomingSecret !== CAPTURE_SECRET) return unauthorized();
  }

  let body: CaptureBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = (body.request?.origen || "").trim();
  const destination = (body.request?.destino || "").trim();

  if (!origin || !destination) {
    return new Response(JSON.stringify({ error: "origin_and_destination_required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const record = {
    source: "sicetac-lab",
    origin,
    destination,
    vehicle: (body.request?.vehiculo || "C3S3").trim(),
    body_type: (body.request?.carroceria || "GENERAL").trim(),
    summary_mode: body.request?.resumen !== false,
    mode: body.summary?.modo_viaje || null,
    month_code: body.summary?.mes || null,
    routes_count: Number.isFinite(body.routes_count) ? Number(body.routes_count) : 0,
    payload: body,
    created_at: body.ts || new Date().toISOString(),
  };

  const { error } = await supabase.from("route_queries").insert(record);
  if (error) {
    return new Response(JSON.stringify({ error: "insert_failed", detail: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

