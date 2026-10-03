ALTER TABLE public.whatsapp_contacts
  ADD COLUMN wa_user_id text,
  ADD COLUMN wa_parent_user_id text,
  ADD COLUMN wa_username text,
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.whatsapp_leads
  ADD COLUMN wa_user_id text,
  ADD COLUMN wa_parent_user_id text,
  ADD COLUMN wa_username text,
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.whatsapp_route_queries
  ADD COLUMN wa_user_id text,
  ADD COLUMN wa_parent_user_id text,
  ADD COLUMN wa_username text,
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.whatsapp_message_patterns
  ADD COLUMN wa_user_id text,
  ADD COLUMN wa_parent_user_id text,
  ADD COLUMN wa_username text;

ALTER TABLE public.whatsapp_contacts
  ADD CONSTRAINT whatsapp_contacts_wa_user_id_key UNIQUE (wa_user_id),
  ADD CONSTRAINT whatsapp_contacts_identity_required_check
    CHECK (
      NULLIF(btrim(phone), '') IS NOT NULL
      OR NULLIF(btrim(wa_user_id), '') IS NOT NULL
    );

ALTER TABLE public.whatsapp_leads
  ADD CONSTRAINT whatsapp_leads_identity_required_check
    CHECK (
      NULLIF(btrim(phone), '') IS NOT NULL
      OR NULLIF(btrim(wa_user_id), '') IS NOT NULL
    );

ALTER TABLE public.whatsapp_route_queries
  ADD CONSTRAINT whatsapp_route_queries_identity_required_check
    CHECK (
      NULLIF(btrim(phone), '') IS NOT NULL
      OR NULLIF(btrim(wa_user_id), '') IS NOT NULL
    ),
  ADD CONSTRAINT whatsapp_route_queries_wa_user_id_fkey
    FOREIGN KEY (wa_user_id)
    REFERENCES public.whatsapp_contacts (wa_user_id)
    ON DELETE CASCADE;

CREATE INDEX whatsapp_leads_wa_user_id_created_at_idx
  ON public.whatsapp_leads (wa_user_id, created_at DESC)
  WHERE wa_user_id IS NOT NULL;

CREATE INDEX whatsapp_route_queries_wa_user_id_created_at_idx
  ON public.whatsapp_route_queries (wa_user_id, created_at DESC)
  WHERE wa_user_id IS NOT NULL;

CREATE INDEX whatsapp_message_patterns_wa_user_id_created_at_idx
  ON public.whatsapp_message_patterns (wa_user_id, created_at DESC)
  WHERE wa_user_id IS NOT NULL;

COMMENT ON COLUMN public.whatsapp_contacts.wa_user_id IS
  'WhatsApp user identifier (BSUID/JID, including the provider-supplied @ form); keep separate from phone and username.';
COMMENT ON COLUMN public.whatsapp_contacts.wa_parent_user_id IS
  'WhatsApp parent/business-scoped user identifier when provided by the channel.';
COMMENT ON COLUMN public.whatsapp_contacts.wa_username IS
  'WhatsApp username/handle as provided by the channel; display metadata, not the primary identity.';

COMMENT ON COLUMN public.whatsapp_leads.wa_user_id IS
  'WhatsApp user identifier (BSUID/JID, including the provider-supplied @ form); keep separate from phone and username.';
COMMENT ON COLUMN public.whatsapp_leads.wa_parent_user_id IS
  'WhatsApp parent/business-scoped user identifier when provided by the channel.';
COMMENT ON COLUMN public.whatsapp_leads.wa_username IS
  'WhatsApp username/handle as provided by the channel; display metadata, not the primary identity.';

COMMENT ON COLUMN public.whatsapp_route_queries.wa_user_id IS
  'WhatsApp user identifier (BSUID/JID, including the provider-supplied @ form); keep separate from phone and username.';
COMMENT ON COLUMN public.whatsapp_route_queries.wa_parent_user_id IS
  'WhatsApp parent/business-scoped user identifier when provided by the channel.';
COMMENT ON COLUMN public.whatsapp_route_queries.wa_username IS
  'WhatsApp username/handle as provided by the channel; display metadata, not the primary identity.';

COMMENT ON COLUMN public.whatsapp_message_patterns.wa_user_id IS
  'WhatsApp user identifier (BSUID/JID, including the provider-supplied @ form); keep separate from phone and username.';
COMMENT ON COLUMN public.whatsapp_message_patterns.wa_parent_user_id IS
  'WhatsApp parent/business-scoped user identifier when provided by the channel.';
COMMENT ON COLUMN public.whatsapp_message_patterns.wa_username IS
  'WhatsApp username/handle as provided by the channel; display metadata, not the primary identity.';
