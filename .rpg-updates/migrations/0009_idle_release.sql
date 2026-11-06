ALTER TABLE idle270_events ADD COLUMN detail_json TEXT NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS idle271_receipts(public_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,payload_hash TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(public_id,request_id));
CREATE TABLE IF NOT EXISTS idle271_backups(public_id TEXT NOT NULL,revision INTEGER NOT NULL,cursor_ms INTEGER NOT NULL,state_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(public_id,revision));
