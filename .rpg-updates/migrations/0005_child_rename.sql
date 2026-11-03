CREATE TABLE IF NOT EXISTS web_life_rename (
 family_id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL UNIQUE,
 proposer TEXT NOT NULL, proposed_name TEXT NOT NULL,
 code_hash TEXT NOT NULL, base_revision INTEGER NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
 used INTEGER NOT NULL DEFAULT 0 CHECK(used IN (0,1))
);
