import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';

const ActivitySessions = () => {
  const { careHomeId, isAdmin, isSuperAdmin, isOrgAdmin } = useAuth();
  const canViewAllHomes = isSuperAdmin || isOrgAdmin || isAdmin;

  const [sessions, setSessions] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(canViewAllHomes ? 'all' : (careHomeId || ''));
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

      const { data: rpcData, error: rpcError } = await supabase.rpc('update_activity_session', {
        p_session_id: sessionId,
        p_status: editForm.status,
        p_location: editForm.location || null,
        p_notes: editForm.notes || null,
        p_participants_engaged: editForm.participants_engaged !== '' ? parseInt(editForm.participants_engaged, 10) : null,
        p_participants_not_engaged: editForm.participants_not_engaged !== '' ? parseInt(editForm.participants_not_engaged, 10) : null,
        p_completed_at: completedAt,
      });

      if (rpcError) {
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
        if (viewError) throw viewError;
      }

      writeAuditLog({
        tableName: 'activity_sessions',
        recordId: sessionId,
        action: 'UPDATE',
        newValues: { status: editForm.status, location: editForm.location, notes: editForm.notes, participants_engaged: editForm.participants_engaged, participants_not_engaged: editForm.participants_not_engaged, completed_at: completedAt },
      });

      await fetchSessions(true);
      setEditingSessionId(null);
    } catch (err) {
      console.error('[Sessions] Save error:', err);
      alert('Failed to save changes: ' + (err?.message || 'Unknown error'));
    } finally {
      setEditSaving(false);
    }
  };

  // Fetch care homes list
  useEffect(() => {
    const fetchCareHomes = async () => {
      try {
        const { data, error } = await supabase.from('care_homes').select('id, name').order('name');
        if (error) throw error;
        setCareHomes(data || []);
      } catch (err) {
        console.error('Error fetching care homes:', err);
      }
    };
    fetchCareHomes();
  }, []);

  // Sync selectedCareHomeId for non-admins
  useEffect(() => {
    if (!canViewAllHomes && careHomeId && !selectedCareHomeId) setSelectedCareHomeId(careHomeId);
  }, [careHomeId, canViewAllHomes, selectedCareHomeId]);

  const fetchSessions = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const effectiveId = selectedCareHomeId || careHomeId;
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
          care_home_id,
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

      // Care home filter
      if (effectiveId && effectiveId !== 'all') {
        query = query.eq('care_home_id', effectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;

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
        care_home_id: s.care_home_id,
      }));

      // Deduplicate by ID
      const seen = new Set();
      const deduplicated = mapped.filter(session => {
        if (seen.has(session.id)) return false;
        seen.add(session.id);
        return true;
      });

      setSessions(deduplicated);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCareHomeId, careHomeId]);

  useEffect(() => {
    if (selectedCareHomeId || careHomeId) fetchSessions();
  }, [fetchSessions, selectedCareHomeId, careHomeId]);

  // Helper to get care home name
  const getCareHomeName = (chId) => {
    if (!chId) return null;
    return careHomes.find(h => h.id === chId)?.name || null;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'CheckCircle', label: 'Completed', border: 'border-emerald-200' };
      case 'scheduled':
        return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'Clock', label: 'Scheduled', border: 'border-blue-200' };
      case 'cancelled':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: 'XCircle', label: 'Cancelled', border: 'border-red-200' };
      case 'in-progress':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'Play', label: 'In Progress', border: 'border-yellow-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'Circle', label: status, border: 'border-gray-200' };
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.activity_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || session.category === categoryFilter;

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
        case 'this-week': {
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          matchesDateRange = sessionDate >= startOfWeek && sessionDate <= endOfWeek;
          break;
        }
        case 'this-month': {
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          matchesDateRange = sessionDate >= startOfMonth && sessionDate <= endOfMonth;
          break;
        }
        case 'past-week': {
          const pastWeekStart = new Date(today);
          pastWeekStart.setDate(today.getDate() - 7);
          matchesDateRange = sessionDate >= pastWeekStart && sessionDate < today;
          break;
        }
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  });

  const uniqueCategories = [...new Set(sessions.map(s => s.category).filter(Boolean))];
  const completedCount = sessions.filter(s => getEffectiveStatus(s) === 'completed').length;
  const scheduledCount = sessions.filter(s => getEffectiveStatus(s) === 'scheduled').length;
  const cancelledCount = sessions.filter(s => getEffectiveStatus(s) === 'cancelled').length;
  const totalAttendees = sessions.filter(s => getEffectiveStatus(s) === 'completed').reduce((sum, s) => sum + (s.attended_count || 0), 0);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || dateRangeFilter !== 'all';

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      <motion.main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Activity Sessions
            </h1>
            <p className="text-gray-500 mt-1 text-lg">Track and manage all scheduled activity sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Icon name="BarChart3" size={18} className="text-indigo-500" />
              <span className="text-sm font-medium text-gray-600">{sessions.length} total</span>
            </div>
          </div>
        </motion.div>

        {/* Care Home Selector */}
        {canViewAllHomes && careHomes.length > 1 && (
          <motion.div
            className="flex flex-wrap gap-2 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <button
              onClick={() => setSelectedCareHomeId('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedCareHomeId === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              All Care Homes
            </button>
            {careHomes.map((home) => (
              <button
                key={home.id}
                onClick={() => setSelectedCareHomeId(home.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedCareHomeId === home.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {home.name}
              </button>
            ))}
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-sm">
                <Icon name="CheckCircle" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-sm">
                <Icon name="Calendar" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{scheduledCount}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-sm">
                <Icon name="XCircle" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{cancelledCount}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancelled</p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-sm">
                <Icon name="UserCheck" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalAttendees}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Engaged</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-white/50 mb-8"
        >
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="past-week">Past Week</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); setDateRangeFilter('all'); }}
                className="px-4 py-2.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition flex items-center gap-1.5 font-medium"
              >
                <Icon name="X" size={16} />
                Clear
              </button>
            )}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {searchTerm && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                  Search: &ldquo;{searchTerm}&rdquo;
                  <button onClick={() => setSearchTerm('')}><Icon name="X" size={14} /></button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                  {statusFilter}
                  <button onClick={() => setStatusFilter('all')}><Icon name="X" size={14} /></button>
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter('all')}><Icon name="X" size={14} /></button>
                </span>
              )}
              {dateRangeFilter !== 'all' && (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                  {dateRangeFilter.replace('-', ' ')}
                  <button onClick={() => setDateRangeFilter('all')}><Icon name="X" size={14} /></button>
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </div>

        {/* Sessions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {filteredSessions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredSessions.map((session, index) => {
                const effectiveStatus = getEffectiveStatus(session);
                const statusBadge = getStatusBadge(effectiveStatus);
                const isEditing = editingSessionId === session.id;
                const careHomeName = getCareHomeName(session.care_home_id);
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.4) }}
                    whileHover={isEditing ? {} : { y: -2 }}
                    onClick={() => { if (!isEditing) setSelectedSession(session); }}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all border ${isEditing ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100 cursor-pointer hover:shadow-lg'}`}
                  >
                    {/* Card Image Header */}
                    <div className="relative h-36 overflow-hidden">
                      {session.image_url ? (
                        <img src={session.image_url} alt={session.activity_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                      {/* Status badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text} shadow-sm`}>
                          <Icon name={statusBadge.icon} size={12} />
                          {statusBadge.label}
                        </span>
                      </div>

                      {/* Category badge */}
                      {session.category && (
                        <div className="absolute top-3 left-3">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm"
                            style={{ backgroundColor: session.category_color + 'cc', color: '#ffffff' }}
                          >
                            {session.category}
                          </span>
                        </div>
                      )}

                      {/* Activity name overlay */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg font-bold text-white drop-shadow-md leading-tight">
                          {session.activity_name}
                        </h3>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4">
                      {/* Care Home Badge */}
                      {careHomeName && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                            <Icon name="Home" size={12} />
                            {careHomeName}
                          </span>
                        </div>
                      )}

                      {/* Session details */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Icon name="Calendar" size={14} className="text-indigo-400 flex-shrink-0" />
                          <span className="truncate">{formatDate(session.scheduled_date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Icon name="Clock" size={14} className="text-indigo-400 flex-shrink-0" />
                          <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                        </div>
                        {session.location && (
                          <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
                            <Icon name="MapPin" size={14} className="text-rose-400 flex-shrink-0" />
                            <span className="truncate">{session.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Attendance stats for completed sessions */}
                      {effectiveStatus === 'completed' && session.attended_count != null && !isEditing && (
                        <div className="flex items-center gap-3 mb-3 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm font-semibold text-emerald-600">{session.attended_count}</span>
                            <span className="text-xs text-gray-500">engaged</span>
                          </div>
                          {session.not_engaged_count != null && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-orange-400" />
                              <span className="text-sm font-semibold text-orange-500">{session.not_engaged_count}</span>
                              <span className="text-xs text-gray-500">not engaged</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action row */}
                      {!isEditing && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <button
                            onClick={(e) => startEditing(session, e)}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition"
                          >
                            <Icon name="Edit3" size={14} />
                            Edit
                          </button>
                          <div className="flex items-center gap-1 text-indigo-500 text-sm font-medium">
                            <span className="hidden sm:inline">Details</span>
                            <Icon name="ChevronRight" size={16} />
                          </div>
                        </div>
                      )}

                      {/* Inline Edit Form */}
                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-3 border-t border-indigo-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50"
                              >
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                              <input
                                type="text"
                                value={editForm.location}
                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50"
                                placeholder="Location"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Engaged</label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.participants_engaged}
                                onChange={(e) => setEditForm({ ...editForm, participants_engaged: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-gray-50"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Not Engaged</label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.participants_not_engaged}
                                onChange={(e) => setEditForm({ ...editForm, participants_not_engaged: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-gray-50"
                                placeholder="0"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                              <textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50"
                                rows={2}
                                placeholder="Session notes..."
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <motion.button
                              whileTap={{ scale: 0.98 }}
                              onClick={(e) => saveEdit(session.id, e)}
                              disabled={editSaving}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {editSaving ? (
                                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" /> Saving...</>
                              ) : (
                                <><Icon name="Check" size={14} /> Save</>
                              )}
                            </motion.button>
                            <button
                              onClick={cancelEditing}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100"
            >
              <Icon name="Calendar" size={56} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-700 text-xl font-semibold mb-1">No sessions found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or check back later</p>
            </motion.div>
          )}
        </motion.div>
      </motion.main>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden"
            >
              {/* Modal Header with Image */}
              <div className="relative h-48 overflow-hidden">
                {selectedSession.image_url ? (
                  <img src={selectedSession.image_url} alt={selectedSession.activity_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <button
                  onClick={() => setSelectedSession(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition shadow-lg"
                >
                  <Icon name="X" size={20} className="text-gray-800" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedSession.category && (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm"
                        style={{ backgroundColor: selectedSession.category_color + 'cc', color: '#ffffff' }}
                      >
                        {selectedSession.category}
                      </span>
                    )}
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
                {/* Care home badge in modal */}
                {getCareHomeName(selectedSession.care_home_id) && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold">
                      <Icon name="Home" size={14} />
                      {getCareHomeName(selectedSession.care_home_id)}
                    </span>
                  </div>
                )}

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
                    <p className="text-gray-800 font-medium">{formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</p>
                  </div>
                </div>

                {/* Location */}
                {selectedSession.location && (
                  <div className="bg-rose-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="MapPin" size={18} className="text-rose-600" />
                      <span className="text-sm font-semibold text-rose-600">Location</span>
                    </div>
                    <p className="text-gray-800 font-medium">{selectedSession.location}</p>
                  </div>
                )}

                {/* Attendance */}
                {getEffectiveStatus(selectedSession) === 'completed' && selectedSession.attended_count != null && (() => {
                  const eng = selectedSession.attended_count || 0;
                  const notEng = selectedSession.not_engaged_count || 0;
                  const total = eng + notEng;
                  const pct = total > 0 ? Math.round((eng / total) * 100) : 0;
                  return (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
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
                    <div className="flex items-center gap-2">
                      <Icon name="Calendar" size={20} className="text-blue-600" />
                      <p className="text-gray-700 font-medium">This session is scheduled and awaiting completion.</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSession.notes && (
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Icon name="FileText" size={18} className="text-gray-600" />
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
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-bold shadow-lg"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivitySessions;