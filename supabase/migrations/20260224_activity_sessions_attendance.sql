-- Add attendance/engagement tracking columns to activity_sessions
-- Run this in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────
-- 1. Add columns to underlying table
-- ─────────────────────────────────────────────────────────────
ALTER TABLE activities.activity_sessions
  ADD COLUMN IF NOT EXISTS participants_engaged    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS participants_not_engaged integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at            timestamp with time zone;

-- ─────────────────────────────────────────────────────────────
-- 2. Recreate the public view (SELECT * picks up new columns)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.activity_sessions AS
SELECT * FROM activities.activity_sessions;

-- ─────────────────────────────────────────────────────────────
-- 3. Update INSTEAD OF INSERT trigger to include new columns
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activity_sessions_instead_of_insert()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row activities.activity_sessions%ROWTYPE;
BEGIN
  INSERT INTO activities.activity_sessions (
    care_home_id,
    activity_id,
    schedule_id,
    session_date,
    start_time,
    end_time,
    location,
    facilitator_id,
    status,
    notes,
    actual_duration_minutes,
    participants_engaged,
    participants_not_engaged,
    completed_at
  ) VALUES (
    NEW.care_home_id,
    NEW.activity_id,
    NEW.schedule_id,
    NEW.session_date,
    NEW.start_time,
    NEW.end_time,
    NEW.location,
    NEW.facilitator_id,
    NEW.status,
    NEW.notes,
    NEW.actual_duration_minutes,
    COALESCE(NEW.participants_engaged, 0),
    COALESCE(NEW.participants_not_engaged, 0),
    NEW.completed_at
  )
  RETURNING * INTO inserted_row;

  NEW.id         := inserted_row.id;
  NEW.created_at := inserted_row.created_at;
  NEW.updated_at := inserted_row.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 4. Update INSTEAD OF UPDATE trigger to include new columns
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activity_sessions_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_sessions SET
    care_home_id              = NEW.care_home_id,
    activity_id               = NEW.activity_id,
    schedule_id               = NEW.schedule_id,
    session_date              = NEW.session_date,
    start_time                = NEW.start_time,
    end_time                  = NEW.end_time,
    location                  = NEW.location,
    facilitator_id            = NEW.facilitator_id,
    status                    = NEW.status,
    notes                     = NEW.notes,
    actual_duration_minutes   = NEW.actual_duration_minutes,
    participants_engaged       = NEW.participants_engaged,
    participants_not_engaged   = NEW.participants_not_engaged,
    completed_at              = NEW.completed_at,
    updated_at                = now()
  WHERE id = OLD.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 5. Re-attach triggers (no-op if already attached correctly)
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS activity_sessions_insert_trigger ON public.activity_sessions;
DROP TRIGGER IF EXISTS activity_sessions_update_trigger ON public.activity_sessions;
DROP TRIGGER IF EXISTS activity_sessions_delete_trigger ON public.activity_sessions;

CREATE TRIGGER activity_sessions_insert_trigger
  INSTEAD OF INSERT ON public.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.activity_sessions_instead_of_insert();

CREATE TRIGGER activity_sessions_update_trigger
  INSTEAD OF UPDATE ON public.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.activity_sessions_instead_of_update();

CREATE TRIGGER activity_sessions_delete_trigger
  INSTEAD OF DELETE ON public.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION public.activity_sessions_instead_of_delete();

-- ─────────────────────────────────────────────────────────────
-- 6. Grants (re-assert)
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_sessions TO authenticated;
GRANT SELECT ON public.activity_sessions TO anon;

-- Ensure row level security is enabled (table-level)
ALTER TABLE activities.activity_sessions ENABLE ROW LEVEL SECURITY;

-- Allow managers and super_admin roles to delete sessions
CREATE POLICY "Managers can delete sessions" ON activities.activity_sessions
  FOR DELETE
  USING (
    (SELECT user_profiles.role
     FROM user_profiles
     WHERE user_profiles.id = auth.uid()
    ) = ANY (ARRAY['super_admin'::text, 'super_manager'::text, 'manager'::text])
  );
