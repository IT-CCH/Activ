# Database Setup - Quick Execution Checklist

## Timeline: ~15-20 minutes

Use this checklist to follow the DATABASE_SETUP_COMPLETE.md step-by-step.

---

## ✅ Pre-Setup (2 minutes)

- [ ] Open browser and go to: https://app.supabase.com
- [ ] Login to your Supabase account
- [ ] Select project: **tvyumorjdalhirarzzku**
- [ ] Click **SQL Editor** in left sidebar
- [ ] Click **New Query** button

---

## ✅ Step 1: Create Schema (1 minute)

**In SQL Editor - New Query:**

```sql
CREATE SCHEMA IF NOT EXISTS activities;
GRANT USAGE ON SCHEMA activities TO authenticated;
GRANT CREATE ON SCHEMA activities TO authenticated;
ALTER ROLE authenticated SET search_path = public, activities;
```

- [ ] Paste the SQL above
- [ ] Click **Run**
- [ ] Verify: "Success. No rows returned."

---

## ✅ Step 2: Create All Tables (3 minutes)

**New Query:**

Copy the entire SQL script from **DATABASE_SETUP_COMPLETE.md** - Section "Step 3: Create All Tables"

This script creates:
- activity_categories
- activities
- activity_sessions
- activity_enrollments
- activity_attendees
- activity_feedback
- activity_resources
- activity_expenses
- activity_schedules
- activity_audit_log

- [ ] Paste all 9 tables SQL
- [ ] Click **Run**
- [ ] Verify: Multiple "Success" messages (one per table)

---

## ✅ Step 3: Create RLS Policies (3 minutes)

**New Query:**

Copy the entire RLS script from **DATABASE_SETUP_COMPLETE.md** - Section "Step 4: Create Row Level Security"

This creates:
- Security function: get_user_care_home_id()
- 27 RLS policies (for access control)
- Enables RLS on all tables

- [ ] Paste all RLS policies SQL
- [ ] Click **Run**
- [ ] Verify: Multiple "Success" messages

---

## ✅ Step 4: Create Views (2 minutes)

**New Query:**

Copy the views script from **DATABASE_SETUP_COMPLETE.md** - Section "Step 5: Create Helpful Views"

This creates helpful views for:
- Today's sessions
- Resident enrollments
- Monthly expenses
- Session attendance rates

- [ ] Paste views SQL
- [ ] Click **Run**
- [ ] Verify: "Success" messages for each view

---

## ✅ Step 5: Verify Setup (2 minutes)

**New Query:**

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'activities'
ORDER BY table_name;
```

- [ ] Paste verification SQL
- [ ] Click **Run**
- [ ] You should see **10 tables**:
  - activity_attendees
  - activity_audit_log
  - activity_categories
  - activity_enrollments
  - activity_expenses
  - activity_feedback
  - activity_resources
  - activity_schedules
  - activity_sessions
  - activities

---

## ✅ Step 6: Add Sample Data (Optional - 2 minutes)

**Get your Care Home UUID first:**

```sql
SELECT id, name FROM public.care_homes LIMIT 1;
```

- [ ] Run this query
- [ ] Copy the UUID from the result
- [ ] Paste it into the sample data script

**Then run sample data:**

From **DATABASE_SETUP_COMPLETE.md** - Section "Step 6: Add Sample Data"

Replace `YOUR_CARE_HOME_UUID` with the actual UUID

- [ ] Paste sample data SQL
- [ ] Replace UUID
- [ ] Click **Run**

---

## ✅ Step 7: Test the App (5 minutes)

**Start ActivityPlanner:**

```powershell
cd "c:\Users\CCH\Desktop\Food Calendar V1\ActivityPlanner"
npm run dev
```

- [ ] Terminal shows: "Local: http://localhost:4029"
- [ ] Open browser: http://localhost:4029
- [ ] Click **Login**
- [ ] Use your Supabase user credentials
- [ ] You should see the dashboard

**Test Each Page:**

- [ ] Click **Activities** - should load
- [ ] Click **Sessions** - should load
- [ ] Click **Enrollments** - should load
- [ ] Click **Expenses** - should load with summary cards

**Check for Errors:**

- [ ] Press **F12** to open Developer Tools
- [ ] Go to **Console** tab
- [ ] Should see **no red error messages**

---

## ✅ Troubleshooting Quick Guide

### If you see "error" in console:
1. Check that all SQL scripts ran successfully (green checkmarks)
2. Verify care_home_id matches in your test data
3. Check RLS is enabled: `SELECT * FROM pg_policies WHERE schemaname = 'activities' LIMIT 1;`

### If pages show "No data":
- This is normal! Database is empty until you add data
- Run the sample data script in Step 6
- Or manually add activities in Supabase

### If you get "connection refused":
- Restart: `npm run dev`
- Check `.env` file has correct Supabase URL and API key

---

## ✅ Final Checklist

- [ ] Schema created
- [ ] All 9 tables created
- [ ] RLS policies applied
- [ ] Views created
- [ ] Verification queries passed
- [ ] Sample data added (optional)
- [ ] App starts on port 4029
- [ ] Login successful
- [ ] Pages load without errors
- [ ] Console shows no red errors

---

## What You Now Have

✅ Complete database infrastructure  
✅ Security via Row Level Security (RLS)  
✅ 9 tables for activities management  
✅ Helpful views for reporting  
✅ Audit logging capability  
✅ Sample data for testing  

---

## Next Steps

1. **Create Activities** - Go to Activities page, click "New Activity"
2. **Schedule Sessions** - Add dates/times for activities
3. **Enroll Residents** - Assign residents to activities
4. **Track Attendance** - Record who attended each session
5. **Log Expenses** - Record costs and request approvals

---

**Status**: Ready to execute  
**Time Required**: 15-20 minutes  
**Database**: tvyumorjdalhirarzzku  
**Schema**: activities (9 tables)
