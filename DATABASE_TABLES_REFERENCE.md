# Database Tables Reference - What Each Table Does

## Overview

The Activities schema has 9 core tables plus 1 audit table. Here's what each one stores and why you need it.

---

## 🎯 Core Tables (9)

### 1. **activity_categories**
**Purpose**: Organize activities into types/groups

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Unique identifier |
| care_home_id | UUID | Which care home |
| name | VARCHAR(100) | Category name (e.g., "Arts & Crafts") |
| description | TEXT | What this category includes |
| color_code | VARCHAR(7) | Color for UI (e.g., "#8B5CF6") |
| is_active | BOOLEAN | Still using this? |

**Example Data**:
```
Arts & Crafts | #8B5CF6 | Creative painting and drawing activities
Physical Exercise | #10B981 | Fitness and movement classes
Social Events | #F59E0B | Group gatherings and parties
Educational | #3B82F6 | Learning activities
Therapy | #EC4899 | Therapeutic activities
```

**Used by**: Activities page (dropdown), reports

---

### 2. **activities**
**Purpose**: Define each activity (what you'll do)

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Activity ID |
| care_home_id | UUID | Which care home |
| category_id | UUID | Which category (FK) |
| name | VARCHAR(150) | Activity name |
| description | TEXT | What it involves |
| objective | TEXT | Goals/outcomes |
| duration_minutes | INTEGER | How long (mins) |
| max_participants | INTEGER | Max people allowed |
| min_participants | INTEGER | Min people needed |
| status | VARCHAR(20) | active/inactive/archived |
| location | VARCHAR(200) | Where it happens |
| equipment_required | TEXT | What's needed |

**Example Data**:
```
Activity: Painting Class
Category: Arts & Crafts
Duration: 90 minutes
Max People: 10
Location: Art Room
Equipment: Paints, brushes, canvases
Status: active
```

**Used by**: Activities page (listing), Sessions (scheduling)

---

### 3. **activity_schedules**
**Purpose**: Define recurring schedule patterns

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Schedule ID |
| activity_id | UUID | Which activity |
| day_of_week | INTEGER | 0-6 (Sun-Sat) |
| start_time | TIME | When it starts |
| duration_minutes | INTEGER | How long |
| is_recurring | BOOLEAN | Happens every week? |
| start_date | DATE | First occurrence |
| end_date | DATE | Last occurrence |

**Example Data**:
```
Painting Class (activity)
Every Tuesday (day_of_week = 2)
Starts 14:00
Duration: 90 mins
Recurring: Yes
From: Jan 2026 → Dec 2026
```

**Used by**: Auto-generating sessions

---

### 4. **activity_sessions**
**Purpose**: Individual occurrences of activities (booked dates/times)

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Session ID |
| activity_id | UUID | Which activity |
| session_date | DATE | What date |
| start_time | TIME | Start time |
| end_time | TIME | End time |
| location | VARCHAR(200) | Where (may differ) |
| facilitator_id | UUID | Who's running it |
| status | VARCHAR(20) | scheduled/completed/cancelled |
| notes | TEXT | Special notes |
| actual_duration_minutes | INTEGER | How long it actually took |

**Example Data**:
```
Painting Class
Date: Tuesday, Jan 28, 2026
Time: 14:00 - 15:30
Location: Art Room
Facilitator: Sarah Smith
Status: scheduled
```

**Used by**: Sessions page, attendance tracking, Expenses

---

### 5. **activity_enrollments**
**Purpose**: Link residents to activities (who's enrolled)

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Enrollment ID |
| activity_id | UUID | Which activity |
| resident_id | UUID | Which resident |
| status | VARCHAR(20) | active/inactive/on_hold/completed |
| enrollment_date | DATE | When enrolled |
| discontinuation_date | DATE | When they stopped |
| reason_for_discontinuation | TEXT | Why they left |
| notes | TEXT | Special needs/preferences |

**Example Data**:
```
Resident: John Doe
Activity: Painting Class
Status: active
Enrolled: Jan 15, 2026
Notes: "Use large brushes, sensitive to strong smells"
```

**Used by**: Enrollments page, Attendance (who should attend)

---

### 6. **activity_attendees**
**Purpose**: Track who attended each session

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Attendance record ID |
| session_id | UUID | Which session |
| resident_id | UUID | Which resident |
| attendance_status | VARCHAR(20) | attended/absent/cancelled/not_scheduled |
| check_in_time | TIMESTAMP | When they arrived |
| check_out_time | TIMESTAMP | When they left |
| notes | TEXT | How they were/what happened |
| recorded_by | UUID | Who recorded this |

**Example Data**:
```
Session: Painting Class, Jan 28
Resident: John Doe
Status: attended
Check-in: 14:05
Check-out: 15:25
Notes: "Enjoyed it, created abstract painting"
Recorded by: Sarah Smith
```

**Used by**: Attendance tracking, Reports, Engagement metrics

---

### 7. **activity_feedback**
**Purpose**: Collect feedback about sessions

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Feedback ID |
| session_id | UUID | Which session |
| resident_id | UUID | About which resident |
| staff_member_id | UUID | Who provided feedback |
| engagement_level | INTEGER | 1-5 scale |
| enjoyment_rating | INTEGER | 1-5 scale |
| feedback_text | TEXT | Comments |
| behavioral_observations | TEXT | How they acted |
| recommendations | TEXT | Ideas for next time |

**Example Data**:
```
Session: Painting Class, Jan 28
Resident: John Doe
Engagement: 4/5
Enjoyment: 5/5
Feedback: "Really engaged, asked questions"
Observations: "More confident than last week"
Recommendations: "Try watercolors next time"
```

**Used by**: Reports, Quality assessment, Planning improvements

---

### 8. **activity_resources**
**Purpose**: Track equipment and supplies needed

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Resource ID |
| activity_id | UUID | For which activity |
| resource_name | VARCHAR(100) | What it is |
| resource_type | VARCHAR(50) | equipment/material/space/staff |
| quantity_needed | INTEGER | How many per session |
| quantity_available | INTEGER | Currently have |
| unit_of_measure | VARCHAR(20) | Pieces/liters/etc |
| reorder_level | INTEGER | Reorder when below this |
| cost_per_unit | DECIMAL(10,2) | Price each |

**Example Data**:
```
Activity: Painting Class
Resource: Canvas (20x25)
Type: material
Needed: 10 per session
Available: 15
Reorder at: 5
Cost: £3.50 each
```

**Used by**: Resource planning, Budgeting, Reorder tracking

---

### 9. **activity_expenses**
**Purpose**: Track and approve costs

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Expense ID |
| activity_id | UUID | Which activity |
| session_id | UUID | Which session (optional) |
| description | VARCHAR(200) | What was bought |
| expense_category | VARCHAR(50) | equipment/supplies/refreshments/transport |
| amount | DECIMAL(10,2) | How much |
| currency | VARCHAR(3) | GBP/EUR/USD |
| expense_date | DATE | When purchased |
| payment_method | VARCHAR(30) | cash/card/invoice/budget |
| approval_status | VARCHAR(20) | pending/approved/rejected/cancelled |
| submitted_by | UUID | Who submitted |
| approved_by | UUID | Who approved |
| approval_date | TIMESTAMP | When approved |
| notes | TEXT | Notes |

**Example Data**:
```
Activity: Painting Class
Description: 20x Acrylic Paint Sets
Category: supplies
Amount: £45.00
Date: Jan 25, 2026
Submitted by: Sarah Smith
Status: pending
```

**Used by**: Expenses page, Budget tracking, Approval workflows

---

## 📊 Audit/Logging Table

### 10. **activity_audit_log**
**Purpose**: Track all changes (who changed what, when)

**Fields**:
| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Log entry ID |
| table_name | VARCHAR(50) | Which table was changed |
| record_id | UUID | Which record |
| action | VARCHAR(20) | INSERT/UPDATE/DELETE |
| old_values | JSONB | Values before change |
| new_values | JSONB | Values after change |
| changed_by | UUID | Who made change |
| changed_at | TIMESTAMP | When changed |

**Example Data**:
```
Table: activity_expenses
Record: [expense_id]
Action: UPDATE
Changed: approval_status (pending → approved)
Changed by: Manager@email.com
Time: Jan 28, 2026 10:15 AM
```

**Used by**: Compliance, Debugging, Audit trails

---

## 🔗 Relationships Diagram

```
activity_categories
        ↓
    activities ← ← ← ← activity_schedules
        ↓
        ├→ activity_sessions
        │       ↓
        │   ├→ activity_attendees ← → residents
        │   ├→ activity_feedback ← → residents
        │   └→ activity_expenses
        │
        ├→ activity_enrollments ← → residents
        │
        └→ activity_resources

All linked to: care_homes (multi-tenancy)
All logged to: activity_audit_log
```

---

## 📋 Data Flow Example

**Scenario: Schedule and track a painting class**

1. **Create Activity** (activity_categories + activities)
   - Category: Arts & Crafts
   - Activity: Painting Class
   - Duration: 90 mins
   - Resources: paints, brushes, canvas

2. **Set Schedule** (activity_schedules)
   - Every Tuesday, 14:00
   - Recurring through 2026

3. **Generate Sessions** (activity_sessions)
   - Auto-create session for Tuesday, Jan 28
   - Staff assigned as facilitator

4. **Enroll Residents** (activity_enrollments)
   - Add 8 residents to the activity
   - Note any special needs

5. **Record Attendance** (activity_attendees)
   - On Jan 28: Check in 7 residents (1 called in sick)
   - Record how long they stayed

6. **Collect Feedback** (activity_feedback)
   - Staff fill out engagement/enjoyment ratings
   - Note observations

7. **Log Expenses** (activity_expenses)
   - Submit paint purchase receipt: £45
   - Canvas purchase receipt: £25
   - Mark for approval

8. **Approve Expenses** (activity_expenses - update)
   - Manager approves both: Total £70

9. **Check Resource Levels** (activity_resources)
   - Canvas count down from 25 to 20
   - Paint running low, reorder needed

10. **Generate Reports** (using views)
    - Attendance rate: 87.5% (7/8)
    - Average engagement: 4.2/5
    - Monthly cost: £70

---

## SQL Quick Reference: Insert Examples

### Insert a new activity
```sql
INSERT INTO activities.activities (
  care_home_id, category_id, name, description, duration_minutes
) VALUES (
  'care_home_uuid', 'category_uuid', 'Gardening Club', 'Outdoor gardening', 120
);
```

### Enroll a resident
```sql
INSERT INTO activities.activity_enrollments (
  activity_id, resident_id, enrollment_date, status
) VALUES (
  'activity_uuid', 'resident_uuid', CURRENT_DATE, 'active'
);
```

### Record attendance
```sql
INSERT INTO activities.activity_attendees (
  session_id, resident_id, attendance_status, recorded_by
) VALUES (
  'session_uuid', 'resident_uuid', 'attended', auth.uid()
);
```

### Log an expense
```sql
INSERT INTO activities.activity_expenses (
  activity_id, description, amount, expense_date, approval_status, submitted_by
) VALUES (
  'activity_uuid', 'Gardening tools', 65.00, CURRENT_DATE, 'pending', auth.uid()
);
```

---

## Why This Structure?

✅ **Normalized**: No duplicate data  
✅ **Scalable**: Can handle 1000s of activities  
✅ **Auditable**: Track all changes  
✅ **Secure**: Row Level Security (RLS) prevents cross-care-home access  
✅ **Relational**: Activities → Sessions → Attendance → Feedback → Expenses  
✅ **Flexible**: Recurring schedules or one-off sessions  
✅ **Complete**: Covers planning, execution, evaluation, costs  

---

**Total Tables**: 10 (9 core + 1 audit)  
**Total Fields**: ~120+  
**Primary Keys**: All UUID  
**Foreign Keys**: 15+  
**RLS Policies**: 27  
**Views**: 4 helpful reporting views
