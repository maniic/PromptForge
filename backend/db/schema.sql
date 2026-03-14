-- PromptForge Supabase Schema
-- Deploy via Supabase Dashboard > SQL Editor > Run
-- Phase 3: Community Prompt Library

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- prompts: community-shared forged prompts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompts (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    title             text        NOT NULL,
    author_name       text        NOT NULL,
    category          text        NOT NULL,
    original_input    text,
    crafted_prompt    text,
    crafted_result    text,
    raw_result        text,
    total_latency_ms  float8,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompts_category   ON prompts (category);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts (created_at DESC);

-- ---------------------------------------------------------------------------
-- forge_events: telemetry log for every /api/forge call
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forge_events (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    input_text        text,
    category          text,
    total_latency_ms  float8,
    created_at        timestamptz NOT NULL DEFAULT now()
);
