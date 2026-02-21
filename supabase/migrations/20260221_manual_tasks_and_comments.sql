-- Permettre les tâches manuelles (sans submission) et ajouter les commentaires

-- 1. Rendre submission_id nullable pour les tâches manuelles
ALTER TABLE submission_tasks ALTER COLUMN submission_id DROP NOT NULL;

-- 2. Mettre à jour la contrainte UNIQUE : drop l'ancienne et ajouter des index partiels
-- Drop the inline UNIQUE constraint (PostgreSQL names it submission_tasks_submission_id_order_item_ref_key)
ALTER TABLE submission_tasks DROP CONSTRAINT IF EXISTS submission_tasks_submission_id_order_item_ref_key;

-- Index unique pour les tâches liées à une submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_tasks_submission_order_ref
  ON submission_tasks(submission_id, order_item_ref)
  WHERE submission_id IS NOT NULL;

-- Index unique pour les tâches manuelles (order_item_ref doit être unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_tasks_manual_order_ref
  ON submission_tasks(order_item_ref)
  WHERE submission_id IS NULL;

-- 3. Table des commentaires pour les tâches
CREATE TABLE IF NOT EXISTS submission_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES submission_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by_type VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (created_by_type IN ('admin', 'notary', 'system')),
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_task_comments_task ON submission_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_submission_task_comments_created ON submission_task_comments(created_at DESC);

ALTER TABLE submission_task_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage task comments" ON submission_task_comments;
CREATE POLICY "Service role can manage task comments"
  ON submission_task_comments FOR ALL
  USING (auth.role() = 'service_role');
