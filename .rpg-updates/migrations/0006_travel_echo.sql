CREATE TABLE IF NOT EXISTS web_echo_settings(public_id TEXT PRIMARY KEY,enabled INTEGER NOT NULL CHECK(enabled IN(0,1)));
CREATE TABLE IF NOT EXISTS web_travel_echo(
 mission_id TEXT PRIMARY KEY, owner TEXT NOT NULL, helper TEXT NOT NULL,
 owner_name TEXT NOT NULL, helper_name TEXT NOT NULL, job TEXT NOT NULL,
 region INTEGER NOT NULL, day_key TEXT NOT NULL, slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
 bonus INTEGER NOT NULL CHECK(bonus=5), story TEXT NOT NULL, meetings INTEGER NOT NULL,
 created_at INTEGER NOT NULL, completed_at INTEGER,
 UNIQUE(helper,day_key,slot),CHECK(owner<>helper)
);
CREATE INDEX IF NOT EXISTS web_echo_owner ON web_travel_echo(owner,created_at);
CREATE INDEX IF NOT EXISTS web_echo_helper ON web_travel_echo(helper,created_at);
