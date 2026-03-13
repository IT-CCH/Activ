-- Disable Row Level Security on activity tables since we're using public views with SECURITY DEFINER
ALTER TABLE activities.activity_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_media DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view activity categories" ON activities.activity_categories;
DROP POLICY IF EXISTS "Users can create activity categories" ON activities.activity_categories;
DROP POLICY IF EXISTS "Users can update activity categories" ON activities.activity_categories;
DROP POLICY IF EXISTS "Users can delete activity categories" ON activities.activity_categories;
