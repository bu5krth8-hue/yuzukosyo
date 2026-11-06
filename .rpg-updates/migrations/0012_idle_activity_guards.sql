-- Serialize the new activity slot with existing exploration/work, including races.
CREATE TRIGGER IF NOT EXISTS idle275_run_start_guard BEFORE INSERT ON idle274_runs
WHEN json_extract(NEW.run_json,'$.claimed')=0 AND (
 EXISTS(SELECT 1 FROM web_missions WHERE owner=NEW.public_id AND status='running') OR
 EXISTS(SELECT 1 FROM web_work_state w LEFT JOIN web_work_duty d ON d.public_id=w.public_id WHERE w.public_id=NEW.public_id AND COALESCE(d.active,1)=1))
BEGIN SELECT RAISE(ABORT,'idle_activity_conflict'); END;
CREATE TRIGGER IF NOT EXISTS idle275_run_update_guard BEFORE UPDATE ON idle274_runs
WHEN json_extract(NEW.run_json,'$.claimed')=0 AND (
 EXISTS(SELECT 1 FROM web_missions WHERE owner=NEW.public_id AND status='running') OR
 EXISTS(SELECT 1 FROM web_work_state w LEFT JOIN web_work_duty d ON d.public_id=w.public_id WHERE w.public_id=NEW.public_id AND COALESCE(d.active,1)=1))
BEGIN SELECT RAISE(ABORT,'idle_activity_conflict'); END;
CREATE TRIGGER IF NOT EXISTS idle275_legacy_mission_guard BEFORE INSERT ON web_missions
WHEN NEW.status='running' AND EXISTS(SELECT 1 FROM idle274_runs WHERE public_id=NEW.owner AND json_extract(run_json,'$.claimed')=0)
BEGIN SELECT RAISE(ABORT,'idle_activity_conflict'); END;
CREATE TRIGGER IF NOT EXISTS idle275_legacy_work_guard BEFORE INSERT ON web_work_state
WHEN EXISTS(SELECT 1 FROM idle274_runs WHERE public_id=NEW.public_id AND json_extract(run_json,'$.claimed')=0)
BEGIN SELECT RAISE(ABORT,'idle_activity_conflict'); END;
CREATE TRIGGER IF NOT EXISTS idle275_legacy_work_update_guard BEFORE UPDATE ON web_work_state
WHEN EXISTS(SELECT 1 FROM idle274_runs WHERE public_id=NEW.public_id AND json_extract(run_json,'$.claimed')=0)
BEGIN SELECT RAISE(ABORT,'idle_activity_conflict'); END;
