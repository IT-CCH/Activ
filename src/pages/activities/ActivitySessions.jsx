import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';
const ActivitySessions = () => {
  const { careHomeId } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', location: '', participants_engaged: '', participants_not_engaged: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  const getEffectiveStatus = (session) => {
    if ((session?.status || '').toLowerCase() === 'cancelled') return 'cancelled';
    if (session?.completed_at) return 'completed';
    return (session?.status || 'scheduled').toLowerCase();
  };

  const startEditing = (session, e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(session.id);
    setEditForm({
      status: getEffectiveStatus(session),
      location: session.location || '',
      participants_engaged: session.attended_count ?? '',
      participants_not_engaged: session.not_engaged_count ?? '',
      notes: session.notes || '',
    });
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingSessionId(null);
  };

  const saveEdit = async (sessionId, e) => {
    if (e) e.stopPropagation();
    setEditSaving(true);
    try {
      const isCompleted = editForm.status === 'completed';
      const completedAt = isCompleted ? new Date().toISOString() : null;

      console.log('[Sessions] saveEdit called', { sessionId, status: editForm.status, completedAt });

      // Primary: update via RPC (writes directly to activities.activity_sessions)
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_activity_session', {
        p_session_id: sessionId,
        p_status: editForm.status,
        p_location: editForm.location || null,
        p_notes: editForm.notes || null,
        p_participants_engaged: editForm.participants_engaged !== '' ? parseInt(editForm.participants_engaged, 10) : null,
        p_participants_not_engaged: editForm.participants_not_engaged !== '' ? parseInt(editForm.participants_not_engaged, 10) : null,
        p_completed_at: completedAt,
      });

      console.log('[Sessions] RPC response', JSON.stringify({ rpcData, rpcError }));

      if (rpcError) {
        // Fallback: update through the public view (INSTEAD OF trigger handles it)
        console.warn('[Sessions] RPC failed, trying direct view update...');
        const { error: viewError } = await supabase
          .from('activity_sessions')
          .update({
            status: editForm.status,
            location: editForm.location || null,
            notes: editForm.notes || null,
            participants_engaged: editForm.participants_engaged !== '' ? parseInt(editForm.participants_engaged, 10) : 0,
            participants_not_engaged: editForm.participants_not_engaged !== '' ? parseInt(editForm.participants_not_engaged, 10) : 0,
            completed_at: completedAt,
          })
          .eq('id', sessionId);

        console.log('[Sessions] View update result', JSON.stringify({ viewError }));
        if (viewError) throw viewError;
      }

      // Log the audit entry (fire-and-forget)
      writeAuditLog({
        tableName: 'activity_sessions',
        recordId: sessionId,
        action: 'UPDATE',
        newValues: { status: editForm.status, location: editForm.location, notes: editForm.notes, participants_engaged: editForm.participants_engaged, participants_not_engaged: editForm.participants_not_engaged, completed_at: completedAt },
      });

      // Re-fetch all sessions from DB to get the canonical state
      await fetchSessions(true);
      setEditingSessionId(null);
    } catch (err) {
      console.error('[Sessions] Save error:', err);
      alert('Failed to save changes: ' + (err?.message || 'Unknown error'));
    } finally {
      setEditSaving(false);
    }
  };

  const fetchSessions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      let query = supabase
        .from('activity_sessions')
        .select(`
          id,
          session_date,
          start_time,
          end_time,
          location,
          status,
          notes,
          actual_duration_minutes,
          participants_engaged,
          participants_not_engaged,
          completed_at,
          activities (
            id,
            name,
            description,
            duration_minutes,
            image_url,
            location,
            activity_categories(name, color_code)
          )
        `)
        .order('session_date', { ascending: false })
        .order('start_time', { ascending: true });

      // Filter by care home: if careHomeId exists, get sessions from that care home OR global (null care_home_id)
      // If no careHomeId (super admin), get all sessions
      if (careHomeId) {
        query = query.or(`(care_home_id.eq.${careHomeId}),(care_home_id.is.null)`, { referencedTable: 'activity_sessions' });
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log('[Sessions] Raw DB data sample:', (data || []).slice(0, 3).map(s => ({ id: s.id, status: s.status, completed_at: s.completed_at, participants_engaged: s.participants_engaged })));

      // Map DB rows to the flat shape this UI expects
      const mapped = (data || []).map((s) => ({
        id: s.id,
        activity_name: s.activities?.name || 'Unknown Activity',
        category: s.activities?.activity_categories?.name || '',
        category_color: s.activities?.activity_categories?.color_code || '#8B5CF6',
        scheduled_date: s.session_date,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location || s.activities?.location || '',
        status: getEffectiveStatus(s),
        attended_count: s.participants_engaged ?? null,
        not_engaged_count: s.participants_not_engaged ?? null,
        enrolled_count: null,
        facilitator: null,
        notes: s.notes || '',
        image_url: s.activities?.image_url || null,
        completed_at: s.completed_at,
        actual_duration_minutes: s.actual_duration_minutes || s.activities?.duration_minutes,
      }));

      console.log('[Sessions] Mapped statuses sample:', mapped.slice(0, 5).map(s => ({ id: s.id, name: s.activity_name, status: s.status, completed_at: s.completed_at })));

      // Deduplicate by ID (defensive against accidental duplicates from query)
      const seen = new Set();
      const deduplicated = mapped.filter(session => {
        if (seen.has(session.id)) {
          console.warn(`Duplicate session detected: ${session.id}, skipping`);
          return false;
        }
        seen.add(session.id);
        return true;
      });

      setSessions(deduplicated);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [careHomeId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'CheckCircle', label: 'Completed' };
      case 'scheduled':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'Clock', label: 'Scheduled' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: 'XCircle', label: 'Cancelled' };
      case 'in-progress':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'Play', label: 'In Progress' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'Circle', label: status };
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.activity_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || session.category === categoryFilter;
    
    // Date range filtering
    let matchesDateRange = true;
    if (dateRangeFilter !== 'all') {
      const sessionDate = new Date(session.scheduled_date);
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      switch (dateRangeFilter) {
        case 'today':
          matchesDateRange = sessionDate.toDateString() === today.toDateString();
          break;
        case 'this-week':
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          matchesDateRange = sessionDate >= startOfWeek && sessionDate <= endOfWeek;
          break;
        case 'this-month':
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          matchesDateRange = sessionDate >= startOfMonth && sessionDate <= endOfMonth;
          break;
        case 'past-week':
          const pastWeekStart = new Date(today);
          pastWeekStart.setDate(today.getDate() - 7);
          matchesDateRange = sessionDate >= pastWeekStart && sessionDate < today;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  });

  // Get unique values for filter dropdowns
  const uniqueCategories = [...new Set(sessions.map(s => s.category))];

  const completedCount = sessions.filter(s => getEffectiveStatus(s) === 'completed').length;
  const scheduledCount = sessions.filter(s => getEffectiveStatus(s) === 'scheduled').length;
  const cancelledCount = sessions.filter(s => getEffectiveStatus(s) === 'cancelled').length;
  const totalAttendees = sessions.filter(s => getEffectiveStatus(s) === 'completed').reduce((sum, s) => sum + (s.attended_count || 0), 0);
  const totalNotEngaged = sessions.filter(s => getEffectiveStatus(s) === 'completed').reduce((sum, s) => sum + (s.not_engaged_count || 0), 0);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading sessions...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Activity Sessions
            </h1>
            <p className="text-gray-600">View and manage all activity sessions</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Icon name="CheckCircle" size={24} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Icon name="Calendar" size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
                  <p className="text-sm text-gray-600">Scheduled</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Icon name="XCircle" size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
                  <p className="text-sm text-gray-600">Cancelled</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-5 border border-purple-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Icon name="UserCheck" size={24} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{totalAttendees}</p>
                  <p className="text-sm text-gray-600">Total Engaged</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl shadow-lg p-6 mb-8 border border-indigo-100"
          >
            <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Icon name="Search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Search by activity name…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Second Row: Category and Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition shadow-sm font-medium"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm font-medium"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="past-week">Past Week</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setDateRangeFilter('all');
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition shadow-sm font-medium"
              >
                <Icon name="RotateCcw" size={18} />
                Clear Filters
              </motion.button>

              {/* Active Filters Display */}
              {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || dateRangeFilter !== 'all') && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-indigo-200">
                  <span className="text-sm font-medium text-gray-600 mr-2">Active filters:</span>
                  {searchTerm && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-1">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')}>
                        <Icon name="X" size={14} />
                      </button>
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                      Status: {statusFilter}
                      <button onClick={() => setStatusFilter('all')}>
                        <Icon name="X" size={14} />
                      </button>
                    </span>
                  )}
                  {categoryFilter !== 'all' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                      Category: {categoryFilter}
                      <button onClick={() => setCategoryFilter('all')}>
                        <Icon name="X" size={14} />
                      </button>
                    </span>
                  )}
                  {dateRangeFilter !== 'all' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                      Date: {dateRangeFilter.replace('-', ' ')}
                      <button onClick={() => setDateRangeFilter('all')}>
                        <Icon name="X" size={14} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Sessions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
              <Icon name="List" size={28} className="text-purple-600" />
              All Sessions
            </h2>

            {filteredSessions.length > 0 ? (
              <div className="space-y-4">
                {filteredSessions.map((session, index) => {
                  const effectiveStatus = getEffectiveStatus(session);
                  const statusBadge = getStatusBadge(effectiveStatus);
                  const isEditing = editingSessionId === session.id;
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: isEditing ? 1 : 1.01, x: isEditing ? 0 : 5 }}
                      onClick={() => { if (!isEditing) setSelectedSession(session); }}
                      className={`bg-white rounded-2xl shadow-lg overflow-hidden transition-all border ${isEditing ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-gray-100 cursor-pointer hover:shadow-xl'}`}
                    >
                      <div className="flex flex-col md:flex-row">
                        {/* Image */}
                        <div className="relative w-full md:w-48 h-32 md:h-auto flex-shrink-0">
                          <img
                            src={session.image_url}
                            alt={session.activity_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 md:bg-gradient-to-b" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className="px-3 py-1 rounded-full text-xs font-bold"
                                  style={{
                                    backgroundColor: session.category_color + '20',
                                    color: session.category_color
                                  }}
                                >
                                  {session.category}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}>
                                  <Icon name={statusBadge.icon} size={12} />
                                  {statusBadge.label}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                {session.activity_name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1.5">
                                  <Icon name="Calendar" size={16} className="text-indigo-500" />
                                  {formatDate(session.scheduled_date)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Icon name="Clock" size={16} className="text-indigo-500" />
                                  {session.start_time} - {session.end_time}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <Icon name="MapPin" size={16} className="text-rose-500" />
                                  {session.location}
                                </span>
                              </div>
                            </div>

                            {/* Stats + Edit Button */}
                            <div className="flex items-center gap-4 mt-3 md:mt-0">
                              {effectiveStatus === 'completed' && session.attended_count != null && !isEditing && (
                                <div className="flex gap-2">
                                  <div className="text-center px-3 py-2 bg-emerald-50 rounded-xl">
                                    <p className="text-lg font-bold text-emerald-600">{session.attended_count}</p>
                                    <p className="text-xs text-gray-600">Engaged</p>
                                  </div>
                                  {session.not_engaged_count != null && (
                                    <div className="text-center px-3 py-2 bg-orange-50 rounded-xl">
                                      <p className="text-lg font-bold text-orange-500">{session.not_engaged_count}</p>
                                      <p className="text-xs text-gray-600">Not Engaged</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {!isEditing && (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e) => startEditing(session, e)}
                                  className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl transition"
                                  title="Edit session"
                                >
                                  <Icon name="Edit3" size={18} />
                                </motion.button>
                              )}
                              {!isEditing && (
                                <div className="text-indigo-600 flex items-center gap-1">
                                  <span className="text-sm font-semibold hidden md:inline">View Details</span>
                                  <Icon name="ChevronRight" size={20} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inline Edit Form */}
                          {isEditing && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-indigo-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                  <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                  >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                                  <input
                                    type="text"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    placeholder="Location"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editForm.participants_engaged}
                                    onChange={(e) => setEditForm({ ...editForm, participants_engaged: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Not Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={editForm.participants_not_engaged}
                                    onChange={(e) => setEditForm({ ...editForm, participants_not_engaged: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                                    placeholder="0"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                                  <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    rows={2}
                                    placeholder="Session notes…"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={(e) => saveEdit(session.id, e)}
                                  disabled={editSaving}
                                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 transition font-semibold text-sm shadow disabled:opacity-50 flex items-center gap-2"
                                >
                                  {editSaving ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                      Saving…
                                    </>
                                  ) : (
                                    <>
                                      <Icon name="Check" size={16} />
                                      Save Changes
                                    </>
                                  )}
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={cancelEditing}
                                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-semibold text-sm"
                                >
                                  Cancel
                                </motion.button>
                              </div>
                            </motion.div>
                          )}

                          {/* Facilitator */}
                          {!isEditing && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                              <Icon name="User" size={16} className="text-gray-400" />
                              <span className="text-sm text-gray-600">Facilitated by <strong>{session.facilitator}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-16 text-center border border-gray-200"
              >
                <Icon name="Calendar" size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-xl font-semibold">No sessions found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden"
            >
              {/* Modal Header with Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={selectedSession.image_url}
                  alt={selectedSession.activity_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <button
                  onClick={() => setSelectedSession(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition shadow-lg"
                >
                  <Icon name="X" size={24} className="text-gray-800" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm"
                      style={{
                        backgroundColor: selectedSession.category_color + 'dd',
                        color: '#ffffff'
                      }}
                    >
                      {selectedSession.category}
                    </span>
                    {(() => {
                      const badge = getStatusBadge(getEffectiveStatus(selectedSession));
                      return (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${badge.bg} ${badge.text}`}>
                          <Icon name={badge.icon} size={12} />
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">{selectedSession.activity_name}</h2>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5">
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="Calendar" size={18} className="text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-600">Date</span>
                    </div>
                    <p className="text-gray-800 font-medium">{formatDate(selectedSession.scheduled_date)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="Clock" size={18} className="text-purple-600" />
                      <span className="text-sm font-semibold text-purple-600">Time</span>
                    </div>
                    <p className="text-gray-800 font-medium">{selectedSession.start_time} - {selectedSession.end_time}</p>
                  </div>
                </div>

                {/* Location & Facilitator */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="MapPin" size={18} className="text-rose-600" />
                      <span className="text-sm font-semibold text-rose-600">Location</span>
                    </div>
                    <p className="text-gray-800 font-medium">{selectedSession.location}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="User" size={18} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-600">Facilitator</span>
                    </div>
                    <p className="text-gray-800 font-medium">{selectedSession.facilitator}</p>
                  </div>
                </div>

                {/* Attendance */}
                {getEffectiveStatus(selectedSession) === 'completed' && selectedSession.attended_count != null && (() => {
                  const eng = selectedSession.attended_count || 0;
                  const notEng = selectedSession.not_engaged_count || 0;
                  const total = eng + notEng;
                  const pct = total > 0 ? Math.round((eng / total) * 100) : 0;
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center gap-2">
                        <Icon name="Users" size={20} className="text-emerald-600" />
                        Session Attendance
                      </h3>
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-emerald-600">{eng}</p>
                          <p className="text-sm text-gray-600">Participated</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-orange-500">{notEng}</p>
                          <p className="text-sm text-gray-600">Not Engaged</p>
                        </div>
                        {total > 0 && (
                          <div className="flex-1 min-w-[140px]">
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{pct}% engagement rate</p>
                          </div>
                        )}
                      </div>
                      {selectedSession.completed_at && (
                        <p className="text-xs text-gray-400 mt-3">
                          Completed on {new Date(selectedSession.completed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {getEffectiveStatus(selectedSession) === 'scheduled' && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                    <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center gap-2">
                      <Icon name="Calendar" size={20} className="text-blue-600" />
                      Upcoming Session
                    </h3>
                    <p className="text-gray-700">This session is scheduled and awaiting completion.</p>
                  </div>
                )}

                {/* Notes */}
                {selectedSession.notes && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 flex items-center gap-2">
                      <Icon name="FileText" size={20} className="text-gray-600" />
                      Session Notes
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{selectedSession.notes}</p>
                  </div>
                )}

                {/* Close Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedSession(null)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition font-bold shadow-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ActivitySessions;