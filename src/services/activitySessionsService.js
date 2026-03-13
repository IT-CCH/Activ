import supabase from './supabaseClient';

export async function updateActivitySession({
  sessionId,
  status = null,
  location = null,
  notes = null,
  participantsEngaged = null,
  participantsNotEngaged = null,
  completedAt = null,
}) {
  const { data, error } = await supabase.rpc('update_activity_session', {
    p_session_id: sessionId,
    p_status: status,
    p_location: location,
    p_notes: notes,
    p_participants_engaged: participantsEngaged,
    p_participants_not_engaged: participantsNotEngaged,
    p_completed_at: completedAt,
  });

  if (error) throw error;

  return Array.isArray(data) ? data[0] || null : data || null;
}

export default {
  updateActivitySession,
};