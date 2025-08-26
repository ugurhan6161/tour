-- Fix infinite recursion in RLS policies by using JWT claims instead of table queries

-- Drop existing problematic policies
DROP POLICY IF EXISTS "operations_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "operations_can_manage_drivers" ON public.drivers;

-- Create safer RLS policies using JWT claims
-- First, create a function to get user role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'user_metadata' ->> 'role')::TEXT,
    'driver'
  );
$$;

-- Updated profiles policies without recursion
CREATE POLICY "operations_can_view_all_profiles_safe" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    public.get_user_role() IN ('operations', 'admin')
  );

-- Updated drivers policies without recursion  
CREATE POLICY "operations_can_manage_drivers_safe" ON public.drivers
  FOR ALL USING (
    auth.uid() = id OR 
    public.get_user_role() IN ('operations', 'admin')
  );

-- Also create a simpler fallback policy that doesn't rely on metadata
CREATE POLICY "admin_full_access_profiles" ON public.profiles
  FOR ALL USING (
    -- Allow if user is accessing their own record
    auth.uid() = id OR
    -- Or if this is a service role call (for operations)
    auth.role() = 'service_role'
  );

CREATE POLICY "admin_full_access_drivers" ON public.drivers  
  FOR ALL USING (
    -- Allow if user is accessing their own record
    auth.uid() = id OR
    -- Or if this is a service role call (for operations)
    auth.role() = 'service_role'
  );
