CREATE TABLE IF NOT EXISTS web_rpg_snapshot (
  key TEXT PRIMARY KEY,
  captured_at INTEGER NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS web_visit_counter (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  total INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS web_character (
  public_id TEXT PRIMARY KEY,
  gender TEXT NOT NULL,
  sprite TEXT NOT NULL,
  color TEXT NOT NULL,
  accessory TEXT NOT NULL,
  share_image INTEGER NOT NULL DEFAULT 0
);
