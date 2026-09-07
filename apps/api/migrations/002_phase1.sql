-- Phase 1: personality, facts, interview progress, owner chat
-- Run in Supabase SQL Editor after Phase 0 tables exist.

CREATE TABLE IF NOT EXISTS personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL UNIQUE REFERENCES ai_profiles(id) ON DELETE CASCADE,
  communication_style TEXT,
  formality TEXT,
  humor TEXT,
  verbosity TEXT,
  directness TEXT,
  languages JSONB DEFAULT '[]'::jsonb,
  traits JSONB DEFAULT '[]'::jsonb,
  preferences_json JSONB DEFAULT '{}'::jsonb,
  values_json JSONB DEFAULT '{}'::jsonb,
  boundaries_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS structured_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'interview'
    CHECK (source IN ('interview', 'manual', 'doc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_structured_facts_profile
  ON structured_facts(ai_profile_id);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL UNIQUE REFERENCES ai_profiles(id) ON DELETE CASCADE,
  current_index INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  -- [{ "question_index": 0, "question": "...", "answer": "..." }, ...]
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'owner'
    CHECK (channel IN ('owner', 'public')),
  visitor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_profile
  ON conversations(ai_profile_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  token_count INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id);
