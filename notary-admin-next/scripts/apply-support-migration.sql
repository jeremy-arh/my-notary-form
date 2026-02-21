-- Exécutez ce script dans le SQL Editor de Supabase (Dashboard > SQL Editor)
-- pour créer les tables support_tickets et support_ticket_comments

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  submission_id UUID REFERENCES submission(id) ON DELETE SET NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  created_by_type VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (created_by_type IN ('admin', 'client', 'system')),
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_submission ON support_tickets(submission_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON support_tickets(client_id);

CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by_type VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (created_by_type IN ('admin', 'client', 'system')),
  created_by_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket ON support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_created ON support_ticket_comments(created_at DESC);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage support_tickets" ON support_tickets;
CREATE POLICY "Service role can manage support_tickets"
  ON support_tickets FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage ticket comments" ON support_ticket_comments;
CREATE POLICY "Service role can manage ticket comments"
  ON support_ticket_comments FOR ALL
  USING (auth.role() = 'service_role');
