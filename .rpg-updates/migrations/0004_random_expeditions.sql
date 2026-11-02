-- Passive companions have a separate daily allowance and never hold an active mission slot.
CREATE TABLE IF NOT EXISTS web_mission_supporters (
 mission_id TEXT NOT NULL, public_id TEXT NOT NULL, day_key TEXT NOT NULL,
 day_slot INTEGER NOT NULL CHECK(day_slot BETWEEN 1 AND 6),
 PRIMARY KEY(mission_id,public_id), UNIQUE(public_id,day_key,day_slot)
);
CREATE TABLE IF NOT EXISTS web_random_support_settings (
 public_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 updated_at INTEGER NOT NULL
);
