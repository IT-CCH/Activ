import supabase from './supabaseClient';

const MODULE_LABELS = {
  activities: 'Activities',
  sessions: 'Sessions',
  enrollments: 'Enrollments',
  expenses: 'Expenses',
  other: 'Other',
};

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  approve: 'Approved',
  reject: 'Rejected',
  login: 'Login',
  logout: 'Logout',
  view: 'Viewed',
  export: 'Exported',
  complete: 'Completed',
  cancel: 'Cancelled',
};

const parseMaybeJson = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const singularize = (label = '') => {
  if (label.endsWith('ies')) return `${label.slice(0, -3)}y`;
  if (label.endsWith('s')) return label.slice(0, -1);
  return label;
};

const normalizeAction = (action = '') => {
  const normalized = String(action || '').trim().toLowerCase();

  if (!normalized) return 'update';
  if (normalized === 'insert' || normalized === 'created' || normalized.endsWith('_created')) return 'create';
  if (normalized === 'update' || normalized === 'updated' || normalized === 'modified' || normalized.endsWith('_updated')) return 'update';
  if (normalized === 'delete' || normalized === 'deleted' || normalized === 'remove' || normalized === 'removed') return 'delete';
  if (normalized.includes('approve')) return 'approve';
  if (normalized.includes('reject')) return 'reject';
  if (normalized.includes('login')) return 'login';
  if (normalized.includes('logout')) return 'logout';
  if (normalized.includes('view')) return 'view';
  if (normalized.includes('export')) return 'export';
  if (normalized.includes('complete')) return 'complete';
  if (normalized.includes('cancel')) return 'cancel';

  return normalized;
};

const getModuleFromSource = (...values) => {
  const haystack = values
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('expense')) return 'expenses';
  if (haystack.includes('enrollment') || haystack.includes('attendee')) return 'enrollments';
  if (haystack.includes('session')) return 'sessions';
  if (haystack.includes('activit') || haystack.includes('schedule') || haystack.includes('calendar')) return 'activities';

  return 'other';
};

const getPrimaryLabel = (row = {}) => {
  const sources = [
    parseMaybeJson(row.new_values),
    parseMaybeJson(row.old_values),
    parseMaybeJson(row.after_data),
    parseMaybeJson(row.before_data),
  ].filter(Boolean);

  for (const source of sources) {
    const label =
      source.name ||
      source.title ||
      source.activity_name ||
      source.resource_name ||
      source.resident_name ||
      source.description;

    if (label) return String(label);
  }

  return null;
};

const getChangedFields = (beforeData, afterData) => {
  const before = parseMaybeJson(beforeData) || {};
  const after = parseMaybeJson(afterData) || {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
};

const buildDescription = ({ module, action, label, newValues, oldValues }) => {
  const moduleLabel = MODULE_LABELS[module] || 'Records';
  const itemName = label || singularize(moduleLabel.toLowerCase()) + ' record';

  // Specific descriptions for common actions
  if (action === 'complete') {
    return `"${itemName}" was marked as completed`;
  }
  if (action === 'cancel') {
    return `"${itemName}" was cancelled`;
  }
  if (action === 'create') {
    return `New ${singularize(moduleLabel.toLowerCase())} "${itemName}" was created`;
  }
  if (action === 'delete') {
    return `${singularize(moduleLabel)} "${itemName}" was deleted`;
  }

  // For updates, try to describe what changed
  if (action === 'update' && newValues && oldValues) {
    const nv = typeof newValues === 'object' ? newValues : {};
    const ov = typeof oldValues === 'object' ? oldValues : {};
    if (nv.status && nv.status !== ov.status) {
      return `"${itemName}" status changed to ${nv.status}`;
    }
  }
  if (action === 'update') {
    return `"${itemName}" was updated`;
  }

  const actionLabel = ACTION_LABELS[action] || titleCase(action);
  return `${actionLabel} "${itemName}"`;
};

const normalizeActivityPlannerLog = (row) => {
  const action = normalizeAction(row.action);
  const module = getModuleFromSource(row.table_name);
  const beforeData = parseMaybeJson(row.old_values);
  const afterData = parseMaybeJson(row.new_values);
  const changedFields = getChangedFields(beforeData, afterData);
  const label = getPrimaryLabel(row);

  return {
    id: row.id,
    rawId: row.source_activity_audit_id || row.id,
    source: 'activity_planner_audit_logs',
    sourceLabel: 'ActivityPlanner Audit Table',
    timestamp: row.changed_at,
    action,
    module,
    description: buildDescription({ module, action, label, newValues: afterData, oldValues: beforeData }),
    user_name: row.user_name || 'System',
    user_role: row.user_role || (row.changed_by ? 'User' : 'System'),
    table_name: row.table_name,
    record_id: row.record_id,
    details: {
      changed_fields: changedFields,
    },
    before_data: beforeData,
    after_data: afterData,
  };
};

/**
 * Normalize a row from the direct activities.activity_audit_log table.
 * This table does NOT have user_name / user_role — only changed_by (UUID).
 */
const normalizeDirectAuditLog = (row) => {
  const action = normalizeAction(row.action);
  const module = getModuleFromSource(row.table_name);
  const beforeData = parseMaybeJson(row.old_values);
  const afterData = parseMaybeJson(row.new_values);
  const changedFields = getChangedFields(beforeData, afterData);
  const label = getPrimaryLabel(row);

  return {
    id: row.id,
    rawId: row.id,
    source: 'activity_audit_log',
    sourceLabel: 'Activities Audit Log (Direct)',
    timestamp: row.changed_at,
    action,
    module,
    description: buildDescription({ module, action, label, newValues: afterData, oldValues: beforeData }),
    user_name: row.changed_by || 'System',
    user_role: row.changed_by ? 'User' : 'System',
    table_name: row.table_name,
    record_id: row.record_id,
    details: {
      changed_fields: changedFields,
    },
    before_data: beforeData,
    after_data: afterData,
  };
};

export async function listActivityAuditLogs({ limit = 250 } = {}) {
  let rows = [];

  // Primary: Use the RPC that reads directly from activities.activity_audit_log
  // This is the most reliable source — no mirror / sync dependency.
  try {
    const { data, error } = await supabase.rpc('get_activity_audit_logs', {
      p_limit: limit,
    });

    if (error) throw error;

    if (data && data.length > 0) {
      rows = (data || []).map((row) => normalizeDirectAuditLog({
        ...row,
        // The RPC already joins user_profiles, override normalizer's user_name
      }));
      // Override user_name / user_role from the RPC result since they include profile info
      rows = rows.map((r, i) => ({
        ...r,
        user_name: data[i].user_name || r.user_name,
        user_role: data[i].user_role || r.user_role,
        source: 'activity_audit_log_rpc',
        sourceLabel: 'Activities Audit Log (RPC)',
      }));

      rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return { data: rows };
    }
  } catch (err) {
    console.warn('RPC get_activity_audit_logs failed, falling back to mirror table:', err);
  }

  // Fallback: Try the dedicated mirror table (public.activity_planner_audit_logs).
  try {
    const { data, error } = await supabase
      .from('activity_planner_audit_logs')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    rows = (data || []).map((row) => normalizeActivityPlannerLog(row));
  } catch (error) {
    console.warn('Unable to load public.activity_planner_audit_logs:', error);
  }

  rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    data: rows,
  };
}

/**
 * Write an audit log entry via RPC (bypasses trigger chain entirely).
 * Fire-and-forget — errors are logged but don't break the caller.
 */
export async function writeAuditLog({ tableName, recordId, action, oldValues = null, newValues = null }) {
  try {
    const { data, error } = await supabase.rpc('log_activity_audit', {
      p_table_name: tableName,
      p_record_id: recordId,
      p_action: action,
      p_old_values: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
      p_new_values: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
    });

    if (error) {
      console.warn('[Audit] RPC log_activity_audit failed, trying direct insert:', error);
      // Fallback: write directly to the public mirror table
      const { error: fallbackError } = await supabase
        .from('activity_planner_audit_logs')
        .insert({
          table_name: tableName,
          record_id: recordId,
          action: action,
          old_values: oldValues,
          new_values: newValues,
          changed_at: new Date().toISOString(),
          user_name: 'Current User',
          user_role: 'User',
        });
      if (fallbackError) {
        console.error('[Audit] Direct insert also failed:', fallbackError);
      }
    }
    return data;
  } catch (err) {
    console.error('[Audit] writeAuditLog error:', err);
  }
}

export default {
  listActivityAuditLogs,
  writeAuditLog,
};
