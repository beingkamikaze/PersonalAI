-- Phase 2: documents + chunk embeddings for RAG
-- Run in Supabase SQL Editor after Phase 0/1 migrations.
-- Requires: CREATE EXTENSION vector (already in 001_phase0.sql)

CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT,
  mime_type TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload'
    CHECK (source_type IN ('upload', 'notes', 'url')),
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_profile
  ON documents(ai_profile_id);

CREATE INDEX IF NOT EXISTS idx_documents_status
  ON documents(ai_profile_id, status);

-- text-embedding-3-small → 1536 dims (OpenAI / Azure equivalent)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  ai_profile_id UUID NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INT NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_profile
  ON document_chunks(ai_profile_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document
  ON document_chunks(document_id);

-- HNSW works well for MVP-scale corpora; recreate if you change dimensions
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
