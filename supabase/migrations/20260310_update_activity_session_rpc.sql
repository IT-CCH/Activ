-- Migration: Reliable session updates through public RPC
-- Purpose: Avoid fragile partial updates through the public.activity_sessions view
--          and update activities.activity_sessions directly from an authenticated
--          browser client using a SECURITY DEFINER function.
-- Run this in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.update_activity_session(
  p_session_id uuid,
  p_status text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_participants_engaged integer DEFAULT NULL,
  p_participants_not_engaged integer DEFAULT NULL,
  p_completed_at timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  status text,
  location text,
  notes text,
  participants_engaged integer,
  participants_not_engaged integer,
  completed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, activities
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE activities.activity_sessions
     SET status = COALESCE(p_status, activities.activity_sessions.status),
         location = p_location,
         notes = p_notes,
         participants_engaged = p_participants_engaged,
         participants_not_engaged = p_participants_not_engaged,
         completed_at = p_completed_at,
         updated_at = now()
   WHERE activities.activity_sessions.id = p_session_id;

  RETURN QUERY
  SELECT
    s.id,
    s.status::text,
    s.location::text,
    s.notes::text,
    s.participants_engaged,
    s.participants_not_engaged,
    s.completed_at
  FROM activities.activity_sessions s
  WHERE s.id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_activity_session(uuid, text, text, text, integer, integer, timestamp with time zone) TO authenticated;