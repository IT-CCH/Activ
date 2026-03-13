-- ============================================================
-- Migration: Complete audit log fix - trigger + read/write RPCs
-- Purpose: 1) Fix fn_audit_log() so it never crashes
--          2) Create write RPC so frontend can directly log events
--          3) Create read RPC so frontend can fetch logs  
--          4) Ensure mirror table + RLS are correct
-- Run this ENTIRE script in Supabase SQL Editor.
-- ============================================================

-- ────────────────────────────────────────────────────────────────
-- 1. Ensure audit log table exists
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities.activity_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  table_name character varying,
  record_id uuid,
  action character varying,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_audit_log_pkey PRIMARY KEY (id)
);

-- ────────────────────────────────────────────────────────────────
-- 2. Ensure mirror table exists
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_planner_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_activity_audit_id uuid UNIQUE,
  table_name text,
  record_id uuid,
  action text,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  user_name text,
  user_role text,
  changed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.activity_planner_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view ActivityPlanner audit logs" ON public.activity_planner_audit_logs;
CREATE POLICY "Authenticated users can view ActivityPlanner audit logs"
  ON public.activity_planner_audit_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ActivityPlanner audit logs" ON public.activity_planner_audit_logs;
CREATE POLICY "Authenticated users can insert ActivityPlanner audit logs"
  ON public.activity_planner_audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT, INSERT ON public.activity_planner_audit_logs TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 3. FIX the generic audit trigger function
--    Uses to_jsonb() to safely extract created_by without crashing
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION activities.fn_audit_log()
RETURNS trigger AS $$
DECLARE
  v_changed_by uuid;
  v_row_json jsonb;
BEGIN
  v_changed_by := auth.uid();

  IF v_changed_by IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      v_row_json := to_jsonb(OLD);
    ELSE
      v_row_json := to_jsonb(NEW);
    END IF;
    v_changed_by := (v_row_json ->> 'created_by')::uuid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'INSERT', NULL, to_jsonb(NEW), v_changed_by, now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_changed_by, now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO activities.activity_audit_log (
      table_name, record_id, action, old_values, new_values, changed_by, changed_at
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NULL, v_changed_by, now()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- 4. Sync trigger (mirror activities audit → public mirror table)
-- ────────────────────────────────────────────────────────────────
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
    source_activity_audit_id, table_name, record_id, action,
    old_values, new_values, changed_by, user_name, user_role, changed_at
  ) VALUES (
    NEW.id, NEW.table_name, NEW.record_id, NEW.action,
    NEW.old_values, NEW.new_values, NEW.changed_by,
    COALESCE(profile_name, 'System'),
    COALESCE(profile_role, CASE WHEN NEW.changed_by IS NULL THEN 'System' ELSE 'User' END),
    COALESCE(NEW.changed_at, now())
  )
  ON CONFLICT (source_activity_audit_id)
  DO UPDATE SET
    table_name = EXCLUDED.table_name, record_id = EXCLUDED.record_id,
    action = EXCLUDED.action, old_values = EXCLUDED.old_values,
    new_values = EXCLUDED.new_values, changed_by = EXCLUDED.changed_by,
    user_name = EXCLUDED.user_name, user_role = EXCLUDED.user_role,
    changed_at = EXCLUDED.changed_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_activity_planner_audit_logs_trigger ON activities.activity_audit_log;
CREATE TRIGGER sync_activity_planner_audit_logs_trigger
  AFTER INSERT ON activities.activity_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activity_planner_audit_logs();

-- ────────────────────────────────────────────────────────────────
-- 5. WRITE RPC - frontend can directly write audit entries
--    This bypasses trigger chain completely. Most reliable way.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_activity_audit(
  p_table_name text,
  p_record_id uuid,
  p_action text,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, activities
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_user_role text;
  v_audit_id uuid;
  v_mirror_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user profile info
  SELECT up.name, up.role INTO v_user_name, v_user_role
  FROM public.user_profiles up WHERE up.id = v_user_id;

  -- Write to activities schema audit log
  INSERT INTO activities.activity_audit_log (
    table_name, record_id, action, old_values, new_values, changed_by, changed_at
  ) VALUES (
    p_table_name, p_record_id, p_action, p_old_values, p_new_values, v_user_id, now()
  )
  RETURNING id INTO v_audit_id;

  -- Also write directly to public mirror table (belt and suspenders)
  INSERT INTO public.activity_planner_audit_logs (
    source_activity_audit_id, table_name, record_id, action,
    old_values, new_values, changed_by, user_name, user_role, changed_at
  ) VALUES (
    v_audit_id, p_table_name, p_record_id, p_action,
    p_old_values, p_new_values, v_user_id,
    COALESCE(v_user_name, 'System'),
    COALESCE(v_user_role, 'User'),
    now()
  )
  ON CONFLICT (source_activity_audit_id) DO NOTHING
  RETURNING id INTO v_mirror_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_activity_audit(text, uuid, text, jsonb, jsonb) TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 6. READ RPC - frontend reads audit logs directly
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_activity_audit_logs(
  p_limit integer DEFAULT 300
)
RETURNS TABLE (
  id uuid,
  table_name text,
  record_id uuid,
  action text,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  user_name text,
  user_role text,
  changed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, activities
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    aal.id,
    aal.table_name::text,
    aal.record_id,
    aal.action::text,
    aal.old_values,
    aal.new_values,
    aal.changed_by,
    COALESCE(up.name, 'System')::text AS user_name,
    COALESCE(up.role, CASE WHEN aal.changed_by IS NULL THEN 'System' ELSE 'User' END)::text AS user_role,
    aal.changed_at
  FROM activities.activity_audit_log aal
  LEFT JOIN public.user_profiles up ON up.id = aal.changed_by
  ORDER BY aal.changed_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_activity_audit_logs(integer) TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 7. Grants on underlying table for triggers to work
-- ────────────────────────────────────────────────────────────────
GRANT INSERT ON activities.activity_audit_log TO authenticated;
GRANT INSERT ON activities.activity_audit_log TO service_role;
GRANT SELECT ON activities.activity_audit_log TO service_role;

-- ────────────────────────────────────────────────────────────────
-- 8. Re-sync any existing audit rows into the mirror
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.activity_planner_audit_logs (
  source_activity_audit_id, table_name, record_id, action,
  old_values, new_values, changed_by, user_name, user_role, changed_at
)
SELECT
  aal.id, aal.table_name, aal.record_id, aal.action,
  aal.old_values, aal.new_values, aal.changed_by,
  COALESCE(up.name, 'System'),
  COALESCE(up.role, CASE WHEN aal.changed_by IS NULL THEN 'System' ELSE 'User' END),
  aal.changed_at
FROM activities.activity_audit_log aal
LEFT JOIN public.user_profiles up ON up.id = aal.changed_by
ON CONFLICT (source_activity_audit_id)
DO UPDATE SET
  table_name = EXCLUDED.table_name, record_id = EXCLUDED.record_id,
  action = EXCLUDED.action, old_values = EXCLUDED.old_values,
  new_values = EXCLUDED.new_values, changed_by = EXCLUDED.changed_by,
  user_name = EXCLUDED.user_name, user_role = EXCLUDED.user_role,
  changed_at = EXCLUDED.changed_at;
