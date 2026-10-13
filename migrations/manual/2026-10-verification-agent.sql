-- Verification agent tables and columns (docs/VERIFICATION_AGENT.md).
-- Idempotent: safe to run more than once.

ALTER TABLE food_resources
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS last_agent_check_at timestamp;

CREATE TABLE IF NOT EXISTS verification_checks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id varchar NOT NULL,
  checked_at timestamp DEFAULT now(),
  trigger varchar(30) NOT NULL,
  status varchar(30),
  confidence varchar(10),
  summary text,
  evidence jsonb,
  proposed_changes jsonb,
  conflicts jsonb,
  places_snapshot jsonb,
  error text,
  resolution varchar(20) NOT NULL,
  resolved_at timestamp,
  resolution_note text,
  model varchar(50),
  input_tokens integer,
  output_tokens integer,
  web_searches integer,
  cost_usd text
);
CREATE INDEX IF NOT EXISTS verification_checks_resource_idx ON verification_checks (resource_id);
CREATE INDEX IF NOT EXISTS verification_checks_resolution_idx ON verification_checks (resolution);

CREATE TABLE IF NOT EXISTS field_confirmations (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id varchar NOT NULL,
  field varchar(30) NOT NULL,
  value text,
  source varchar(20) NOT NULL,
  note text,
  confirmed_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS field_confirmations_resource_idx ON field_confirmations (resource_id);
