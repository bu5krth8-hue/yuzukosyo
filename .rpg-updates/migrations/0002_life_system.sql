CREATE TABLE IF NOT EXISTS web_life_profiles (
 public_id TEXT PRIMARY KEY, alias TEXT NOT NULL DEFAULT '', code_hash TEXT UNIQUE,
 code_expires INTEGER NOT NULL DEFAULT 0, issued_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS web_life_requests (
 sender TEXT PRIMARY KEY, target TEXT NOT NULL, sender_code TEXT NOT NULL, target_code TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, nonce TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS web_life_request_target ON web_life_requests(target,expires_at);
CREATE TABLE IF NOT EXISTS web_life_families (
 id TEXT PRIMARY KEY, parent_a TEXT NOT NULL, parent_b TEXT NOT NULL,
 name_a TEXT NOT NULL, name_b TEXT NOT NULL, alias_a TEXT NOT NULL, alias_b TEXT NOT NULL,
 formed_at INTEGER NOT NULL, ended_at INTEGER, ended_by TEXT,
 child_job TEXT NOT NULL, candidates_json TEXT NOT NULL,
 name_round INTEGER NOT NULL DEFAULT 0, vote_a INTEGER, vote_b INTEGER, child_name TEXT,
 revision INTEGER NOT NULL DEFAULT 0, formed_op TEXT NOT NULL, last_op TEXT NOT NULL,
 CHECK(parent_a<>parent_b)
);
CREATE INDEX IF NOT EXISTS web_life_parent_a ON web_life_families(parent_a,formed_at);
CREATE INDEX IF NOT EXISTS web_life_parent_b ON web_life_families(parent_b,formed_at);
CREATE TABLE IF NOT EXISTS web_life_members (public_id TEXT PRIMARY KEY, family_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS web_life_operations (
 id TEXT PRIMARY KEY, public_id TEXT NOT NULL, action TEXT NOT NULL, payload_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS web_life_end_tokens (
 id TEXT PRIMARY KEY, public_id TEXT NOT NULL, family_id TEXT NOT NULL, revision INTEGER NOT NULL,
 expires_at INTEGER NOT NULL, child_born INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS web_life_workers (
 public_id TEXT PRIMARY KEY, family_id TEXT NOT NULL, cursor_ms INTEGER NOT NULL,
 exp_remainder INTEGER NOT NULL DEFAULT 0 CHECK(exp_remainder BETWEEN 0 AND 59),
 coin_remainder INTEGER NOT NULL DEFAULT 0 CHECK(coin_remainder BETWEEN 0 AND 59),
 revision INTEGER NOT NULL DEFAULT 0, last_op TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS web_life_claims (
 id TEXT PRIMARY KEY, public_id TEXT NOT NULL, family_id TEXT NOT NULL,
 minutes INTEGER NOT NULL CHECK(minutes BETWEEN 1 AND 480),
 exp INTEGER NOT NULL CHECK(exp BETWEEN 0 AND 16), coins INTEGER NOT NULL CHECK(coins BETWEEN 0 AND 8),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','rejected')),
 created_at INTEGER NOT NULL, polled_at INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS web_life_claim_poll ON web_life_claims(status,polled_at,created_at);
