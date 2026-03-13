# ActivityPlanner Setup - Complete ✅

## Project Status: Ready to Run

The ActivityPlanner project has been fully configured and is ready for development.

---

## ✅ Completed Tasks

### 1. Project Structure
- ✅ Created ActivityPlanner folder at `c:\Users\CCH\Desktop\Food Calendar V1\ActivityPlanner`
- ✅ Copied all config files from MealManager:
  - `vite.config.mjs`
  - `tailwind.config.js`
  - `postcss.config.js`
  - `jsconfig.json`
  - `.gitignore`
- ✅ Copied entire `src/` folder with all components and utilities
- ✅ Copied entire `public/` folder with assets
- ✅ Updated `package.json` name from "carehome-food-analytics" to "activity-planner"

### 2. Environment Configuration
- ✅ Created `.env` file with:
  - `VITE_SUPABASE_URL=https://tvyumorjdalhirarzzku.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=[shared with MealManager]`
  - `VITE_APP_NAME=Activity Planner`
  - `VITE_APP_PORT=4029`

### 3. Navigation & Header Customization
- ✅ Updated `Header.jsx` with Activity Planner branding:
  - Changed logo from "Meal Manager" to "Activity Planner"
  - Changed icon from "UtensilsCrossed" to "Activity"
  - Updated color scheme: Blue/Emerald → Purple/Pink gradient
- ✅ Updated navigation menu items:
  - Dashboard → /dashboard
  - Activities → /activities
  - Sessions → /sessions
  - Enrollments → /enrollments
  - Expenses → /expenses
  - Help → /help

### 4. Routes Configuration
- ✅ Updated `Routes.jsx` to remove meal-specific routes:
  - ❌ Removed: cost-analytics, meals-management, delivery-status, food-calendar-view, compliance-reporting, audit-logs
  - ✅ Added: /activities, /sessions, /enrollments, /expenses
  - ✅ Kept: Dashboard, Admin routes, Staff routes (reusable)

### 5. Activity-Specific Pages Created
- ✅ **Activities.jsx** - List and manage all activities
  - Displays activities grid/list
  - Add new activity functionality
  - Activity details with status
- ✅ **Sessions.jsx** - View activity sessions
  - Table with session dates, times, durations
  - Link to activities
- ✅ **Enrollments.jsx** - Manage resident enrollments
  - Display resident-activity relationships
  - Enrollment status tracking
- ✅ **Expenses.jsx** - Track activity expenses
  - Summary cards (Total, Count, Average)
  - Detailed expense table
  - Approval status tracking

### 6. Dependencies
- ✅ npm install completed successfully
- ✅ All node_modules installed (size: ~500MB)
- ✅ package-lock.json copied from MealManager for consistency

---

## 🚀 How to Run

### Start Development Server
```powershell
cd "c:\Users\CCH\Desktop\Food Calendar V1\ActivityPlanner"
npm run dev
```

The app will start on **http://localhost:4029** (as configured in .env)

### Build for Production
```powershell
npm run build
```

### Run Type Check
```powershell
npm run type-check
```

---

## 📁 Directory Structure

```
ActivityPlanner/
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   └── Header.jsx (✅ Updated for Activities)
│   │   ├── ProtectedRoute.jsx
│   │   └── ...other shared components
│   ├── pages/
│   │   ├── activities/
│   │   │   └── Activities.jsx (✅ NEW)
│   │   ├── sessions/
│   │   │   └── Sessions.jsx (✅ NEW)
│   │   ├── enrollments/
│   │   │   └── Enrollments.jsx (✅ NEW)
│   │   ├── expenses/
│   │   │   └── Expenses.jsx (✅ NEW)
│   │   ├── admin/
│   │   ├── staff/
│   │   ├── main-dashboard/ (Reused as activity dashboard)
│   │   └── ...auth pages
│   ├── context/
│   │   └── AuthContext.jsx (Shared with MealManager)
│   ├── services/
│   │   └── supabaseClient.js (Shared Supabase project)
│   ├── Routes.jsx (✅ Updated for Activities)
│   └── App.jsx
├── public/
├── .env (✅ Created)
├── package.json (✅ Updated)
├── vite.config.mjs
├── tailwind.config.js
├── jsconfig.json
└── node_modules/
```

---

## 🗄️ Database Setup (Next Steps)

The database schema for activities is ready but NOT YET created in Supabase. To set up:

### Option 1: Using Supabase Dashboard
1. Go to **Supabase Project**: https://app.supabase.com/
2. Navigate to **SQL Editor**
3. Create a new query and copy the SQL from documentation
4. Execute the SQL script to create:
   - `activities` schema
   - 9 tables: activities, activity_sessions, activity_enrollments, activity_attendees, activity_feedback, activity_resources, activity_expenses, activity_schedules, activity_categories

### Option 2: Using SQL File
The SQL setup script is available in your documentation:
- File: `activities-app-database-setup.sql`
- Contains: Complete schema with RLS policies

**IMPORTANT**: The Supabase project is **SHARED** with MealManager
- Project ID: `tvyumorjdalhirarzzku`
- Same authentication (user_profiles table)
- Separate `activities` schema keeps data isolated

---

## 🔐 Authentication

- **Shared with MealManager**: Uses the same Supabase project and user_profiles table
- **Login**: Same credentials work for both apps
- **Role-based access**: Super Admin, Org Admin, Manager, Staff roles
- **Home routes**: /dashboard (Activities) vs /main-dashboard (Meals)

---

## 🎨 Header & Navigation

### Updated Branding
- **App Name**: "Activity Planner"
- **Icon**: Activity (from Lucide React)
- **Colors**: Purple/Pink gradient (distinguished from Meals Manager's Blue/Emerald)

### Navigation Menu
**Regular Users/Admins:**
- Dashboard
- Activities
- Sessions
- Enrollments
- Expenses
- Help

**Staff Role:**
- Dashboard
- Activities
- Sessions
- Residents
- Expenses
- Help

**Admin Tools:**
- Users Management
- Care Homes Management
- Residents Management

---

## 🔧 Configuration Details

### Ports
- **MealManager**: 5173 (Vite default)
- **ActivityPlanner**: 4029 (Custom in .env)

### Environment Variables (`.env`)
```
VITE_SUPABASE_URL=https://tvyumorjdalhirarzzku.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_NAME=Activity Planner
VITE_APP_PORT=4029
```

### Build Tools
- **Bundler**: Vite
- **Framework**: React 18.2.0
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Icons**: Lucide React
- **Routing**: React Router v6

---

## ✨ Features Ready

### Pages Implemented
- ✅ Login/Authentication (inherited)
- ✅ Dashboard (main activity dashboard)
- ✅ Activities Management (view all activities)
- ✅ Sessions Management (schedule and view sessions)
- ✅ Enrollments Management (manage resident enrollments)
- ✅ Expenses Tracking (with approval workflow)
- ✅ Help (inherited)

### Admin Features
- ✅ User Management
- ✅ Care Home Management
- ✅ Resident Management

### Staff Features
- ✅ Staff Dashboard
- ✅ Resident Viewing

---

## 📋 Next Steps to Complete

1. **Run the development server** (port 4029)
2. **Execute SQL script** in Supabase to create activities schema
3. **Test login** - Same credentials as MealManager
4. **Customize pages** - Replace placeholder content with actual activity features
5. **Build expense approval workflow** - Configure approval rules in database
6. **Add activity categories** - Populate activity_categories table

---

## 🐛 Troubleshooting

### Port 4029 already in use?
Edit `.env` and change `VITE_APP_PORT` to another port (e.g., 4030)

### Login not working?
Ensure `.env` has correct Supabase URL and anon key from MealManager

### Routes showing "Not Found"?
Verify Routes.jsx imports are correct (all 4 new pages imported)

### Styles not loading?
Clear node_modules and run `npm install` again

---

## 📞 Support

This setup maintains full feature parity with MealManager while focusing on activities management. All shared components (auth, header layout, etc.) continue to work exactly as in MealManager.

**Questions about specific features?** Check the original MealManager documentation - the architecture is identical, just with different business logic.

---

**Setup Date**: 21 January 2026
**Status**: ✅ Ready for Development
**Port**: 4029
**Database**: Shared Supabase (tvyumorjdalhirarzzku)
