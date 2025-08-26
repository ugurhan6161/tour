-- Create tasks table for trip management
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  dropoff_location TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_notes TEXT,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'new',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_files table for document and passport uploads
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('trip_document', 'passport', 'other')),
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tasks table
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "drivers_can_view_assigned_tasks" ON public.tasks
  FOR SELECT USING (
    assigned_driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

CREATE POLICY "operations_can_manage_tasks" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

CREATE POLICY "drivers_can_update_assigned_tasks" ON public.tasks
  FOR UPDATE USING (
    assigned_driver_id = auth.uid() AND 
    status IN ('assigned', 'in_progress')
  );

-- Enable RLS on task_files table
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_files
CREATE POLICY "users_can_view_task_files" ON public.task_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.assigned_driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('operations', 'admin')
        )
      )
    )
  );

CREATE POLICY "users_can_upload_task_files" ON public.task_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND (
        t.assigned_driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() AND role IN ('operations', 'admin')
        )
      )
    )
  );

CREATE POLICY "operations_can_manage_task_files" ON public.task_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );
