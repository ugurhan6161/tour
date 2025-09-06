-- Additional tables for customer tracking, ratings, and live location
-- This script should be run after the existing database setup

-- Create tracking_links table for public customer tracking pages
CREATE TABLE IF NOT EXISTS public.tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE UNIQUE,
  tracking_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer_ratings table for post-trip feedback
CREATE TABLE IF NOT EXISTS public.customer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tracking_link_id UUID NOT NULL REFERENCES public.tracking_links(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  customer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver_locations table for real-time tracking
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver_photos table for customer-facing driver info
CREATE TABLE IF NOT EXISTS public.driver_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add vehicle information to drivers table (if not exists)
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;

-- Add tracking and notification fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS estimated_pickup_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_pickup_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS estimated_dropoff_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_dropoff_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pickup_coordinates POINT,
ADD COLUMN IF NOT EXISTS dropoff_coordinates POINT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON public.tracking_links(tracking_code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_task ON public.tracking_links(task_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_time ON public.driver_locations(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_customer_ratings_task ON public.customer_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_driver ON public.tasks(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.tasks(pickup_date);

-- Enable RLS on new tables
ALTER TABLE public.tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for tracking_links (public access for active links)
CREATE POLICY "tracking_links_public_select" ON public.tracking_links
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "tracking_links_operations_manage" ON public.tracking_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

-- RLS policies for customer_ratings (public insert, operations view)
CREATE POLICY "customer_ratings_public_insert" ON public.customer_ratings
  FOR INSERT WITH CHECK (true); -- Anyone can submit a rating

CREATE POLICY "customer_ratings_operations_select" ON public.customer_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

-- RLS policies for driver_locations
CREATE POLICY "driver_locations_driver_insert" ON public.driver_locations
  FOR INSERT WITH CHECK (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

CREATE POLICY "driver_locations_select_all" ON public.driver_locations
  FOR SELECT USING (
    -- Drivers can see their own location
    driver_id = auth.uid() OR
    -- Operations can see all locations
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    ) OR
    -- Public can see locations for active tracking links
    EXISTS (
      SELECT 1 FROM public.tracking_links tl
      JOIN public.tasks t ON tl.task_id = t.id
      WHERE t.assigned_driver_id = driver_id 
      AND tl.is_active = true 
      AND (tl.expires_at IS NULL OR tl.expires_at > NOW())
    )
  );

-- RLS policies for driver_photos
CREATE POLICY "driver_photos_driver_manage" ON public.driver_photos
  FOR ALL USING (
    driver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  );

CREATE POLICY "driver_photos_public_select" ON public.driver_photos
  FOR SELECT USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM public.tracking_links tl
      JOIN public.tasks t ON tl.task_id = t.id
      WHERE t.assigned_driver_id = driver_id 
      AND tl.is_active = true 
      AND (tl.expires_at IS NULL OR tl.expires_at > NOW())
    )
  );

-- Function to generate unique tracking codes
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.tracking_links WHERE tracking_code = code) INTO exists_code;
    
    -- If it doesn't exist, return it
    IF NOT exists_code THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create tracking link when task is assigned
CREATE OR REPLACE FUNCTION create_tracking_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create tracking link when task is assigned to a driver and tracking is enabled
  IF NEW.assigned_driver_id IS NOT NULL AND NEW.tracking_enabled = true THEN
    -- Insert tracking link with proper conflict handling
    INSERT INTO public.tracking_links (task_id, tracking_code, expires_at)
    VALUES (
      NEW.id, 
      generate_tracking_code(),
      CASE 
        WHEN NEW.pickup_date IS NOT NULL THEN NEW.pickup_date + INTERVAL '1 day'
        ELSE NOW() + INTERVAL '7 days'
      END
    )
    ON CONFLICT (task_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create tracking links
DROP TRIGGER IF EXISTS trigger_create_tracking_link ON public.tasks;
CREATE TRIGGER trigger_create_tracking_link
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_tracking_link();

-- Function to clean up old location data (keep only last 24 hours per driver)
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.driver_locations 
  WHERE timestamp < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old location records per driver (keep only latest N records)
CREATE OR REPLACE FUNCTION cleanup_driver_locations(p_driver_id UUID, p_keep_count INTEGER DEFAULT 10)
RETURNS void AS $$
BEGIN
  DELETE FROM public.driver_locations 
  WHERE driver_id = p_driver_id 
  AND id NOT IN (
    SELECT id FROM public.driver_locations 
    WHERE driver_id = p_driver_id 
    ORDER BY timestamp DESC 
    LIMIT p_keep_count
  );
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for driver photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-photos', 'driver-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for driver photos
CREATE POLICY "Driver photos are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'driver-photos');

CREATE POLICY "Drivers can upload their own photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'driver-photos' AND
  (
    -- Drivers can upload their own photos
    auth.uid()::text = split_part(name, '/', 1) OR
    -- Operations can upload photos for any driver
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  )
);

CREATE POLICY "Users can update their own driver photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'driver-photos' AND
  (
    auth.uid()::text = split_part(name, '/', 1) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  )
);

CREATE POLICY "Users can delete their own driver photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'driver-photos' AND
  (
    auth.uid()::text = split_part(name, '/', 1) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('operations', 'admin')
    )
  )
);