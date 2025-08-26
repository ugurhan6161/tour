-- RLS sonsuz döngü sorununu çözmek için tüm policy'leri temizleyip basit olanları oluştur

-- Önce tüm mevcut policy'leri kaldır
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.profiles;

-- RLS'i devre dışı bırak, sonra tekrar etkinleştir
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Basit ve doğru policy'leri oluştur (Supabase örnek kodlarından)
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (auth.uid() = id);

-- Diğer tablolar için de basit policy'ler
-- Tasks tablosu
DROP POLICY IF EXISTS "tasks_policy" ON public.tasks;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_all" ON public.tasks 
  FOR SELECT USING (true);

CREATE POLICY "tasks_insert_authenticated" ON public.tasks 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_update_authenticated" ON public.tasks 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_delete_authenticated" ON public.tasks 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Drivers tablosu
DROP POLICY IF EXISTS "drivers_policy" ON public.drivers;
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_all" ON public.drivers 
  FOR SELECT USING (true);

CREATE POLICY "drivers_insert_authenticated" ON public.drivers 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "drivers_update_authenticated" ON public.drivers 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "drivers_delete_authenticated" ON public.drivers 
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Task files tablosu
DROP POLICY IF EXISTS "task_files_policy" ON public.task_files;
ALTER TABLE public.task_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_files_select_all" ON public.task_files 
  FOR SELECT USING (true);

CREATE POLICY "task_files_insert_authenticated" ON public.task_files 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "task_files_update_authenticated" ON public.task_files 
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "task_files_delete_authenticated" ON public.task_files 
  FOR DELETE USING (auth.uid() IS NOT NULL);
