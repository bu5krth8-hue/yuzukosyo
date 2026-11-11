CREATE TABLE IF NOT EXISTS rpg_expedition_polls (
  ended_at INTEGER PRIMARY KEY,
  candidates TEXT NOT NULL,
  run_id TEXT,
  winner INTEGER
);
CREATE TABLE IF NOT EXISTS rpg_expedition_votes (
  ended_at INTEGER NOT NULL,
  voter TEXT NOT NULL,
  region INTEGER NOT NULL CHECK(region BETWEEN 0 AND 119),
  PRIMARY KEY (ended_at, voter)
);
