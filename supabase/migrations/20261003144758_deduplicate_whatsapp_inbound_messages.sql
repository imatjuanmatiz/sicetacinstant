ALTER TABLE public.whatsapp_leads
  ADD COLUMN wa_message_id text,
  ADD CONSTRAINT whatsapp_leads_wa_message_id_key UNIQUE (wa_message_id);

ALTER TABLE public.whatsapp_route_queries
  ADD COLUMN wa_message_id text,
  ADD CONSTRAINT whatsapp_route_queries_wa_message_id_key UNIQUE (wa_message_id);

ALTER TABLE public.whatsapp_message_patterns
  ADD COLUMN wa_message_id text,
  ADD CONSTRAINT whatsapp_message_patterns_wa_message_id_key UNIQUE (wa_message_id);

CREATE TABLE public.whatsapp_inbound_message_receipts (
  wa_message_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_inbound_message_receipts_id_check
    CHECK (NULLIF(btrim(wa_message_id), '') IS NOT NULL)
);

CREATE INDEX whatsapp_inbound_message_receipts_created_at_idx
  ON public.whatsapp_inbound_message_receipts (created_at DESC);

ALTER TABLE public.whatsapp_inbound_message_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_inbound_message_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.whatsapp_inbound_message_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_inbound_message(p_wa_message_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NULLIF(btrim(p_wa_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'wa_message_id is required';
  END IF;

  INSERT INTO public.whatsapp_inbound_message_receipts (
    wa_message_id, status, attempts, claimed_at
  ) VALUES (
    p_wa_message_id, 'processing', 1, clock_timestamp()
  )
  ON CONFLICT (wa_message_id) DO NOTHING;

  IF FOUND THEN
    RETURN jsonb_build_object('claimed', true, 'status', 'processing');
  END IF;

  UPDATE public.whatsapp_inbound_message_receipts
  SET status = 'processing',
      attempts = attempts + 1,
      claimed_at = clock_timestamp(),
      completed_at = NULL,
      last_error = NULL
  WHERE wa_message_id = p_wa_message_id
    AND (
      status = 'failed'
      OR (status = 'processing' AND claimed_at < clock_timestamp() - interval '5 minutes')
    )
  RETURNING status INTO v_status;

  IF FOUND THEN
    RETURN jsonb_build_object('claimed', true, 'status', 'processing');
  END IF;

  SELECT status
  INTO v_status
  FROM public.whatsapp_inbound_message_receipts
  WHERE wa_message_id = p_wa_message_id;

  RETURN jsonb_build_object('claimed', false, 'status', v_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_whatsapp_inbound_message(
  p_wa_message_id text,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_updated boolean;
BEGIN
  IF NULLIF(btrim(p_wa_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'wa_message_id is required';
  END IF;

  UPDATE public.whatsapp_inbound_message_receipts
  SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
      completed_at = CASE WHEN p_success THEN clock_timestamp() ELSE NULL END,
      last_error = CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error, 'processing_failed'), 200) END
  WHERE wa_message_id = p_wa_message_id
    AND status = 'processing';

  v_updated := FOUND;
  RETURN jsonb_build_object('updated', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_inbound_message(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_inbound_message(text) TO service_role;
REVOKE ALL ON FUNCTION public.finish_whatsapp_inbound_message(text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_whatsapp_inbound_message(text, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.increment_whatsapp_route_usage_from_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_contacts
  SET monthly_routes_used = monthly_routes_used + 1,
      total_routes_analyzed = total_routes_analyzed + 1,
      updated_at = NEW.created_at
  WHERE (NEW.wa_user_id IS NOT NULL AND wa_user_id = NEW.wa_user_id)
     OR (NEW.wa_user_id IS NULL AND NEW.phone IS NOT NULL AND phone = NEW.phone);

  RETURN NEW;
END;
$$;

CREATE TRIGGER whatsapp_route_queries_increment_usage
  AFTER INSERT ON public.whatsapp_route_queries
  FOR EACH ROW
  WHEN (NEW.wa_message_id IS NOT NULL)
  EXECUTE FUNCTION public.increment_whatsapp_route_usage_from_message();

COMMENT ON COLUMN public.whatsapp_leads.wa_message_id IS
  'WhatsApp Cloud API message ID used for idempotent event capture.';
COMMENT ON COLUMN public.whatsapp_route_queries.wa_message_id IS
  'WhatsApp Cloud API message ID; unique per inbound route query.';
COMMENT ON COLUMN public.whatsapp_message_patterns.wa_message_id IS
  'WhatsApp Cloud API message ID used to deduplicate message analysis.';
COMMENT ON TABLE public.whatsapp_inbound_message_receipts IS
  'Durable idempotency receipts for inbound WhatsApp webhook messages.';
