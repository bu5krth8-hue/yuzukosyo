-- Keep the original ledger and receipt cursor. Only the first migration scans history.
CREATE TABLE IF NOT EXISTS town_support_rollup (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 epoch TEXT NOT NULL CHECK(length(epoch)=32 AND epoch NOT GLOB '*[^0-9a-f]*'),
 applied INTEGER NOT NULL CHECK(applied>=0),
 total INTEGER NOT NULL CHECK(total>=applied)
);

INSERT INTO town_support_rollup(singleton,epoch,applied,total)
SELECT 1, meta.epoch, meta.applied,
 CASE WHEN history.first>=1 AND history.total=history.last THEN history.total END
FROM (
 SELECT COUNT(*) AS total, COALESCE(MIN(id),1) AS first, COALESCE(MAX(id),0) AS last
 FROM town_support_v2 WHERE NOT EXISTS (SELECT 1 FROM town_support_rollup WHERE singleton=1)
) AS history
LEFT JOIN town_support_meta AS meta ON meta.singleton=1
WHERE NOT EXISTS (SELECT 1 FROM town_support_rollup WHERE singleton=1);

CREATE TRIGGER IF NOT EXISTS town_support_rollup_insert AFTER INSERT ON town_support_v2
BEGIN
 UPDATE town_support_rollup SET total=NEW.id WHERE singleton=1 AND total=NEW.id-1;
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'town_support_sequence_invalid') END;
END;

CREATE TRIGGER IF NOT EXISTS town_support_rollup_receipt AFTER UPDATE OF epoch,applied ON town_support_meta
WHEN NEW.epoch<>OLD.epoch OR NEW.applied<>OLD.applied
BEGIN
 UPDATE town_support_rollup SET epoch=NEW.epoch, applied=NEW.applied WHERE singleton=NEW.singleton;
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'town_support_rollup_missing') END;
END;

CREATE TRIGGER IF NOT EXISTS town_support_ledger_no_delete BEFORE DELETE ON town_support_v2
BEGIN
 SELECT RAISE(ABORT,'town_support_ledger_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS town_support_ledger_id_immutable BEFORE UPDATE ON town_support_v2
WHEN NEW.id<>OLD.id
BEGIN
 SELECT RAISE(ABORT,'town_support_ledger_is_append_only');
END;
