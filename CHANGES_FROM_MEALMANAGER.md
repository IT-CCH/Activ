# ActivityPlanner - Changes from MealManager Template

## Summary
ActivityPlanner was created as a new standalone application sharing MealManager's Supabase database infrastructure while maintaining separate, independently deployable codebases.

---

## 1. Configuration Changes

### package.json
```diff
- "name": "carehome-food-analytics"
+ "name": "activity-planner"
```

### .env (New File)
```
VITE_SUPABASE_URL=https://tvyumorjdalhirarzzku.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_NAME=Activity Planner
VITE_APP_PORT=4029
```

### Port Assignment
- **MealManager**: 5173 (Vite default)
- **ActivityPlanner**: 4029 (custom)

---

## 2. Header/Navigation Changes

### File: `src/components/navigation/Header.jsx`

#### Logo Updates
```diff
- <span className="header-logo-text">Meal Manager</span>
+ <span className="header-logo-text">Activity Planner</span>

- <Icon name="UtensilsCrossed" size={20} color="white" />
+ <Icon name="Activity" size={20} color="white" />

- <div className="header-logo-icon bg-gradient-to-br from-blue-500 to-emerald-500 ...">
+ <div className="header-logo-icon bg-gradient-to-br from-purple-500 to-pink-500 ...">

- from-blue-600 to-emerald-600
+ from-purple-600 to-pink-600
```

#### Navigation Menu - Regular Users
```diff
- { label: 'Dashboard', path: '/main-dashboard', ... }
+ { label: 'Dashboard', path: '/dashboard', ... }

- { label: 'Calendar', path: '/food-calendar-view', ... }
- { label: 'Delivery Status', path: '/delivery-status', ... }
- { label: 'Meals', path: '/meals-management', ... }
- { label: 'Analytics', path: '/cost-analytics', ... }
- { label: 'Audit Logs', path: '/audit-logs', ... }

+ { label: 'Activities', path: '/activities', ... }
+ { label: 'Sessions', path: '/sessions', ... }
+ { label: 'Enrollments', path: '/enrollments', ... }
+ { label: 'Expenses', path: '/expenses', ... }
```

#### Navigation Menu - Staff
```diff
- { label: 'Calendar', path: '/food-calendar-view', ... }
- { label: 'Delivery Status', path: '/delivery-status', ... }
- { label: 'Meals', path: '/meals-management', ... }
- { label: 'Analytics', path: '/cost-analytics', ... }
- { label: 'Audit Logs', path: '/audit-logs', ... }

+ { label: 'Activities', path: '/activities', ... }
+ { label: 'Sessions', path: '/sessions', ... }
+ { label: 'Expenses', path: '/expenses', ... }
```

#### Link Changes
```diff
- <Link to="/main-dashboard" className="header-logo">
+ <Link to="/dashboard" className="header-logo">
```

---

## 3. Routes Changes

### File: `src/Routes.jsx`

#### Removed Imports (Meal-specific)
```diff
- import CostAnalytics from './pages/cost-analytics';
- import CostBreakdownPage from './pages/cost-analytics/CostBreakdownPage';
- import MealDetailView from './pages/meal-detail-view';
- import ComplianceReporting from './pages/compliance-reporting';
- import FoodCalendarView from './pages/food-calendar-view';
- import MealsManagement from './pages/meals-management';
- import DeliveryStatusPage from './pages/delivery-status';
- import AuditLogsPage from './pages/audit-logs';
```

#### Added Imports (Activity-specific)
```diff
+ import Activities from './pages/activities/Activities';
+ import Sessions from './pages/sessions/Sessions';
+ import Enrollments from './pages/enrollments/Enrollments';
+ import Expenses from './pages/expenses/Expenses';
```

#### Removed Routes
```diff
- <Route path="/main-dashboard" element={...} />
- <Route path="/cost-analytics" element={...} />
- <Route path="/cost-analytics/breakdown" element={...} />
- <Route path="/meal-detail-view" element={...} />
- <Route path="/compliance-reporting" element={...} />
- <Route path="/food-calendar-view" element={...} />
- <Route path="/meals-management" element={...} />
- <Route path="/delivery-status" element={...} />
- <Route path="/audit-logs" element={...} />
```

#### Added Routes
```diff
+ <Route path="/" element={<Navigate to="/dashboard" replace />} />
+ <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
+ <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
+ <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
+ <Route path="/enrollments" element={<ProtectedRoute><Enrollments /></ProtectedRoute>} />
+ <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
```

---

## 4. New Pages Created

### 📄 `src/pages/activities/Activities.jsx`
**Purpose**: List and manage all activities

**Features**:
- Fetch activities from Supabase
- Grid layout of activity cards
- Filter by status
- "New Activity" button
- Click to view details
- Loading and error states

**Database Table**: `activities.activities`

---

### 📄 `src/pages/sessions/Sessions.jsx`
**Purpose**: View and schedule activity sessions

**Features**:
- Table of all sessions
- Session date, time, duration
- Link to parent activity
- Sortable columns
- Empty state messaging

**Database Table**: `activities.activity_sessions`

---

### 📄 `src/pages/enrollments/Enrollments.jsx`
**Purpose**: Manage resident activity enrollments

**Features**:
- Table of enrollments
- Resident name
- Activity name
- Enrollment status (active/inactive)
- Enrollment date
- Role-based filtering

**Database Table**: `activities.activity_enrollments`

---

### 📄 `src/pages/expenses/Expenses.jsx`
**Purpose**: Track and approve activity expenses

**Features**:
- Summary cards (Total, Count, Average)
- Detailed expense table
- Amount formatting (£)
- Approval status (approved/pending/rejected)
- Expense date
- Activity reference
- Real-time calculations

**Database Table**: `activities.activity_expenses`

---

## 5. Unchanged/Reused Components

### ✅ Fully Compatible
- **Authentication System** - Shared Supabase user_profiles
- **ProtectedRoute** - Role-based access control
- **ErrorBoundary** - Error handling
- **ScrollToTop** - Scroll behavior
- **AuthProvider** - Auth context
- **Admin Pages** - User/care home/resident management
- **Staff Pages** - Staff dashboard and residents view
- **UI Components** - All cards, modals, forms from MealManager
- **Icons** - Lucide React (same icon set)
- **Styling** - Tailwind CSS (same configuration)
- **State Management** - Redux Toolkit (same setup)

### Reused Without Changes
- `App.jsx` - Same auth wrapper
- `Login.jsx` - Same login flow
- `ResetPassword.jsx` - Same password reset
- `Help.jsx` - Help page
- `NotFound.jsx` - 404 page
- `main-dashboard/` - Used as activity dashboard
- `admin/` folder - All admin pages
- `staff/` folder - All staff pages
- All utilities and services

---

## 6. Database Schema (Separate)

### New Schema: `activities`
**Owner**: Activities App only (MealManager cannot access)

**Tables**:
1. `activity_categories` - Activity types
2. `activities` - Activity definitions
3. `activity_sessions` - Scheduled sessions
4. `activity_enrollments` - Resident enrollments
5. `activity_attendees` - Session attendance
6. `activity_feedback` - Feedback/ratings
7. `activity_resources` - Equipment/supplies
8. `activity_expenses` - Cost tracking
9. `activity_schedules` - Recurring schedules

### Shared Tables
- `public.care_homes` - Care home info
- `public.residents` - Resident info
- `auth.users` - Authentication
- `public.user_profiles` - User profiles

### Schema Access
```sql
-- MealManager CAN see:
- public schema
- meals schema
- Shared tables

-- ActivityPlanner CAN see:
- public schema
- activities schema
- Shared tables

-- MealManager CANNOT see:
- activities schema

-- ActivityPlanner CANNOT see:
- meals schema
```

---

## 7. Authentication & Roles

### Shared User Accounts
Both apps use the same Supabase authentication:
- Same email/password login
- Same user_profiles table
- Same role system (Super Admin, Org Admin, Manager, Staff)

### Role-Based Access
All routes protected by same ProtectedRoute component:
- Super Admin - All features
- Org Admin - Org-level management
- Manager - Activity management
- Staff - Limited activity access

---

## 8. Port Assignment

### Development Ports
```
Port 5173 → MealManager (Vite default)
Port 4029 → ActivityPlanner (configured)
Port 3000 → Available for other apps
Port 4030 → Available if 4029 used
```

### Running Both Simultaneously
```bash
# Terminal 1 - MealManager
cd MealManager
npm run dev
# App at http://localhost:5173

# Terminal 2 - ActivityPlanner
cd ActivityPlanner
npm run dev
# App at http://localhost:4029
```

---

## 9. Git Configuration

### .gitignore
Same as MealManager:
```
node_modules/
.env
.env.local
dist/
build/
```

### Branch Strategy
Separate git repositories recommended:
- `MealManager-repo` (existing)
- `ActivityPlanner-repo` (new)

Or in monorepo structure:
```
workspace/
├── MealManager/
├── ActivityPlanner/
└── shared-docs/
```

---

## 10. Deployment Considerations

### Build Commands
Same for both apps:
```bash
npm run build  # Creates dist/ folder
npm run dev    # Development mode
npm run type-check  # TypeScript check
```

### Environment Deployment
Both need `.env` with:
```
VITE_SUPABASE_URL (same value)
VITE_SUPABASE_ANON_KEY (same value)
VITE_APP_PORT (different per app)
VITE_APP_NAME (different per app)
```

### Database Migrations
- Meals table changes affect MealManager only
- Activities table changes affect ActivityPlanner only
- Shared table changes affect both

---

## 11. Testing Differences

### Test the Activities Flow
```bash
1. Start app: npm run dev
2. Login with shared credentials
3. Navigate to /dashboard
4. Try each route: /activities, /sessions, /enrollments, /expenses
5. Check Supabase for data (must create schema first)
```

### Verify Shared Auth
```bash
1. Login to ActivityPlanner
2. Session stored in localStorage
3. Visit MealManager (different port)
4. Should see user is logged in (shared auth)
5. Each app shows different data (separate schemas)
```

---

## Summary of Changes

| Aspect | MealManager | ActivityPlanner |
|--------|-------------|-----------------|
| **Name** | Meal Manager | Activity Planner |
| **Port** | 5173 | 4029 |
| **Logo Icon** | UtensilsCrossed | Activity |
| **Colors** | Blue/Emerald | Purple/Pink |
| **Main Routes** | Dashboard, Meals, Calendar, Delivery, Analytics | Dashboard, Activities, Sessions, Enrollments, Expenses |
| **Schema** | public, meals | public, activities |
| **Database** | Shared (tvyumorjdalhirarzzku) | Shared (tvyumorjdalhirarzzku) |
| **Auth** | Shared | Shared |
| **Framework** | React 18.2, Vite, Tailwind | React 18.2, Vite, Tailwind |

---

## Migration Notes

If switching from MealManager to ActivityPlanner:
1. Both apps authenticate to same Supabase
2. User data (meals) stays in meals schema
3. User data (activities) goes in activities schema
4. No conflict - schemas are separate
5. Can run both simultaneously

---

**Created**: 21 January 2026  
**Based on**: MealManager template  
**Status**: Ready for development  
**Database**: Schema creation script available
