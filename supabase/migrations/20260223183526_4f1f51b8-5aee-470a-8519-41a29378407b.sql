
-- Add assigned_user_id to secretarial_changes for workbench assignee filtering
ALTER TABLE public.secretarial_changes
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid;
