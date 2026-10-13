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

-- Two-key auto-approval: what the agent changed, with before/after values for undo
ALTER TABLE verification_checks ADD COLUMN IF NOT EXISTS applied_changes jsonb;

-- Verifier accounts, sign-in sessions and the activity log
CREATE TABLE IF NOT EXISTS verifiers (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(40) NOT NULL UNIQUE,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now(),
  last_login_at timestamp
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash varchar(64) PRIMARY KEY,
  role varchar(10) NOT NULL,
  verifier_id varchar,
  created_at timestamp DEFAULT now(),
  expires_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  at timestamp DEFAULT now(),
  role varchar(10) NOT NULL,
  verifier_id varchar,
  actor_name text NOT NULL,
  action varchar(40) NOT NULL,
  resource_id varchar,
  resource_name text,
  check_id varchar,
  details jsonb
);
CREATE INDEX IF NOT EXISTS activity_log_at_idx ON activity_log (at DESC);
CREATE INDEX IF NOT EXISTS activity_log_verifier_idx ON activity_log (verifier_id);
