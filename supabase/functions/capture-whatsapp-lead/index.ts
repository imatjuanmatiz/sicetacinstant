import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ||
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
  wa_message_id?: string;
  success?: boolean;
  error?: string;
  lead?: {
    phone?: string;
    wa_user_id?: string;
    wa_parent_user_id?: string;
    wa_username?: string;
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

function normalized(value?: string | null) {
  return (value || "").trim() || null;
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

  const event = (body.event || "unknown").trim();
  const waMessageId = normalized(body.wa_message_id);

  if (event === "claim_inbound_message") {
    if (!waMessageId) return json({ error: "wa_message_id_required" }, 400);
    const { data, error } = await supabase.rpc(
      "claim_whatsapp_inbound_message",
      { p_wa_message_id: waMessageId },
    );
    if (error) {
      return json(
        { error: "message_claim_failed", detail: error.message },
        500,
      );
    }
    return json({ ok: true, ...(data || {}) });
  }

  if (event === "finish_inbound_message") {
    if (!waMessageId) return json({ error: "wa_message_id_required" }, 400);
    const { data, error } = await supabase.rpc(
      "finish_whatsapp_inbound_message",
      {
        p_wa_message_id: waMessageId,
        p_success: body.success === true,
        p_error: normalized(body.error),
      },
    );
    if (error) {
      return json(
        { error: "message_finish_failed", detail: error.message },
        500,
      );
    }
    return json({ ok: true, ...(data || {}) });
  }

  const phone = normalized(body.lead?.phone);
  // Preserve the channel-supplied @/BSUID exactly; never put it in `phone`.
  const waUserId = normalized(body.lead?.wa_user_id);
  const waParentUserId = normalized(body.lead?.wa_parent_user_id);
  const waUsername = normalized(body.lead?.wa_username);
  if (!phone && !waUserId) {
    return json({ error: "whatsapp_identity_required" }, 400);
  }

  const nowTs = body.ts || new Date().toISOString();
  const routeEvent = event === "route_consulted";

  let existingContact: Record<string, any> | null = null;
  if (waUserId) {
    const { data, error } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("wa_user_id", waUserId)
      .maybeSingle();
    if (error) {
      return json({ error: "contact_read_failed", detail: error.message }, 500);
    }
    existingContact = data;
  }

  if (!existingContact && phone) {
    const { data, error } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (error) {
      return json({ error: "contact_read_failed", detail: error.message }, 500);
    }
    existingContact = data;
  }

  // Do not silently bind a phone to a different WhatsApp identity.
  if (
    existingContact?.wa_user_id && waUserId &&
    existingContact.wa_user_id !== waUserId
  ) {
    return json({ error: "whatsapp_identity_conflict" }, 409);
  }

  // Keep a known phone stable because historical route rows reference it.
  const contactPhone = existingContact?.phone || phone;
  const contactWaUserId = existingContact?.wa_user_id || waUserId;
  const contactWaParentUserId = existingContact?.wa_parent_user_id ||
    waParentUserId;
  const contactWaUsername = waUsername || existingContact?.wa_username || null;

  const contactRecord = {
    phone: contactPhone,
    wa_user_id: contactWaUserId,
    wa_parent_user_id: contactWaParentUserId,
    wa_username: contactWaUsername,
    profile_name: normalized(body.lead?.profile_name) ||
      existingContact?.profile_name || null,
    lead_name: normalized(body.lead?.name) || existingContact?.lead_name ||
      null,
    company: normalized(body.lead?.company) || existingContact?.company || null,
    email: normalized(body.lead?.email) || existingContact?.email || null,
    first_seen_at: existingContact?.first_seen_at || nowTs,
    last_seen_at: nowTs,
    last_message_at: nowTs,
    first_route_at: existingContact?.first_route_at ||
      (routeEvent ? nowTs : null),
    last_route_at: routeEvent ? nowTs : existingContact?.last_route_at || null,
    status: existingContact?.status || "active",
    preferred_vehicle: existingContact?.preferred_vehicle || null,
    preferred_body_type: existingContact?.preferred_body_type || null,
    plan_code: existingContact?.plan_code || DEFAULT_PLAN_CODE,
    plan_status: existingContact?.plan_status || "active",
    monthly_route_quota: existingContact?.monthly_route_quota ??
      DEFAULT_MONTHLY_ROUTE_QUOTA,
    monthly_routes_used: Number(existingContact?.monthly_routes_used || 0) +
      (routeEvent && !waMessageId ? 1 : 0),
    premium_enabled: existingContact?.premium_enabled ??
      DEFAULT_PREMIUM_ENABLED,
    premium_quota: existingContact?.premium_quota ?? DEFAULT_PREMIUM_QUOTA,
    premium_used: existingContact?.premium_used || 0,
    total_routes_analyzed: Number(existingContact?.total_routes_analyzed || 0) +
      (routeEvent && !waMessageId ? 1 : 0),
    billing_cycle_started_at: existingContact?.billing_cycle_started_at || null,
    billing_cycle_ends_at: existingContact?.billing_cycle_ends_at || null,
    notes: existingContact?.notes || null,
    metadata: {
      ...(existingContact?.metadata || {}),
      last_event: (body.event || "unknown").trim(),
      last_channel: (body.channel || "whatsapp").trim(),
      last_route_origin: normalized(body.route?.origen),
      last_route_destination: normalized(body.route?.destino),
      last_vehicle: normalized(body.route?.vehiculo),
      last_body_type: normalized(body.route?.carroceria),
      last_query_kind: normalized(body.query?.kind),
    },
    updated_at: nowTs,
  };

  let contactWriteError;
  if (existingContact) {
    const { error } = await supabase
      .from("whatsapp_contacts")
      .update(contactRecord)
      .eq("id", existingContact.id);
    contactWriteError = error;
  } else {
    const { error } = await supabase
      .from("whatsapp_contacts")
      .upsert(contactRecord, {
        onConflict: contactWaUserId ? "wa_user_id" : "phone",
      });
    contactWriteError = error;
  }
  if (contactWriteError) {
    return json({
      error: "contact_upsert_failed",
      detail: contactWriteError.message,
    }, 500);
  }

  const leadRecord = {
    wa_message_id: waMessageId,
    event,
    channel: (body.channel || "whatsapp").trim(),
    phone: contactPhone,
    wa_user_id: contactWaUserId,
    wa_parent_user_id: contactWaParentUserId,
    wa_username: contactWaUsername,
    profile_name: normalized(body.lead?.profile_name),
    lead_name: normalized(body.lead?.name),
    company: normalized(body.lead?.company),
    email: normalized(body.lead?.email),
    message: normalized(body.message),
    route_origin: normalized(body.route?.origen),
    route_destination: normalized(body.route?.destino),
    vehicle: normalized(body.route?.vehiculo),
    body_type: normalized(body.route?.carroceria),
    trip_mode: normalized(body.route?.modo_viaje),
    payload: body,
    created_at: nowTs,
  };

  const { error: leadInsertError } = await supabase.from("whatsapp_leads")
    .upsert(leadRecord, {
      onConflict: "wa_message_id",
      ignoreDuplicates: true,
    });
  if (leadInsertError) {
    return json(
      { error: "insert_failed", detail: leadInsertError.message },
      500,
    );
  }

  if (routeEvent) {
    const queryRecord = {
      wa_message_id: waMessageId,
      phone: contactPhone,
      wa_user_id: contactWaUserId,
      wa_parent_user_id: contactWaParentUserId,
      wa_username: contactWaUsername,
      event: "route_consulted",
      query_kind: (body.query?.kind || "route_summary").trim(),
      query_text: normalized(body.message),
      origin: normalized(body.route?.origen),
      destination: normalized(body.route?.destino),
      vehicle: normalized(body.route?.vehiculo),
      body_type: normalized(body.route?.carroceria),
      trip_mode: normalized(body.route?.modo_viaje),
      requested_hours: body.query?.requested_hours ?? null,
      requested_tons: body.query?.requested_tons ?? null,
      value_per_ton_requested: Boolean(body.query?.value_per_ton_requested),
      used_last_route_context: Boolean(body.query?.used_last_route_context),
      used_default_vehicle: Boolean(body.query?.used_default_vehicle),
      used_default_body_type: Boolean(body.query?.used_default_body_type),
      sicetac_reference_total: body.query?.sicetac_reference_total ?? null,
      sicetac_reference_bucket: normalized(
        body.query?.sicetac_reference_bucket,
      ),
      market_reference_total: body.query?.market_reference_total ?? null,
      market_reference_bucket: normalized(body.query?.market_reference_bucket),
      payload: body,
      created_at: nowTs,
    };

    const { error: queryInsertError } = await supabase
      .from("whatsapp_route_queries")
      .upsert(queryRecord, {
        onConflict: "wa_message_id",
        ignoreDuplicates: true,
      });
    if (queryInsertError) {
      return json({
        error: "query_insert_failed",
        detail: queryInsertError.message,
      }, 500);
    }
  }

  const messagePatternRecord = {
    wa_message_id: waMessageId,
    phone: contactPhone,
    wa_user_id: contactWaUserId,
    wa_parent_user_id: contactWaParentUserId,
    wa_username: contactWaUsername,
    event,
    message_text: (body.message || body.parse?.original_text || "").trim(),
    cleaned_text: normalized(body.parse?.cleaned_text),
    matched_intent_pattern: normalized(body.parse?.matched_intent_pattern),
    parse_success: Boolean(body.parse?.route_found),
    detected_origin: normalized(
      body.route?.origen || body.parse?.route?.origen,
    ),
    detected_destination: normalized(
      body.route?.destino || body.parse?.route?.destino,
    ),
    detected_vehicle: normalized(body.route?.vehiculo),
    detected_body_type: normalized(body.route?.carroceria),
    detected_hours: body.query?.requested_hours ?? null,
    detected_tons: body.query?.requested_tons ?? null,
    municipios_detected: body.parse?.municipios_detected || [],
    payload: body,
    created_at: nowTs,
  };

  const { error: patternInsertError } = await supabase
    .from("whatsapp_message_patterns")
    .upsert(messagePatternRecord, {
      onConflict: "wa_message_id",
      ignoreDuplicates: true,
    });
  if (patternInsertError) {
    return json({
      error: "pattern_insert_failed",
      detail: patternInsertError.message,
    }, 500);
  }

  return json({ ok: true });
});
