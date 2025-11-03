-- Create vehicles table for managing company vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  color TEXT,
  year INTEGER,
  capacity INTEGER DEFAULT 4,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(is_active);

-- Enable RLS on vehicles table
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- RLS policies for vehicles
CREATE POLICY "operations_can_manage_vehicles" ON public.vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

CREATE POLICY "drivers_can_view_vehicles" ON public.vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('driver', 'operations', 'admin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
