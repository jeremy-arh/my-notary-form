-- Migration: Add DELETE policies for notarized_files
-- Run this SQL in your Supabase SQL Editor

-- Notaries can delete files for their assigned submissions
CREATE POLICY "Notaries can delete their notarized files"
  ON public.notarized_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.submission
      WHERE submission.id = notarized_files.submission_id
      AND submission.assigned_notary_id = (
        SELECT id FROM public.notary WHERE user_id = auth.uid()
      )
      AND notarized_files.notary_id = (
        SELECT id FROM public.notary WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can delete all files
CREATE POLICY "Admins can delete all notarized files"
  ON public.notarized_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_user
      WHERE admin_user.user_id = auth.uid()
    )
  );

