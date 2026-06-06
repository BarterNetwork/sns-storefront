-- Add this to your Supabase SQL Editor
-- (append to schema.sql or run separately)

-- Sync log: tracks every sync run for debugging
CREATE TABLE IF NOT EXISTS sync_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode         TEXT NOT NULL,              -- 'inventory' or 'full'
  status       TEXT NOT NULL,              -- 'success' or 'error'
  duration_ms  INTEGER,
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Keep only last 90 days of logs automatically
CREATE OR REPLACE FUNCTION prune_sync_log() RETURNS trigger AS $$
BEGIN
  DELETE FROM sync_log WHERE created_at < NOW() - INTERVAL '90 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prune_sync_log
  AFTER INSERT ON sync_log
  EXECUTE FUNCTION prune_sync_log();
