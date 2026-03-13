import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { listActivityAuditLogs } from '../../services/activityAuditService';

const ACTION_INFO = {
  create: { icon: 'Plus', color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Created' },
  update: { icon: 'Edit', color: 'text-blue-600', bg: 'bg-blue-100', label: 'Updated' },
  delete: { icon: 'Trash2', color: 'text-red-600', bg: 'bg-red-100', label: 'Deleted' },
  approve: { icon: 'CheckCircle', color: 'text-green-600', bg: 'bg-green-100', label: 'Approved' },
  reject: { icon: 'XCircle', color: 'text-rose-600', bg: 'bg-rose-100', label: 'Rejected' },
  login: { icon: 'LogIn', color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Login' },
  logout: { icon: 'LogOut', color: 'text-gray-600', bg: 'bg-gray-100', label: 'Logout' },
  view: { icon: 'Eye', color: 'text-purple-600', bg: 'bg-purple-100', label: 'Viewed' },
  export: { icon: 'Download', color: 'text-cyan-600', bg: 'bg-cyan-100', label: 'Exported' },
  complete: { icon: 'CheckSquare', color: 'text-teal-600', bg: 'bg-teal-100', label: 'Completed' },
  cancel: { icon: 'XSquare', color: 'text-orange-600', bg: 'bg-orange-100', label: 'Cancelled' },
};

const MODULE_INFO = {
  activities: { icon: 'Calendar', color: 'text-purple-600', label: 'Activities' },
  sessions: { icon: 'Clock', color: 'text-blue-600', label: 'Sessions' },
  enrollments: { icon: 'UserPlus', color: 'text-green-600', label: 'Enrollments' },
  expenses: { icon: 'Receipt', color: 'text-amber-600', label: 'Expenses' },
  other: { icon: 'Database', color: 'text-gray-600', label: 'Other' },
};

const getActionInfo = (action) => ACTION_INFO[action] || { icon: 'Activity', color: 'text-gray-600', bg: 'bg-gray-100', label: action || 'Action' };
const getModuleInfo = (module) => MODULE_INFO[module] || MODULE_INFO.other;

const formatRelativeTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const downloadCsv = (rows) => {
  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [
    ['Timestamp', 'Action', 'Module', 'Description', 'User', 'Role', 'Source', 'Table', 'Record ID'].map(escapeCell).join(','),
    ...rows.map((row) => [
      row.timestamp,
      row.action,
      row.module,
      row.description,
      row.user_name,
      row.user_role,
      row.sourceLabel,
      row.table_name,
      row.record_id,
    ].map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `activity-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ActivityAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  useEffect(() => {
    document.title = 'Activity Audit Logs - Activity Planner';
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await listActivityAuditLogs({ limit: 300 });
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load activity audit logs:', err);
      setError(err.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort(), [logs]);
  const modules = useMemo(() => Array.from(new Set(logs.map((log) => log.module).filter(Boolean))).sort(), [logs]);
  const uniqueUsers = useMemo(() => Array.from(new Set(logs.map((log) => log.user_name).filter(Boolean))).sort(), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const haystack = [
        log.description,
        log.user_name,
        log.user_role,
        log.module,
        log.table_name,
        log.record_id,
        log.sourceLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
      const matchesUser = userFilter === 'all' || log.user_name === userFilter;

      let matchesDate = true;
      if (dateRangeFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        switch (dateRangeFilter) {
          case 'today':
            matchesDate = logDate >= startOfToday;
            break;
          case 'yesterday': {
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            matchesDate = logDate >= yesterday && logDate < startOfToday;
            break;
          }
          case 'this-week': {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            matchesDate = logDate >= startOfWeek;
            break;
          }
          case 'last-7': {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            matchesDate = logDate >= sevenDaysAgo;
            break;
          }
          case 'this-month': {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchesDate = logDate >= startOfMonth;
            break;
          }
          default:
            matchesDate = true;
        }
      }

      return matchesSearch && matchesAction && matchesModule && matchesUser && matchesDate;
    });
  }, [logs, searchTerm, actionFilter, moduleFilter, userFilter, dateRangeFilter]);

  const todayLogs = logs.filter((log) => new Date(log.timestamp).toDateString() === new Date().toDateString()).length;
  const createActions = logs.filter((log) => log.action === 'create').length;
  const updateActions = logs.filter((log) => log.action === 'update').length;
  const criticalActions = logs.filter((log) => ['delete', 'reject', 'cancel'].includes(log.action)).length;

  const clearFilters = () => {
    setSearchTerm('');
    setActionFilter('all');
    setModuleFilter('all');
    setDateRangeFilter('all');
    setUserFilter('all');
  };

  const hasActiveFilters = searchTerm || actionFilter !== 'all' || moduleFilter !== 'all' || dateRangeFilter !== 'all' || userFilter !== 'all';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activity audit logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <motion.main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <motion.div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Activity Audit Logs
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              ActivityPlanner-only audit trail for activities, sessions, enrollments, and expenses
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button onClick={loadLogs} className="flex items-center gap-2 px-5 py-3 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md border border-gray-200 transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Icon name="RefreshCw" size={18} />
              Refresh
            </motion.button>
            <motion.button onClick={() => downloadCsv(filteredLogs)} className="flex items-center gap-2 px-5 py-3 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md border border-gray-200 transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Icon name="Download" size={18} />
              Export Logs
            </motion.button>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Icon name="Activity" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today&apos;s Activity</p>
                <p className="text-2xl font-bold text-gray-800">{todayLogs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                <Icon name="Plus" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Items Created</p>
                <p className="text-2xl font-bold text-gray-800">{createActions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Icon name="Edit" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Updates Made</p>
                <p className="text-2xl font-bold text-gray-800">{updateActions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                <Icon name="AlertTriangle" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical Actions</p>
                <p className="text-2xl font-bold text-gray-800">{criticalActions}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search activity audit logs..." className="w-full pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>

            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              <option value="all">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>{getActionInfo(action).label}</option>
              ))}
            </select>

            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              <option value="all">All Modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>{getModuleInfo(module).label}</option>
              ))}
            </select>

            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              <option value="all">All Users</option>
              {uniqueUsers.map((userName) => (
                <option key={userName} value={userName}>{userName}</option>
              ))}
            </select>

            <select value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)} className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-7">Last 7 Days</option>
              <option value="this-month">This Month</option>
            </select>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-4 py-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2">
                <Icon name="X" size={16} />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        <motion.div className="mb-4 text-gray-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          Showing {filteredLogs.length} of {logs.length} log entries
        </motion.div>

        <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          {filteredLogs.map((log, idx) => {
            const actionInfo = getActionInfo(log.action);
            const moduleInfo = getModuleInfo(log.module);

            return (
              <motion.div key={log.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 overflow-hidden hover:shadow-lg transition-all cursor-pointer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * Math.min(idx, 12), duration: 0.4 }} whileHover={{ scale: 1.002, x: 4 }} onClick={() => setSelectedLog(log)}>
                <div className="flex items-center p-4 gap-4">
                  <div className={`p-2.5 rounded-xl ${actionInfo.bg}`}>
                    <Icon name={actionInfo.icon} size={20} className={actionInfo.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-800 truncate">{log.description}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{log.sourceLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Icon name="User" size={14} />
                        {log.user_name}
                      </span>
                      <span className={`flex items-center gap-1 ${moduleInfo.color}`}>
                        <Icon name={moduleInfo.icon} size={14} />
                        {moduleInfo.label}
                      </span>
                      {log.table_name && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Icon name="Database" size={14} />
                          {log.table_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`px-3 py-1.5 rounded-lg ${actionInfo.bg}`}>
                    <span className={`text-sm font-medium ${actionInfo.color}`}>{actionInfo.label}</span>
                  </div>

                  <div className="text-right min-w-[110px]">
                    <p className="text-sm font-medium text-gray-700">{formatRelativeTimestamp(log.timestamp)}</p>
                    <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>

                  <Icon name="ChevronRight" size={20} className="text-gray-300" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredLogs.length === 0 && (
          <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon name="FileText" size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No activity audit logs found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or refresh after making an activity change</p>
            <button onClick={clearFilters} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              Clear Filters
            </button>
          </motion.div>
        )}
      </motion.main>

      <AnimatePresence>
        {selectedLog && (
          <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedLog(null)}>
            <motion.div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/20">
                      <Icon name={getActionInfo(selectedLog.action).icon} size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{getActionInfo(selectedLog.action).label}</h2>
                      <p className="text-purple-100 text-sm">{getModuleInfo(selectedLog.module).label}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedLog(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                    <Icon name="X" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
                <div className="mb-6">
                  <p className="text-lg text-gray-800 font-medium">{selectedLog.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">User</p>
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      <Icon name="User" size={16} className="text-gray-500" />
                      {selectedLog.user_name}
                    </p>
                    {selectedLog.user_role && selectedLog.user_role !== '—' && (
                      <p className="text-xs text-gray-500 mt-1">{selectedLog.user_role}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Module</p>
                    <p className={`font-semibold flex items-center gap-2 ${getModuleInfo(selectedLog.module).color}`}>
                      <Icon name={getModuleInfo(selectedLog.module).icon} size={16} />
                      {getModuleInfo(selectedLog.module).label}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedLog.timestamp).toLocaleString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Show key values from after_data in a clean list */}
                {selectedLog.after_data && (() => {
                  const SKIP_KEYS = ['id', 'created_at', 'updated_at', 'created_by', 'changed_by', 'care_home_id', 'organization_id', 'activity_id', 'session_id', 'schedule_id'];
                  const entries = Object.entries(selectedLog.after_data)
                    .filter(([key, value]) => {
                      if (SKIP_KEYS.includes(key)) return false;
                      if (value === null || value === undefined || value === '') return false;
                      return true;
                    });

                  if (entries.length === 0) return null;

                  return (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-sm text-blue-600 font-medium mb-3 flex items-center gap-2">
                        <Icon name="FileText" size={16} />
                        Details
                      </p>
                      <div className="space-y-2">
                        {entries.map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-sm text-gray-500 capitalize min-w-[140px]">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-sm text-gray-800 font-medium">{formatDetailValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityAuditLogs;
