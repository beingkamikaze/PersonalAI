-- Phase 5: soft-launch feedback capture
-- Run in Supabase SQL Editor after Phase 0–4 migrations.

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'public', 'landing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created
  ON feedback(created_at DESC);
