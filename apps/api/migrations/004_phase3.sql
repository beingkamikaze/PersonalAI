-- Phase 3: episodic memories from owner chats
-- Run in Supabase SQL Editor after Phase 0–2 migrations.

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL DEFAULT 'fact'
    CHECK (memory_type IN ('preference', 'fact', 'boundary', 'project', 'other')),
  content TEXT NOT NULL,
  importance DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (importance >= 0 AND importance <= 1),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'owner_chat'
    CHECK (source IN ('owner_chat', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_profile
  ON memories(ai_profile_id);

CREATE INDEX IF NOT EXISTS idx_memories_profile_importance
  ON memories(ai_profile_id, importance DESC);
