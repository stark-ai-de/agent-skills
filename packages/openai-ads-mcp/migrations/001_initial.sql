-- Immutable, checksum-pinned PostgreSQL schema. Apply with the explicit migration CLI.
CREATE TABLE ads_meta (
  name TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE ads_grants (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  scopes JSONB NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
  credential TEXT,
  credential_fingerprint TEXT,
  expires_at BIGINT NOT NULL,
  revoked_at BIGINT,
  CHECK ((credential IS NULL) = (credential_fingerprint IS NULL)),
  CHECK (revoked_at IS NULL OR credential IS NULL)
);
CREATE INDEX ads_grants_expiry ON ads_grants(expires_at);
CREATE INDEX ads_grants_fingerprint ON ads_grants(credential_fingerprint)
  WHERE revoked_at IS NULL;

CREATE TABLE ads_codes (
  hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES ads_grants(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  used_at BIGINT
);
CREATE INDEX ads_codes_grant ON ads_codes(grant_id);

CREATE TABLE ads_tokens (
  hash TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES ads_grants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('access', 'refresh')),
  scopes JSONB NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
  expires_at BIGINT NOT NULL,
  used_at BIGINT
);
CREATE INDEX ads_tokens_grant ON ads_tokens(grant_id);
CREATE INDEX ads_tokens_access_expiry ON ads_tokens(expires_at) WHERE kind = 'access';

CREATE TABLE ads_flows (
  id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  payload TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX ads_flows_expiry ON ads_flows(expires_at);

CREATE TABLE ads_browser_sessions (
  hash TEXT NOT NULL,
  grant_id TEXT NOT NULL REFERENCES ads_grants(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  PRIMARY KEY (hash, grant_id)
);
CREATE INDEX ads_browser_sessions_grant ON ads_browser_sessions(grant_id);
CREATE INDEX ads_browser_sessions_expiry ON ads_browser_sessions(expires_at);

CREATE TABLE ads_handoffs (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL REFERENCES ads_grants(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX ads_handoffs_grant ON ads_handoffs(grant_id);
CREATE INDEX ads_handoffs_expiry ON ads_handoffs(expires_at);

CREATE TABLE ads_rate_limits (
  name TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK (count > 0),
  expires_at BIGINT NOT NULL
);
CREATE INDEX ads_rate_limits_expiry ON ads_rate_limits(expires_at);

CREATE TABLE ads_leases (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  owner_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX ads_leases_scope_owner_expiry ON ads_leases(scope, owner_hash, expires_at);
CREATE INDEX ads_leases_expiry ON ads_leases(expires_at);
