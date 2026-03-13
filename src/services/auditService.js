import supabase from './supabaseClient';

export async function listAuditLogs({
  page = 1,
  pageSize = 20,
  careHomeId,
  startDate,
  endDate,
  entityType,
  action,
} = {}) {
  console.log('listAuditLogs called with:', { page, pageSize, careHomeId, startDate, endDate, entityType, action });
  
  // Debug: Check JWT claims
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current JWT claims:', {
    uid: user?.id,
    role: user?.role,
    app_metadata: user?.app_metadata,
    user_metadata: user?.user_metadata,
  });
  console.log('Full user object:', user);
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      care_home:care_homes!care_home_id(id, name),
      actor_care_home:care_homes!actor_care_home_id(id, name)
    `, { count: 'exact' })
    .order('changed_at', { ascending: false })
    .range(from, to);

  // Don't filter by care_home_id here - let RLS handle it
  // Only apply filter if explicitly requested (admin filtering)
  // if (careHomeId) query = query.eq('care_home_id', careHomeId);
  
  if (startDate) query = query.gte('changed_at', new Date(startDate).toISOString());
  if (endDate) query = query.lte('changed_at', new Date(endDate).toISOString());
  if (entityType) query = query.eq('entity_type', entityType);
  if (action) query = query.eq('action', action);

  const { data, error, count } = await query;
  
  console.log('listAuditLogs response:', { data, error, count });
  
  if (error) {
    console.error('Audit logs query error:', error);
    throw error;
  }
  return { data, count };
}
