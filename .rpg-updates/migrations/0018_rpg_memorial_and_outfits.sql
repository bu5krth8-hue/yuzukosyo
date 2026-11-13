CREATE TABLE IF NOT EXISTS rpg_boss_memorial (
  boss_key TEXT PRIMARY KEY,
  first_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS rpg_character_outfits (
  public_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
  sprite TEXT NOT NULL,
  color TEXT NOT NULL,
  accessory TEXT NOT NULL,
  PRIMARY KEY(public_id,slot)
);
