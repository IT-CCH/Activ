-- Create a public schema view for activity_sessions (lives in activities schema)
-- This allows the Supabase JS client to access it without any custom schema config,
-- matching the same pattern used for public.activities, public.activity_categories etc.

-- ─────────────────────────────────────────────────────────────
-- 1. VIEW
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.activity_sessions AS
SELECT * FROM activities.activity_sessions;

-- ─────────────────────────────────────────────────────────────
-- 2. INSTEAD OF INSERT
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
    actual_duration_minutes
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
    NEW.actual_duration_minutes
  )
  RETURNING * INTO inserted_row;

  NEW.id         := inserted_row.id;
  NEW.created_at := inserted_row.created_at;
  NEW.updated_at := inserted_row.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 3. INSTEAD OF UPDATE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activity_sessions_instead_of_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE activities.activity_sessions SET
    care_home_id            = NEW.care_home_id,
    activity_id             = NEW.activity_id,
    schedule_id             = NEW.schedule_id,
    session_date            = NEW.session_date,
    start_time              = NEW.start_time,
    end_time                = NEW.end_time,
    location                = NEW.location,
    facilitator_id          = NEW.facilitator_id,
    status                  = NEW.status,
    notes                   = NEW.notes,
    actual_duration_minutes = NEW.actual_duration_minutes,
    updated_at              = now()
  WHERE id = OLD.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 4. INSTEAD OF DELETE
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activity_sessions_instead_of_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM activities.activity_sessions WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 5. ATTACH TRIGGERS
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
-- 6. GRANT access to authenticated / anon roles
-- ─────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_sessions TO authenticated;
GRANT SELECT ON public.activity_sessions TO anon;
