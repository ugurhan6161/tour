-- RLS sonsuz döngü sorununu çözmek için tüm policy'leri kaldırıp en basit haliyle yeniden oluşturuyoruz

-- Tüm RLS'i kapat
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;

-- Tüm mevcut policy'leri kaldır
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "drivers_select_policy" ON drivers;
DROP POLICY IF EXISTS "drivers_update_policy" ON drivers;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "files_select_policy" ON uploaded_files;
DROP POLICY IF EXISTS "files_insert_policy" ON uploaded_files;

-- Profiles tablosu için en basit RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkes kendi profilini görebilir ve güncelleyebilir
CREATE POLICY "allow_own_profile_access" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Yeni profil oluşturma için
CREATE POLICY "allow_profile_insert" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Drivers tablosu için basit RLS
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_own_driver_access" ON drivers
    FOR ALL USING (auth.uid() = user_id);

-- Tasks tablosu için basit RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_task_access" ON tasks
    FOR ALL USING (
        auth.uid() = driver_id OR 
        auth.uid() = created_by
    );

-- Files tablosu için basit RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_file_access" ON uploaded_files
    FOR ALL USING (auth.uid() = uploaded_by);
