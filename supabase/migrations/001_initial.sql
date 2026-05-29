-- Artifact Hub — initial schema
-- Run via: npx supabase db push

-- Enums
CREATE TYPE artifact_type       AS ENUM ('pdf', 'image', 'html');
CREATE TYPE artifact_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE feedback_type       AS ENUM ('approval', 'suggestion', 'issue', 'question');
CREATE TYPE feedback_status     AS ENUM ('open', 'resolved', 'needs_review');

-- artifacts
CREATE TABLE artifacts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text        NOT NULL,
  description       text,
  tags              text[]      NOT NULL DEFAULT '{}',
  type              artifact_type       NOT NULL,
  mime_type         text        NOT NULL,
  visibility        artifact_visibility NOT NULL DEFAULT 'public',
  storage_path      text        NOT NULL,
  file_size         int8,
  original_filename text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX artifacts_visibility_idx  ON artifacts (visibility);
CREATE INDEX artifacts_tags_idx        ON artifacts USING GIN (tags);
CREATE INDEX artifacts_created_at_idx  ON artifacts (created_at DESC);

-- feedback
CREATE TABLE feedback (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id    uuid          NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  reviewer_name  text          NOT NULL,
  reviewer_role  text,
  feedback_type  feedback_type NOT NULL,
  status         feedback_status NOT NULL DEFAULT 'open',
  comment        text          NOT NULL,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX feedback_artifact_id_idx ON feedback (artifact_id);

-- share_links
CREATE TABLE share_links (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id  uuid        NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  token        text        UNIQUE NOT NULL,
  expires_at   timestamptz NOT NULL,
  label        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX share_links_token_idx       ON share_links (token);
CREATE INDEX share_links_expires_at_idx  ON share_links (expires_at);
CREATE INDEX share_links_artifact_id_idx ON share_links (artifact_id);

-- feedback_summaries
CREATE TABLE feedback_summaries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id     uuid        UNIQUE NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
  summary         jsonb       NOT NULL,
  feedback_count  int4        NOT NULL,
  model           text,
  prompt_version  text,
  generated_at    timestamptz NOT NULL
);

CREATE UNIQUE INDEX feedback_summaries_artifact_id_idx ON feedback_summaries (artifact_id);

-- Storage bucket (private; must also be created in the Supabase dashboard or via CLI)
-- Run after applying this migration:
--   supabase storage create artifacts --private
