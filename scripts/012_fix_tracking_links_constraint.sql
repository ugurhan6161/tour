-- Fix for ON CONFLICT issue with tracking_links table
-- This script adds an explicit unique constraint on task_id column

-- First, let's check if the constraint already exists
-- SELECT conname FROM pg_constraint WHERE conrelid = 'tracking_links'::regclass AND contype = 'u';

-- Add explicit unique constraint on task_id if it doesn't exist
ALTER TABLE public.tracking_links 
ADD CONSTRAINT tracking_links_task_id_unique UNIQUE (task_id);

-- Alternative approach: If the above fails, we can drop and recreate the column with the constraint
-- ALTER TABLE public.tracking_links DROP CONSTRAINT IF EXISTS tracking_links_task_id_unique;
-- ALTER TABLE public.tracking_links ADD CONSTRAINT tracking_links_task_id_unique UNIQUE (task_id);