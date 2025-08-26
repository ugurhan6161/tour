-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_driver ON public.tasks(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_pickup_date ON public.tasks(pickup_date);
CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for driver tasks with profile information
CREATE OR REPLACE VIEW public.driver_tasks_view AS
SELECT 
  t.*,
  p.full_name as driver_name,
  p.phone as driver_phone,
  d.vehicle_plate
FROM public.tasks t
LEFT JOIN public.drivers d ON t.assigned_driver_id = d.id
LEFT JOIN public.profiles p ON d.id = p.id;

-- Create view for task files with task information
CREATE OR REPLACE VIEW public.task_files_view AS
SELECT 
  tf.*,
  t.title as task_title,
  t.customer_name,
  p.full_name as uploaded_by_name
FROM public.task_files tf
JOIN public.tasks t ON tf.task_id = t.id
JOIN public.profiles p ON tf.uploaded_by = p.id;
