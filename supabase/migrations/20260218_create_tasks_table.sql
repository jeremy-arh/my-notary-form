-- Table: submission_tasks
-- Tâches créées automatiquement lorsque une option est présente dans une commande

CREATE TABLE IF NOT EXISTS submission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  order_item_ref TEXT NOT NULL,
  option_id TEXT NOT NULL,
  option_name TEXT NOT NULL,
  document_context TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, order_item_ref)
);

CREATE INDEX IF NOT EXISTS idx_submission_tasks_submission ON submission_tasks(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_tasks_status ON submission_tasks(status);
CREATE INDEX IF NOT EXISTS idx_submission_tasks_created ON submission_tasks(created_at DESC);

COMMENT ON TABLE submission_tasks IS 'Tâches créées automatiquement pour chaque option contenue dans une commande';

CREATE OR REPLACE FUNCTION update_submission_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_submission_tasks_updated_at ON submission_tasks;
CREATE TRIGGER update_submission_tasks_updated_at
  BEFORE UPDATE ON submission_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_tasks_updated_at();

-- RLS: service_role only (admin API uses service role)
ALTER TABLE submission_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage all submission_tasks" ON submission_tasks;
CREATE POLICY "Service role can manage all submission_tasks"
  ON submission_tasks
  FOR ALL
  USING (auth.role() = 'service_role');
