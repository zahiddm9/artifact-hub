-- Enable RLS on all tables.
-- All server-side queries use the service role key (createAdminClient) and bypass RLS.
-- These policies protect against direct anon-key REST API access.

ALTER TABLE artifacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_summaries ENABLE ROW LEVEL SECURITY;

-- artifacts: anon can only read public artifacts
CREATE POLICY "anon_read_public_artifacts"
  ON artifacts FOR SELECT
  USING (visibility = 'public');

-- feedback: anon can only read feedback for public artifacts
CREATE POLICY "anon_read_feedback_for_public_artifacts"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      WHERE a.id = artifact_id AND a.visibility = 'public'
    )
  );

-- share_links: no anon access (token lookup is done server-side via service role)

-- feedback_summaries: anon can only read summaries for public artifacts
CREATE POLICY "anon_read_summaries_for_public_artifacts"
  ON feedback_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artifacts a
      WHERE a.id = artifact_id AND a.visibility = 'public'
    )
  );
