-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- If the user is a driver, create a driver record
  IF COALESCE(NEW.raw_user_meta_data ->> 'role', 'driver') = 'driver' THEN
    INSERT INTO public.drivers (id, vehicle_plate, license_number)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'vehicle_plate', ''),
      COALESCE(NEW.raw_user_meta_data ->> 'license_number', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
