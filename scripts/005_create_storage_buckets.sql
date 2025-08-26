-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for task files
CREATE POLICY "Users can view task files they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'task-files' AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.task_files tf ON t.id = tf.task_id
    WHERE tf.file_path = name AND (
      t.assigned_driver_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('operations', 'admin')
      )
    )
  )
);

CREATE POLICY "Users can upload task files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-files' AND
  (
    -- Drivers can upload to their assigned tasks
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.assigned_driver_id = auth.uid() AND
      name LIKE t.id::text || '/%'
    ) OR
    -- Operations can upload to any task
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  )
);

CREATE POLICY "Users can delete task files they uploaded" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-files' AND
  (
    -- Users can delete files they uploaded
    EXISTS (
      SELECT 1 FROM public.task_files tf
      WHERE tf.file_path = name AND tf.uploaded_by = auth.uid()
    ) OR
    -- Operations can delete any task file
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  )
);
