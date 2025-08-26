-- Tüm RLS policy'lerini kaldırıp en basit haliyle yeniden oluşturuyoruz
-- Sonsuz döngü sorununu çözmek için sadece auth.uid() kontrolü yapacağız

-- Önce tüm mevcut policy'leri kaldır
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Operations can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

DROP POLICY IF EXISTS "Drivers can view own info" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own info" ON drivers;
DROP POLICY IF EXISTS "Operations can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Operations can manage drivers" ON drivers;

DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Drivers can update assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Operations can manage all tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can upload files" ON uploaded_files;
DROP POLICY IF EXISTS "Operations can view all files" ON uploaded_files;

-- RLS'i kapat
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;

-- Basit RLS policy'leri oluştur - sadece auth.uid() kontrolü
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles için en basit policy'ler
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Drivers tablosu için basit policy'ler
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_policy" ON drivers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "drivers_update_policy" ON drivers
    FOR UPDATE USING (auth.uid() = user_id);

-- Tasks tablosu için basit policy'ler
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_policy" ON tasks
    FOR SELECT USING (
        auth.uid() = driver_id OR 
        auth.uid() = created_by
    );

CREATE POLICY "tasks_insert_policy" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "tasks_update_policy" ON tasks
    FOR UPDATE USING (
        auth.uid() = driver_id OR 
        auth.uid() = created_by
    );

-- Files tablosu için basit policy'ler
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "files_select_policy" ON uploaded_files
    FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "files_insert_policy" ON uploaded_files
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
