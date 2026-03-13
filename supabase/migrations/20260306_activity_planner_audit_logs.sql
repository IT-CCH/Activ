-- ============================================================
-- Migration: Dedicated audit log table for ActivityPlanner app
-- Purpose: Keep ActivityPlanner audit data separate from MealManager
--          while mirroring existing activities.activity_audit_log rows.
-- Run this in Supabase SQL Editor.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.activity_planner_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_activity_audit_id uuid UNIQUE,
  table_name text,
  record_id uuid,
  action text,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES auth.users(id),
  user_name text,
  user_role text,
  changed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_planner_audit_logs_changed_at
  ON public.activity_planner_audit_logs(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_planner_audit_logs_action
  ON public.activity_planner_audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_activity_planner_audit_logs_table_name
  ON public.activity_planner_audit_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_activity_planner_audit_logs_record_id
  ON public.activity_planner_audit_logs(record_id);

CREATE OR REPLACE FUNCTION public.sync_activity_planner_audit_logs()
RETURNS trigger AS $$
DECLARE
  profile_name text;
  profile_role text;
BEGIN
  SELECT up.name, up.role
  INTO profile_name, profile_role
  FROM public.user_profiles up
  WHERE up.id = NEW.changed_by;

  INSERT INTO public.activity_planner_audit_logs (
    source_activity_audit_id,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    changed_by,
    user_name,
    user_role,
    changed_at
  ) VALUES (
    NEW.id,
    NEW.table_name,
    NEW.record_id,
    NEW.action,
    NEW.old_values,
    NEW.new_values,
    NEW.changed_by,
    COALESCE(profile_name, 'System'),
    COALESCE(profile_role, CASE WHEN NEW.changed_by IS NULL THEN 'System' ELSE 'User' END),
    COALESCE(NEW.changed_at, now())
  )
  ON CONFLICT (source_activity_audit_id)
  DO UPDATE SET
    table_name = EXCLUDED.table_name,
    record_id = EXCLUDED.record_id,
    action = EXCLUDED.action,
    old_values = EXCLUDED.old_values,
    new_values = EXCLUDED.new_values,
    changed_by = EXCLUDED.changed_by,
    user_name = EXCLUDED.user_name,
    user_role = EXCLUDED.user_role,
    changed_at = EXCLUDED.changed_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_activity_planner_audit_logs_trigger ON activities.activity_audit_log;

CREATE TRIGGER sync_activity_planner_audit_logs_trigger
  AFTER INSERT ON activities.activity_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activity_planner_audit_logs();

INSERT INTO public.activity_planner_audit_logs (
  source_activity_audit_id,
  table_name,
  record_id,
  action,
  old_values,
  new_values,
  changed_by,
  user_name,
  user_role,
  changed_at
)
SELECT
  aal.id,
  aal.table_name,
  aal.record_id,
  aal.action,
  aal.old_values,
  aal.new_values,
  aal.changed_by,
  COALESCE(up.name, 'System') AS user_name,
  COALESCE(up.role, CASE WHEN aal.changed_by IS NULL THEN 'System' ELSE 'User' END) AS user_role,
  aal.changed_at
FROM activities.activity_audit_log aal
LEFT JOIN public.user_profiles up ON up.id = aal.changed_by
ON CONFLICT (source_activity_audit_id)
DO UPDATE SET
  table_name = EXCLUDED.table_name,
  record_id = EXCLUDED.record_id,
  action = EXCLUDED.action,
  old_values = EXCLUDED.old_values,
  new_values = EXCLUDED.new_values,
  changed_by = EXCLUDED.changed_by,
  user_name = EXCLUDED.user_name,
  user_role = EXCLUDED.user_role,
  changed_at = EXCLUDED.changed_at;

ALTER TABLE public.activity_planner_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ActivityPlanner audit logs" ON public.activity_planner_audit_logs;
CREATE POLICY "Authenticated users can view ActivityPlanner audit logs"
  ON public.activity_planner_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.activity_planner_audit_logs TO authenticated;

COMMIT;
