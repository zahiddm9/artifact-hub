ALTER TABLE feedback_summaries
  ADD COLUMN IF NOT EXISTS content_hash TEXT;
