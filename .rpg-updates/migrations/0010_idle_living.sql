-- Additive claim ledger. Personal-life rewards are never restored with a backup.
CREATE TABLE IF NOT EXISTS idle272_claims (
 public_id TEXT NOT NULL,
 day_key TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('gather','win','social','birthday')),
 created_at INTEGER NOT NULL,
 PRIMARY KEY(public_id,day_key,kind)
);
