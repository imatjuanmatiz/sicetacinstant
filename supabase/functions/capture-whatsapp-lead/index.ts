import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const CAPTURE_SECRET = Deno.env.get("CAPTURE_WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type LeadPayload = {
  event?: string;
  ts?: string;
  channel?: string;
  message?: string;
  lead?: {
    phone?: string;
    profile_name?: string;
    name?: string;
    company?: string;
    email?: string;
  };
  route?: {
    origen?: string;
    destino?: string;
    vehiculo?: string;
    carroceria?: string;
    modo_viaje?: string;
  };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (CAPTURE_SECRET) {
    const incomingSecret = req.headers.get("x-capture-secret") || "";
    if (!incomingSecret || incomingSecret !== CAPTURE_SECRET) {
      return json({ error: "unauthorized" }, 401);
    }
  }

  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const phone = (body.lead?.phone || "").trim();
  if (!phone) {
    return json({ error: "phone_required" }, 400);
  }

  const record = {
    event: (body.event || "unknown").trim(),
    channel: (body.channel || "whatsapp").trim(),
    phone,
    profile_name: (body.lead?.profile_name || "").trim() || null,
    lead_name: (body.lead?.name || "").trim() || null,
    company: (body.lead?.company || "").trim() || null,
    email: (body.lead?.email || "").trim() || null,
    message: (body.message || "").trim() || null,
    route_origin: (body.route?.origen || "").trim() || null,
    route_destination: (body.route?.destino || "").trim() || null,
    vehicle: (body.route?.vehiculo || "").trim() || null,
    body_type: (body.route?.carroceria || "").trim() || null,
    trip_mode: (body.route?.modo_viaje || "").trim() || null,
    payload: body,
    created_at: body.ts || new Date().toISOString(),
  };

  const { error } = await supabase.from("whatsapp_leads").insert(record);
  if (error) {
    return json({ error: "insert_failed", detail: error.message }, 500);
  }

  return json({ ok: true });
});
