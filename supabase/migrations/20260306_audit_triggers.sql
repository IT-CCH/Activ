-- ============================================================
-- Migration: Audit triggers for ActivityPlanner tables
-- Purpose:   Automatically log INSERT / UPDATE / DELETE on key
--            activities.* tables into activities.activity_audit_log.
--            The existing sync trigger then mirrors rows into
--            public.activity_planner_audit_logs.
-- Run this in Supabase SQL Editor AFTER the
-- 20260306_activity_planner_audit_logs.sql migration.
-- ============================================================

BEGIN;

-- ─── Generic audit function ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activities.fn_audit_log()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      NULL,
      to_jsonb(NEW),
      COALESCE(NEW.created_by, auth.uid()),
      now()
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      COALESCE(auth.uid(), NEW.created_by),
      now()
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      NULL,
      auth.uid(),
      now()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── activities.activities ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activities ON activities.activities;
CREATE TRIGGER trg_audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON activities.activities
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_sessions ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_sessions ON activities.activity_sessions;
CREATE TRIGGER trg_audit_activity_sessions
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_sessions
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_categories ─────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_categories ON activities.activity_categories;
CREATE TRIGGER trg_audit_activity_categories
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_categories
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_schedules ──────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_schedules ON activities.activity_schedules;
CREATE TRIGGER trg_audit_activity_schedules
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_schedules
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_enrollments ────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_enrollments ON activities.activity_enrollments;
CREATE TRIGGER trg_audit_activity_enrollments
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_enrollments
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_attendees ──────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_attendees ON activities.activity_attendees;
CREATE TRIGGER trg_audit_activity_attendees
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_attendees
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_expenses ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_expenses ON activities.activity_expenses;
CREATE TRIGGER trg_audit_activity_expenses
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_expenses
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_feedback ───────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_feedback ON activities.activity_feedback;
CREATE TRIGGER trg_audit_activity_feedback
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_feedback
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── activities.activity_resources ──────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_activity_resources ON activities.activity_resources;
CREATE TRIGGER trg_audit_activity_resources
  AFTER INSERT OR UPDATE OR DELETE ON activities.activity_resources
  FOR EACH ROW EXECUTE FUNCTION activities.fn_audit_log();

-- ─── Grant INSERT on audit table so triggers can write ──────────────────────
GRANT INSERT ON activities.activity_audit_log TO authenticated;
GRANT INSERT ON activities.activity_audit_log TO service_role;

COMMIT;
