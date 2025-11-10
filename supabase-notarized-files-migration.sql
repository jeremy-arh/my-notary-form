-- Migration: Create tables for notarized files and file comments
-- Run this SQL in your Supabase SQL Editor

-- Table: notarized_files
-- Stores files uploaded by notaries (notarized documents)
CREATE TABLE IF NOT EXISTS public.notarized_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submission(id) ON DELETE CASCADE,
  notary_id UUID NOT NULL REFERENCES public.notary(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Table: file_comments
-- Stores comments on notarized files (visible to client, admin, and notary)
CREATE TABLE IF NOT EXISTS public.file_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.notarized_files(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.submission(id) ON DELETE CASCADE,
  commenter_type VARCHAR(50) NOT NULL CHECK (commenter_type IN ('notary', 'client', 'admin')),
  commenter_id UUID, -- Can be notary_id, client_id, or admin user_id
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notarized_files_submission ON public.notarized_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_notarized_files_notary ON public.notarized_files(notary_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_file ON public.file_comments(file_id);
CREATE INDEX IF NOT EXISTS idx_file_comments_submission ON public.file_comments(submission_id);

-- Enable Row Level Security
ALTER TABLE public.notarized_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notarized_files
-- Notaries can view files for their assigned submissions
CREATE POLICY "Notaries can view their notarized files"
  ON public.notarized_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submission
      INNER JOIN public.notary ON submission.assigned_notary_id = notary.id
      WHERE submission.id = notarized_files.submission_id
      AND notary.user_id = auth.uid()
    )
  );

-- Notaries can insert files for their assigned submissions
CREATE POLICY "Notaries can upload files"
  ON public.notarized_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submission
      WHERE submission.id = notarized_files.submission_id
      AND submission.assigned_notary_id = (
        SELECT id FROM public.notary WHERE user_id = auth.uid()
      )
    )
  );

-- Clients can view files for their submissions
CREATE POLICY "Clients can view their notarized files"
  ON public.notarized_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submission
      INNER JOIN public.client ON submission.client_id = client.id
      WHERE submission.id = notarized_files.submission_id
      AND client.user_id = auth.uid()
    )
  );

-- Admins can view all files
CREATE POLICY "Admins can view all notarized files"
  ON public.notarized_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

-- RLS Policies for file_comments
-- Notaries can view comments for their assigned submissions
CREATE POLICY "Notaries can view file comments"
  ON public.file_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submission
      INNER JOIN public.notary ON submission.assigned_notary_id = notary.id
      WHERE submission.id = file_comments.submission_id
      AND notary.user_id = auth.uid()
    )
  );

-- Notaries can insert comments
CREATE POLICY "Notaries can add file comments"
  ON public.file_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submission
      WHERE submission.id = file_comments.submission_id
      AND submission.assigned_notary_id = (
        SELECT id FROM public.notary WHERE user_id = auth.uid()
      )
      AND file_comments.commenter_type = 'notary'
    )
  );

-- Clients can add comments for their submissions
CREATE POLICY "Clients can add file comments"
  ON public.file_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submission
      INNER JOIN public.client ON submission.client_id = client.id
      WHERE submission.id = file_comments.submission_id
      AND client.user_id = auth.uid()
      AND file_comments.commenter_type = 'client'
    )
  );

-- Admins can add comments
CREATE POLICY "Admins can add file comments"
  ON public.file_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
      AND file_comments.commenter_type = 'admin'
    )
  );

-- Clients can view comments for their submissions
CREATE POLICY "Clients can view file comments"
  ON public.file_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.submission
      INNER JOIN public.client ON submission.client_id = client.id
      WHERE submission.id = file_comments.submission_id
      AND client.user_id = auth.uid()
    )
  );

-- Admins can view all comments
CREATE POLICY "Admins can view all file comments"
  ON public.file_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE public.notarized_files IS 'Files uploaded by notaries (notarized documents)';
COMMENT ON TABLE public.file_comments IS 'Comments on notarized files (visible to client, admin, and notary)';

