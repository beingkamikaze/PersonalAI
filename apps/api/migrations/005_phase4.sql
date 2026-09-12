-- Phase 4: analytics counters for public share loop
-- Username uniqueness already on ai_profiles (Phase 0).
-- Run in Supabase SQL Editor after Phase 0–3 migrations.

CREATE TABLE IF NOT EXISTS analytics_daily (
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  visits INT NOT NULL DEFAULT 0,
  conversations INT NOT NULL DEFAULT 0,
  messages INT NOT NULL DEFAULT 0,
  PRIMARY KEY (ai_profile_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_profile
  ON analytics_daily(ai_profile_id);
