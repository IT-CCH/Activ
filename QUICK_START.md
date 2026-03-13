# 🚀 ActivityPlanner Quick Start Guide

## Starting the App

```bash
# Navigate to ActivityPlanner folder
cd "c:\Users\CCH\Desktop\Food Calendar V1\ActivityPlanner"

# Start development server
npm run dev
```

**The app will start on:** `http://localhost:4029`

---

## Login Credentials

Use the **same credentials** as MealManager (shared Supabase):
- Email: Your registered email
- Password: Your password

**Note:** This is a SHARED database with MealManager. The same user accounts work for both apps.

---

## What's Available Now

### User Features
✅ **Dashboard** - Activity overview and quick stats  
✅ **Activities** - View and manage all activities  
✅ **Sessions** - Schedule and track activity sessions  
✅ **Enrollments** - Manage resident activity enrollments  
✅ **Expenses** - Track activity costs with approval workflow  
✅ **Help** - Help documentation  

### Admin Features
✅ **User Management** - Manage user accounts  
✅ **Care Home Management** - Manage care home facilities  
✅ **Resident Management** - Manage resident information  

---

## Database Setup (One-Time)

To enable full functionality, you need to create the activities schema in Supabase:

### Quick Setup
1. Open Supabase dashboard: https://app.supabase.com/projects
2. Select project: **tvyumorjdalhirarzzku** (Capital Care Homes)
3. Go to **SQL Editor** > **New Query**
4. Paste the SQL from `activities-app-database-setup.sql` (in documentation folder)
5. Click **Run**

This creates 9 tables for activities management with automatic row-level security.

---

## File Structure

```
src/
├── pages/
│   ├── activities/Activities.jsx         ← List all activities
│   ├── sessions/Sessions.jsx             ← Schedule sessions
│   ├── enrollments/Enrollments.jsx       ← Manage enrollments
│   ├── expenses/Expenses.jsx             ← Track expenses
│   ├── main-dashboard/                   ← Main dashboard
│   ├── admin/                            ← Admin pages
│   ├── staff/                            ← Staff pages
│   └── ...
├── components/
│   ├── navigation/Header.jsx             ← Updated for Activities
│   └── ...
├── Routes.jsx                            ← Updated routing
└── App.jsx
```

---

## Menu Navigation

### Header Logo
- **Name:** Activity Planner (Purple/Pink gradient)
- **Icon:** Activity (from Lucide React)
- **Click to:** Return to dashboard

### Main Navigation (Top Menu)
- **Dashboard** - `/dashboard`
- **Activities** - `/activities`
- **Sessions** - `/sessions`
- **Enrollments** - `/enrollments`
- **Expenses** - `/expenses`
- **Help** - `/help`

### Admin Tools (Dropdown)
- Users
- Care Homes
- Residents

### User Menu (Top Right)
- Display Name
- Change Password
- Logout

---

## Configuration

### .env File
```
VITE_SUPABASE_URL=https://tvyumorjdalhirarzzku.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_NAME=Activity Planner
VITE_APP_PORT=4029
```

**Do NOT commit .env to git** (already in .gitignore)

---

## Building for Production

```bash
# Create optimized build
npm run build

# Output: dist/ folder with minified files
```

---

## Troubleshooting

### App won't start?
```bash
# Clear cache and reinstall
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Port 4029 in use?
Edit `.env` and change `VITE_APP_PORT=4030` (use different port)

### Supabase connection error?
- Verify `.env` has correct URL and API key
- Check network connectivity
- Ensure Supabase project is active

### Pages showing empty?
- Database schema not created yet (run SQL script)
- Or no data in database tables yet

---

## Development Tips

### Hot Reload
Changes to `.jsx` files automatically refresh browser (Vite feature)

### Console Debugging
```javascript
// In any component
console.log('Debug message:', variable);
```

### Check Routes
Visit undefined routes to see the 404 page (NotFound.jsx)

### Supabase Real-time
All pages use Supabase client - data updates in real-time

---

## Next: Database Schema

The app framework is complete. To enable all features:

1. **Run the SQL script** in Supabase to create:
   - activities table
   - activity_sessions table
   - activity_enrollments table
   - activity_expenses table
   - (+ 4 more supporting tables)

2. **Add sample data** (optional):
   - Activities
   - Sessions
   - Residents
   - Expenses

3. **Test the pages**:
   - Activities page should show your data
   - Expenses page shows summary cards
   - Sessions show scheduled activities

---

## Need Help?

- **Supabase Issues**: Check project at app.supabase.com
- **Component Issues**: Look at MealManager for reference (same codebase structure)
- **Routing Issues**: Check Routes.jsx and browser console
- **Style Issues**: Check Tailwind CSS in tailwind.config.js

---

**Status**: ✅ Ready to run  
**Port**: 4029  
**Database**: Shared (tvyumorjdalhirarzzku)  
**Updated**: 21 January 2026
