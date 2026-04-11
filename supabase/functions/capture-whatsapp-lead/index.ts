import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";
const CAPTURE_SECRET = Deno.env.get("CAPTURE_WEBHOOK_SECRET") || "";
const DEFAULT_PLAN_CODE = "free";
const DEFAULT_MONTHLY_ROUTE_QUOTA = 30;
const DEFAULT_PREMIUM_ENABLED = false;
const DEFAULT_PREMIUM_QUOTA = 0;

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
  query?: {
    kind?: string;
    requested_hours?: number;
    requested_tons?: number;
    value_per_ton_requested?: boolean;
    used_last_route_context?: boolean;
    used_default_vehicle?: boolean;
    used_default_body_type?: boolean;
    sicetac_reference_total?: number;
    sicetac_reference_bucket?: string;
    market_reference_total?: number;
    market_reference_bucket?: string;
  };
  parse?: {
    original_text?: string;
    cleaned_text?: string;
    matched_intent_pattern?: string;
    route_found?: boolean;
    route?: {
      origen?: string;
      destino?: string;
    };
    municipios_detected?: Array<{
      codigo_dane?: string;
      nombre_oficial?: string;
      departamento?: string;
    }>;
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

  const nowTs = body.ts || new Date().toISOString();
  const routeEvent = (body.event || "").trim() === "route_consulted";

  const { data: existingContact, error: contactReadError } = await supabase
    .from("whatsapp_contacts")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (contactReadError) {
    return json({ error: "contact_read_failed", detail: contactReadError.message }, 500);
  }

  const contactRecord = {
    phone,
    profile_name: (body.lead?.profile_name || "").trim() || existingContact?.profile_name || null,
    lead_name: (body.lead?.name || "").trim() || existingContact?.lead_name || null,
    company: (body.lead?.company || "").trim() || existingContact?.company || null,
    email: (body.lead?.email || "").trim() || existingContact?.email || null,
    first_seen_at: existingContact?.first_seen_at || nowTs,
    last_seen_at: nowTs,
    last_message_at: nowTs,
    first_route_at: existingContact?.first_route_at || (routeEvent ? nowTs : null),
    last_route_at: routeEvent ? nowTs : existingContact?.last_route_at || null,
    status: existingContact?.status || "active",
    preferred_vehicle: existingContact?.preferred_vehicle || null,
    preferred_body_type: existingContact?.preferred_body_type || null,
    plan_code: existingContact?.plan_code || DEFAULT_PLAN_CODE,
    plan_status: existingContact?.plan_status || "active",
    monthly_route_quota: existingContact?.monthly_route_quota || DEFAULT_MONTHLY_ROUTE_QUOTA,
    monthly_routes_used: Number(existingContact?.monthly_routes_used || 0) + (routeEvent ? 1 : 0),
    premium_enabled: existingContact?.premium_enabled || DEFAULT_PREMIUM_ENABLED,
    premium_quota: existingContact?.premium_quota || DEFAULT_PREMIUM_QUOTA,
    premium_used: existingContact?.premium_used || 0,
    total_routes_analyzed: Number(existingContact?.total_routes_analyzed || 0) + (routeEvent ? 1 : 0),
    billing_cycle_started_at: existingContact?.billing_cycle_started_at || null,
    billing_cycle_ends_at: existingContact?.billing_cycle_ends_at || null,
    notes: existingContact?.notes || null,
    metadata: {
      ...(existingContact?.metadata || {}),
      last_event: (body.event || "unknown").trim(),
      last_channel: (body.channel || "whatsapp").trim(),
      last_route_origin: (body.route?.origen || "").trim() || null,
      last_route_destination: (body.route?.destino || "").trim() || null,
      last_vehicle: (body.route?.vehiculo || "").trim() || null,
      last_body_type: (body.route?.carroceria || "").trim() || null,
      last_query_kind: (body.query?.kind || "").trim() || null,
    },
    updated_at: nowTs,
  };

  const { error: contactUpsertError } = await supabase
    .from("whatsapp_contacts")
    .upsert(contactRecord, { onConflict: "phone" });

  if (contactUpsertError) {
    return json({ error: "contact_upsert_failed", detail: contactUpsertError.message }, 500);
  }

  if (routeEvent) {
    const queryRecord = {
      phone,
      event: "route_consulted",
      query_kind: (body.query?.kind || "route_summary").trim(),
      query_text: (body.message || "").trim() || null,
      origin: (body.route?.origen || "").trim() || null,
      destination: (body.route?.destino || "").trim() || null,
      vehicle: (body.route?.vehiculo || "").trim() || null,
      body_type: (body.route?.carroceria || "").trim() || null,
      trip_mode: (body.route?.modo_viaje || "").trim() || null,
      requested_hours: body.query?.requested_hours ?? null,
      requested_tons: body.query?.requested_tons ?? null,
      value_per_ton_requested: Boolean(body.query?.value_per_ton_requested),
      used_last_route_context: Boolean(body.query?.used_last_route_context),
      used_default_vehicle: Boolean(body.query?.used_default_vehicle),
      used_default_body_type: Boolean(body.query?.used_default_body_type),
      sicetac_reference_total: body.query?.sicetac_reference_total ?? null,
      sicetac_reference_bucket: (body.query?.sicetac_reference_bucket || "").trim() || null,
      market_reference_total: body.query?.market_reference_total ?? null,
      market_reference_bucket: (body.query?.market_reference_bucket || "").trim() || null,
      payload: body,
      created_at: nowTs,
    };

    const { error: queryInsertError } = await supabase
      .from("whatsapp_route_queries")
      .insert(queryRecord);

    if (queryInsertError) {
      return json({ error: "query_insert_failed", detail: queryInsertError.message }, 500);
    }
  }

  const messagePatternRecord = {
    phone,
    event: (body.event || "unknown").trim(),
    message_text: (body.message || body.parse?.original_text || "").trim(),
    cleaned_text: (body.parse?.cleaned_text || "").trim() || null,
    matched_intent_pattern: (body.parse?.matched_intent_pattern || "").trim() || null,
    parse_success: Boolean(body.parse?.route_found),
    detected_origin: (body.route?.origen || body.parse?.route?.origen || "").trim() || null,
    detected_destination: (body.route?.destino || body.parse?.route?.destino || "").trim() || null,
    detected_vehicle: (body.route?.vehiculo || "").trim() || null,
    detected_body_type: (body.route?.carroceria || "").trim() || null,
    detected_hours: body.query?.requested_hours ?? null,
    detected_tons: body.query?.requested_tons ?? null,
    municipios_detected: body.parse?.municipios_detected || [],
    payload: body,
    created_at: nowTs,
  };

  const { error: patternInsertError } = await supabase
    .from("whatsapp_message_patterns")
    .insert(messagePatternRecord);

  if (patternInsertError) {
    return json({ error: "pattern_insert_failed", detail: patternInsertError.message }, 500);
  }

  return json({ ok: true });
});
