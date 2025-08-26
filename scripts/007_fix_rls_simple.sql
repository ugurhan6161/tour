-- Tüm mevcut policy'leri kaldır ve basit RLS policy'leri yeniden oluştur
-- Drop all existing policies to fix infinite recursion
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "operations_can_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "operations_can_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "drivers_can_view_assigned_tasks" ON tasks;
DROP POLICY IF EXISTS "operations_can_manage_all_tasks" ON tasks;
DROP POLICY IF EXISTS "drivers_can_view_own_info" ON drivers;
DROP POLICY IF EXISTS "operations_can_manage_drivers" ON drivers;
DROP POLICY IF EXISTS "users_can_manage_own_files" ON task_files;
DROP POLICY IF EXISTS "operations_can_manage_all_files" ON task_files;

-- Create simple, safe RLS policies following Supabase best practices

-- Profiles table policies
CREATE POLICY "profiles_select_own" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles 
  FOR DELETE USING (auth.uid() = id);

-- Allow operations users to view all profiles (simple role check)
CREATE POLICY "operations_view_all_profiles" ON profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

-- Tasks table policies
CREATE POLICY "tasks_select_own" ON tasks 
  FOR SELECT USING (
    auth.uid() = created_by OR 
    auth.uid() = assigned_driver_id OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "tasks_insert_operations" ON tasks 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "tasks_update_operations" ON tasks 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "tasks_delete_operations" ON tasks 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

-- Drivers table policies
CREATE POLICY "drivers_select_own" ON drivers 
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "drivers_insert_operations" ON drivers 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "drivers_update_operations" ON drivers 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

-- Task files policies
CREATE POLICY "task_files_select" ON task_files 
  FOR SELECT USING (
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM tasks t 
      WHERE t.id = task_id 
      AND (t.assigned_driver_id = auth.uid() OR t.created_by = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );

CREATE POLICY "task_files_insert" ON task_files 
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND (
      EXISTS (
        SELECT 1 FROM tasks t 
        WHERE t.id = task_id 
        AND (t.assigned_driver_id = auth.uid() OR t.created_by = auth.uid())
      ) OR
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role IN ('operations', 'admin')
      )
    )
  );

CREATE POLICY "task_files_delete" ON task_files 
  FOR DELETE USING (
    auth.uid() = uploaded_by OR
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('operations', 'admin')
    )
  );
