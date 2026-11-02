CREATE TABLE IF NOT EXISTS world252_gate(token_hash TEXT PRIMARY KEY,public_id TEXT NOT NULL,account_session_hash TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS world252_gate_expiry ON world252_gate(expires_at);
CREATE TABLE IF NOT EXISTS world252_limits(bucket_key TEXT PRIMARY KEY,hits INTEGER NOT NULL DEFAULT 0,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS world252_saves(public_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 0,state_json TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS world252_ops(public_id TEXT NOT NULL,request_id TEXT NOT NULL,payload_hash TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(public_id,request_id));
CREATE INDEX IF NOT EXISTS world252_ops_owner_time ON world252_ops(public_id,created_at);
