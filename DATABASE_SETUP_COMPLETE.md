# ActivityPlanner Database Setup - Complete Guide

## Overview

This guide covers everything you need to set up the ActivityPlanner database from creating the schema to testing and populating with data.

**Database Project**: tvyumorjdalhirarzzku (Capital Care Homes)  
**Database Type**: PostgreSQL via Supabase  
**Schema Name**: `activities` (separate from `meals` schema)

---

## Step 1: Access Supabase Dashboard

1. **Go to Supabase**: https://app.supabase.com
2. **Login** with your Supabase credentials
3. **Select Project**: Click on **tvyumorjdalhirarzzku**
4. **Navigate to SQL Editor**: Left sidebar → **SQL Editor**

---

## Step 2: Create the Activities Schema

Click **New Query** and run this SQL first to create the schema:

```sql
-- Create activities schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS activities;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA activities TO authenticated;
GRANT CREATE ON SCHEMA activities TO authenticated;

-- Set search path for easier queries
ALTER ROLE authenticated SET search_path = public, activities;
```

**Click "Run"** - You should see: `Success. No rows returned.`

---

## Step 3: Create All Tables

Copy and paste the complete SQL script below into a new query:

```sql
-- =====================================================
-- ACTIVITIES SCHEMA - Complete Table Setup
-- =====================================================

-- Drop existing tables (optional - only if resetting)
-- DROP TABLE IF EXISTS activities.activity_categories CASCADE;
-- DROP TABLE IF EXISTS activities.activities CASCADE;
-- ... (comment out unless resetting)

-- =====================================================
-- 1. ACTIVITY CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color_code VARCHAR(7) DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(care_home_id, name)
);

-- =====================================================
-- 2. ACTIVITIES TABLE (Main)
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES activities.activity_categories(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  objective TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_participants INTEGER,
  min_participants INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  location VARCHAR(200),
  equipment_required TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 3. ACTIVITY SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities.activities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_recurring BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 4. ACTIVITY SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities.activities(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES activities.activity_schedules(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(200),
  facilitator_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  actual_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 5. ACTIVITY ENROLLMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities.activities(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_hold', 'completed')),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discontinuation_date DATE,
  reason_for_discontinuation TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(activity_id, resident_id)
);

-- =====================================================
-- 6. ACTIVITY ATTENDEES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES activities.activity_sessions(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  attendance_status VARCHAR(20) DEFAULT 'attended' CHECK (attendance_status IN ('attended', 'absent', 'cancelled', 'not_scheduled')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  
  UNIQUE(session_id, resident_id)
);

-- =====================================================
-- 7. ACTIVITY FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES activities.activity_sessions(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  staff_member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  engagement_level INTEGER CHECK (engagement_level BETWEEN 1 AND 5),
  enjoyment_rating INTEGER CHECK (enjoyment_rating BETWEEN 1 AND 5),
  feedback_text TEXT,
  behavioral_observations TEXT,
  recommendations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 8. ACTIVITY RESOURCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities.activities(id) ON DELETE CASCADE,
  resource_name VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50), -- 'equipment', 'material', 'space', 'staff'
  quantity_needed INTEGER DEFAULT 1,
  quantity_available INTEGER,
  unit_of_measure VARCHAR(20),
  reorder_level INTEGER,
  cost_per_unit DECIMAL(10, 2),
  notes TEXT,
  is_reusable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 9. ACTIVITY EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities.activity_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_home_id UUID NOT NULL REFERENCES public.care_homes(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities.activities(id) ON DELETE CASCADE,
  session_id UUID REFERENCES activities.activity_sessions(id) ON DELETE SET NULL,
  description VARCHAR(200) NOT NULL,
  expense_category VARCHAR(50), -- 'equipment', 'supplies', 'refreshments', 'transport', 'other'
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  expense_date DATE NOT NULL,
  payment_method VARCHAR(30), -- 'cash', 'card', 'invoice', 'budget'
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  receipt_stored BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 10. ACTIVITY AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS activities.activity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50),
  record_id UUID,
  action VARCHAR(20), -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- CREATE INDEXES FOR COMMON QUERIES
-- =====================================================

-- Query: Find all sessions by care home and date range
CREATE INDEX IF NOT EXISTS idx_sessions_care_date ON activities.activity_sessions(care_home_id, session_date);

-- Query: Find expenses by care home and status
CREATE INDEX IF NOT EXISTS idx_expenses_care_status ON activities.activity_expenses(care_home_id, approval_status);

-- Query: Find resident enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_care_resident ON activities.activity_enrollments(care_home_id, resident_id);

-- Query: Find attendance records
CREATE INDEX IF NOT EXISTS idx_attendees_care_session ON activities.activity_attendees(care_home_id, session_id);

-- Individual indexes on tables
CREATE INDEX IF NOT EXISTS idx_activities_care_home ON activities.activities(care_home_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities.activities(status);
CREATE INDEX IF NOT EXISTS idx_schedules_activity ON activities.activity_schedules(activity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON activities.activity_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON activities.activity_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON activities.activity_sessions(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_resident ON activities.activity_enrollments(resident_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON activities.activity_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_attendees_session ON activities.activity_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_attendees_resident ON activities.activity_attendees(resident_id);
CREATE INDEX IF NOT EXISTS idx_feedback_session ON activities.activity_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_resident ON activities.activity_feedback(resident_id);
CREATE INDEX IF NOT EXISTS idx_resources_activity ON activities.activity_resources(activity_id);
CREATE INDEX IF NOT EXISTS idx_expenses_activity ON activities.activity_expenses(activity_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON activities.activity_expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON activities.activity_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_audit_table_action ON activities.activity_audit_log(table_name, action);
CREATE INDEX IF NOT EXISTS idx_audit_record ON activities.activity_audit_log(record_id);
```

**Click "Run"** - All tables will be created. You should see success messages.

---

## Step 4: Create Row Level Security (RLS) Policies

These policies ensure users can only see/edit their own care home's data.

Run this in a new query:

```sql
-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE activities.activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities.activity_audit_log ENABLE ROW LEVEL SECURITY;

-- Get user's care home ID from user_profiles
CREATE OR REPLACE FUNCTION get_user_care_home_id() RETURNS UUID AS $$
  SELECT care_home_id FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

-- =====================================================
-- ACTIVITY CATEGORIES POLICIES
-- =====================================================

CREATE POLICY "Users can view activity categories for their care home"
  ON activities.activity_categories FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create activity categories"
  ON activities.activity_categories FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update activity categories"
  ON activities.activity_categories FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITIES POLICIES
-- =====================================================

CREATE POLICY "Users can view activities for their care home"
  ON activities.activities FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create activities"
  ON activities.activities FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update activities"
  ON activities.activities FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITY SESSIONS POLICIES
-- =====================================================

CREATE POLICY "Users can view sessions for their care home"
  ON activities.activity_sessions FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create sessions"
  ON activities.activity_sessions FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update sessions"
  ON activities.activity_sessions FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITY ENROLLMENTS POLICIES
-- =====================================================

CREATE POLICY "Users can view enrollments for their care home"
  ON activities.activity_enrollments FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create enrollments"
  ON activities.activity_enrollments FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update enrollments"
  ON activities.activity_enrollments FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITY ATTENDEES POLICIES
-- =====================================================

CREATE POLICY "Users can view attendance for their care home"
  ON activities.activity_attendees FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Staff can record attendance"
  ON activities.activity_attendees FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager', 'staff'));

CREATE POLICY "Staff can update attendance"
  ON activities.activity_attendees FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager', 'staff'));

-- =====================================================
-- ACTIVITY FEEDBACK POLICIES
-- =====================================================

CREATE POLICY "Users can view feedback for their care home"
  ON activities.activity_feedback FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Staff can submit feedback"
  ON activities.activity_feedback FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager', 'staff'));

-- =====================================================
-- ACTIVITY RESOURCES POLICIES
-- =====================================================

CREATE POLICY "Users can view resources for their care home"
  ON activities.activity_resources FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can manage resources"
  ON activities.activity_resources FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update resources"
  ON activities.activity_resources FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITY EXPENSES POLICIES
-- =====================================================

CREATE POLICY "Users can view expenses for their care home"
  ON activities.activity_expenses FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create expenses"
  ON activities.activity_expenses FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update expenses"
  ON activities.activity_expenses FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- ACTIVITY SCHEDULES POLICIES
-- =====================================================

CREATE POLICY "Users can view schedules for their care home"
  ON activities.activity_schedules FOR SELECT
  USING (care_home_id = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "Managers can create schedules"
  ON activities.activity_schedules FOR INSERT
  WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

CREATE POLICY "Managers can update schedules"
  ON activities.activity_schedules FOR UPDATE
  USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager', 'manager'));

-- =====================================================
-- AUDIT LOG POLICIES
-- =====================================================

CREATE POLICY "Users can view audit logs for their care home"
  ON activities.activity_audit_log FOR SELECT
  USING ((SELECT care_home_id FROM activities.activities WHERE id = record_id) = get_user_care_home_id() OR 
         (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('super_admin', 'super_manager'));

CREATE POLICY "System can insert audit logs"
  ON activities.activity_audit_log FOR INSERT
  WITH CHECK (true);
```

**Click "Run"** - All RLS policies will be created.

---

## Step 5: Create Helpful Views (Optional but Useful)

Run this to create query views that make common operations easier:

```sql
-- =====================================================
-- HELPFUL DATABASE VIEWS
-- =====================================================

-- View: Today's Sessions with Facilitator Info
CREATE OR REPLACE VIEW activities.v_todays_sessions AS
SELECT 
  s.id,
  s.care_home_id,
  a.name as activity_name,
  s.session_date,
  s.start_time,
  s.end_time,
  s.location,
  u.email as facilitator_email,
  s.status,
  COUNT(DISTINCT att.resident_id) as attendee_count
FROM activities.activity_sessions s
LEFT JOIN activities.activities a ON s.activity_id = a.id
LEFT JOIN auth.users u ON s.facilitator_id = u.id
LEFT JOIN activities.activity_attendees att ON s.id = att.session_id
WHERE s.session_date = CURRENT_DATE
GROUP BY s.id, a.name, u.email;

-- View: Resident Activity Enrollment Summary
CREATE OR REPLACE VIEW activities.v_resident_enrollments AS
SELECT 
  ae.resident_id,
  ae.care_home_id,
  COUNT(*) as total_activities,
  COUNT(CASE WHEN ae.status = 'active' THEN 1 END) as active_activities,
  MAX(ae.enrollment_date) as last_enrollment_date
FROM activities.activity_enrollments ae
GROUP BY ae.resident_id, ae.care_home_id;

-- View: Monthly Expense Summary
CREATE OR REPLACE VIEW activities.v_monthly_expenses AS
SELECT 
  care_home_id,
  DATE_TRUNC('month', expense_date)::DATE as month,
  expense_category,
  approval_status,
  COUNT(*) as expense_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM activities.activity_expenses
GROUP BY care_home_id, DATE_TRUNC('month', expense_date), expense_category, approval_status;

-- View: Activity Attendance Rate
CREATE OR REPLACE VIEW activities.v_session_attendance_rate AS
SELECT 
  s.id,
  s.activity_id,
  a.name as activity_name,
  s.session_date,
  COUNT(DISTINCT ae.resident_id) as expected_residents,
  COUNT(DISTINCT CASE WHEN aa.attendance_status = 'attended' THEN aa.resident_id END) as attended_residents,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN aa.attendance_status = 'attended' THEN aa.resident_id END) 
        / NULLIF(COUNT(DISTINCT ae.resident_id), 0), 2) as attendance_rate_percent
FROM activities.activity_sessions s
LEFT JOIN activities.activities a ON s.activity_id = a.id
LEFT JOIN activities.activity_enrollments ae ON a.id = ae.activity_id AND ae.status = 'active'
LEFT JOIN activities.activity_attendees aa ON s.id = aa.session_id AND ae.resident_id = aa.resident_id
GROUP BY s.id, a.name, s.session_date;
```

**Click "Run"** - Views will be created for easy reporting.

---

## Step 6: Add Sample Data (Optional)

If you want to test the app with sample data:

```sql
-- =====================================================
-- SAMPLE DATA - For Testing Only
-- =====================================================

-- Get a care home ID (adjust if needed)
-- You can find this in public.care_homes table

-- Replace 'YOUR_CARE_HOME_UUID' with actual UUID from care_homes table

-- Insert sample activity categories
INSERT INTO activities.activity_categories (care_home_id, name, description, color_code)
VALUES 
  ('YOUR_CARE_HOME_UUID', 'Arts & Crafts', 'Creative activities', '#8B5CF6'),
  ('YOUR_CARE_HOME_UUID', 'Physical Exercise', 'Fitness and movement', '#10B981'),
  ('YOUR_CARE_HOME_UUID', 'Social Events', 'Group gatherings', '#F59E0B'),
  ('YOUR_CARE_HOME_UUID', 'Educational', 'Learning activities', '#3B82F6');

-- Insert sample activities
INSERT INTO activities.activities (care_home_id, category_id, name, description, duration_minutes, max_participants)
VALUES 
  ('YOUR_CARE_HOME_UUID', 
   (SELECT id FROM activities.activity_categories WHERE name = 'Arts & Crafts' LIMIT 1),
   'Painting Class',
   'Painting and watercolor activities',
   90,
   10
  );

-- Insert sample sessions
INSERT INTO activities.activity_sessions (care_home_id, activity_id, session_date, start_time, end_time, location, status)
VALUES 
  ('YOUR_CARE_HOME_UUID',
   (SELECT id FROM activities.activities WHERE name = 'Painting Class' LIMIT 1),
   CURRENT_DATE + INTERVAL '1 day',
   '14:00',
   '15:30',
   'Art Room',
   'scheduled'
  );
```

**Note:** Replace `YOUR_CARE_HOME_UUID` with an actual UUID from your `public.care_homes` table.

---

## Step 7: Verify the Setup

Run these queries to verify everything was created correctly:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'activities'
ORDER BY table_name;

-- Check row count in tables
SELECT 
  'activity_categories' as table_name, COUNT(*) as row_count FROM activities.activity_categories
UNION ALL
SELECT 'activities', COUNT(*) FROM activities.activities
UNION ALL
SELECT 'activity_sessions', COUNT(*) FROM activities.activity_sessions
UNION ALL
SELECT 'activity_enrollments', COUNT(*) FROM activities.activity_enrollments
UNION ALL
SELECT 'activity_attendees', COUNT(*) FROM activities.activity_attendees
UNION ALL
SELECT 'activity_expenses', COUNT(*) FROM activities.activity_expenses;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'activities'
ORDER BY tablename, policyname;
```

**Expected Result**: All tables should be listed, and all policies should show as `permissive`.

---

## Step 8: Test with ActivityPlanner App

Once the database is set up:

1. **Start ActivityPlanner**:
```bash
cd "c:\Users\CCH\Desktop\Food Calendar V1\ActivityPlanner"
npm run dev
```

2. **Login** with your Supabase credentials

3. **Test Each Page**:
   - Navigate to `/activities` - Should load (empty or with sample data)
   - Navigate to `/sessions` - Should load
   - Navigate to `/enrollments` - Should load
   - Navigate to `/expenses` - Should load with summary cards

4. **Check Browser Console** for any errors (F12 → Console tab)

---

## Database Schema Diagram

```
┌─────────────────────────────────────────────────────┐
│                  ACTIVITIES SCHEMA                  │
└─────────────────────────────────────────────────────┘

activity_categories
├── id (UUID)
├── care_home_id (FK: care_homes)
├── name
└── color_code

activities (Main)
├── id (UUID)
├── care_home_id (FK: care_homes)
├── category_id (FK: activity_categories)
├── name
├── description
└── duration_minutes

activity_schedules
├── id (UUID)
├── activity_id (FK: activities)
├── day_of_week
├── start_time
└── is_recurring

activity_sessions
├── id (UUID)
├── activity_id (FK: activities)
├── session_date
├── start_time
├── end_time
└── status

activity_enrollments
├── id (UUID)
├── activity_id (FK: activities)
├── resident_id (FK: residents)
├── status
└── enrollment_date

activity_attendees
├── id (UUID)
├── session_id (FK: activity_sessions)
├── resident_id (FK: residents)
└── attendance_status

activity_feedback
├── id (UUID)
├── session_id (FK: activity_sessions)
├── resident_id (FK: residents)
├── engagement_level
└── enjoyment_rating

activity_resources
├── id (UUID)
├── activity_id (FK: activities)
├── resource_name
├── quantity_needed
└── cost_per_unit

activity_expenses
├── id (UUID)
├── activity_id (FK: activities)
├── session_id (FK: activity_sessions)
├── amount
├── approval_status
└── expense_date
```

---

## Troubleshooting

### Error: "Schema does not exist"
- Make sure you ran Step 2 first (CREATE SCHEMA)
- Try: `SELECT * FROM information_schema.schemata WHERE schema_name = 'activities';`

### Error: "Function get_user_care_home_id() does not exist"
- Run Step 4 completely (all RLS policies)
- Make sure public.user_profiles table exists

### Error: "Table does not exist"
- Verify by running the verification queries in Step 7
- Ensure you ran the complete table creation script in Step 3

### Expenses not showing in app
- Verify care_home_id in your data matches user's care_home_id
- Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'activity_expenses';`

### Slow queries
- Check indexes were created: `SELECT * FROM pg_indexes WHERE schemaname = 'activities';`
- Run: `ANALYZE activities.activities;` to update query planner

---

## Quick Reference: SQL Commands by Purpose

### Find a Care Home ID
```sql
SELECT id, name FROM public.care_homes LIMIT 5;
```

### View All Residents
```sql
SELECT id, full_name, care_home_id FROM public.residents LIMIT 10;
```

### Get All Activities for a Care Home
```sql
SELECT * FROM activities.activities 
WHERE care_home_id = 'YOUR_CARE_HOME_UUID';
```

### Get Today's Sessions
```sql
SELECT * FROM activities.v_todays_sessions;
```

### Get Monthly Expenses
```sql
SELECT * FROM activities.v_monthly_expenses 
WHERE care_home_id = 'YOUR_CARE_HOME_UUID';
```

### Get Attendance Rate for a Session
```sql
SELECT * FROM activities.v_session_attendance_rate 
WHERE session_date >= CURRENT_DATE - INTERVAL '30 days';
```

### Approve Pending Expenses
```sql
UPDATE activities.activity_expenses
SET approval_status = 'approved',
    approved_by = auth.uid(),
    approval_date = now()
WHERE approval_status = 'pending'
AND care_home_id = 'YOUR_CARE_HOME_UUID'
AND amount < 100;
```

---

## What's Next?

1. ✅ **Database Created** - Tables, indexes, RLS policies in place
2. ✅ **Sample Data Ready** - Optional test data available
3. ⏳ **App Ready** - ActivityPlanner can now query the database
4. ⏳ **Features Development** - Customize pages to match your workflows
5. ⏳ **Production Deployment** - Backup, monitor, optimize

---

## Important Notes

- **Backup**: The Supabase project (tvyumorjdalhirarzzku) is SHARED with MealManager. Be careful with changes.
- **Schema Isolation**: The `activities` schema is separate from `meals` schema - no conflicts
- **RLS Security**: All queries are automatically filtered to user's care home
- **Shared Tables**: `care_homes`, `residents`, `user_profiles`, `auth.users` are shared with MealManager
- **Testing**: Use different care home IDs if you want to test multi-tenancy

---

**Setup Status**: Complete  
**Database**: tvyumorjdalhirarzzku (Supabase)  
**Schema**: activities (9 tables, RLS policies, views)  
**Date**: 21 January 2026
