import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/AppIcon';
import ActivityDetailsModal from '../../components/ActivityDetailsModal';
import ModernCalendar from '../../components/ModernCalendar';
import LiveClock from '../../components/LiveClock';
import WeatherWidget from '../../components/WeatherWidget';
import ScheduleCalendar from '../../components/ScheduleCalendar';
import { getHolidayInfo, getAllHolidaysForDate } from '../../utils/ukHolidays';
import quotesData from '../../utils/quotes.json';
import supabase from '../../services/supabaseClient';
import { updateActivitySession } from '../../services/activitySessionsService';
import { writeAuditLog } from '../../services/activityAuditService';

const MainDashboard = () => {
  const navigate = useNavigate();
  const { user, displayName, careHomeId, isAdmin, isSuperAdmin, isOrgAdmin, isCareHomeManager, organizationId } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    inProgress: 0,
    participants: 0,
    totalToday: 0,
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [testDate, setTestDate] = useState(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [realCareHomes, setRealCareHomes] = useState([]);
  const [careHomeLoading, setCareHomeLoading] = useState(true);

  // Multi-care-home support
  // Care home managers are locked to their own home — only super/org/admin can switch
  const canViewAllHomes = isSuperAdmin || isOrgAdmin || isAdmin;
  const [selectedDashCareHomeId, setSelectedDashCareHomeId] = useState(
    canViewAllHomes ? (careHomeId || '') : (careHomeId || '')
  );

  // Inline card completion form state
  const [completingSessionId, setCompletingSessionId] = useState(null);
  const [completingEngaged, setCompletingEngaged] = useState('');
  const [completingNotEngaged, setCompletingNotEngaged] = useState('');
  const [completingSaving, setCompletingSaving] = useState(false);

  // Inline edit form state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', participants_engaged: '', participants_not_engaged: '', notes: '', location: '' });
  const [editSaving, setEditSaving] = useState(false);

  const getEffectiveStatus = (session) => {
    if ((session?.status || '').toLowerCase() === 'cancelled') return 'cancelled';
    if (session?.completed_at) return 'completed';
    return (session?.status || 'scheduled').toLowerCase();
  };

  // Function to get current date (with test date override)
  const getCurrentDate = () => {
    return testDate || new Date();
  };

  // Helper function to get time-based greeting
  const getTimeOfDay = (hour) => {
    if (hour < 12) return '🌅 Good Morning';
    if (hour < 17) return '☀️ Good Afternoon';
    if (hour < 21) return '🌆 Good Evening';
    return '🌙 Good Night';
  };

  // Set initial selectedDashCareHomeId once care homes load.
  // Care home managers are always locked to their own home.
  useEffect(() => {
    if (careHomeId && !selectedDashCareHomeId) {
      setSelectedDashCareHomeId(careHomeId);
    }
    if (isCareHomeManager && careHomeId) {
      setSelectedDashCareHomeId(careHomeId);
    }
  }, [careHomeId, isCareHomeManager]);

  // Fetch real care homes
  useEffect(() => {
    const fetchCareHomes = async () => {
      try {
        setCareHomeLoading(true);
        const { data, error } = await supabase
          .from('care_homes')
          .select('id, name')
          .order('name');
        if (error) throw error;
        setRealCareHomes(data || []);
        // If admin has no careHomeId, default to first care home
        if (!selectedDashCareHomeId && data?.length > 0) {
          setSelectedDashCareHomeId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching care homes:', err);
        setRealCareHomes([]);
      } finally {
        setCareHomeLoading(false);
      }
    };
    fetchCareHomes();
  }, []);

  // Fetch today's activities — extracted so onMarkComplete can refresh
  const refreshActivities = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('activity_sessions')
        .select(`
          id,
          activity_id,
          care_home_id,
          session_date,
          start_time,
          end_time,
          status,
          location,
          notes,
          participants_engaged,
          participants_not_engaged,
          completed_at,
          activities (
            id,
            name,
            description,
            image_url,
            duration_minutes,
            max_participants,
            location,
            activity_categories(name, color_code)
          )
        `)
        .eq('session_date', today)
        .order('start_time', { ascending: true });

      const effectiveId = selectedDashCareHomeId || careHomeId;
      if (effectiveId) {
        query = query.or(`care_home_id.eq.${effectiveId},care_home_id.is.null`);
      }

      const { data: sessions, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;

      const normalizedSessions = (sessions || []).map((session) => ({
        ...session,
        status: getEffectiveStatus(session),
      }));

      setActivities(normalizedSessions);

      const data = normalizedSessions;
      const completed = data.filter((s) => (s.status || '').toLowerCase() === 'completed').length;
      const inProgress = data.filter((s) => ['in_progress', 'in progress', 'scheduled'].includes((s.status || '').toLowerCase())).length;
      const totalEngaged = data.reduce((sum, s) => sum + (s.participants_engaged || 0), 0);

      setStats({
        completed,
        inProgress,
        participants: totalEngaged,
        totalToday: data.length,
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDashCareHomeId, careHomeId]);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  const getTimeString = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const isAM = hour < 12;
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${minutes} ${isAM ? 'AM' : 'PM'}`;
  };

  const getActivityImage = (index) => {
    const images = [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=300&fit=crop',
    ];
    return images[index % images.length];
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const statusConfig = {
      'completed': { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      'in progress': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
      'in_progress': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
      'scheduled': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Scheduled' },
      'upcoming': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Upcoming' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
    };
    const config = statusConfig[s] || statusConfig['scheduled'];
    return <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>{config.label}</span>;
  };

  
  // Get daily quote based on current date
  const getDailyQuote = () => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % quotesData.length;
    return quotesData[quoteIndex];
  };

  const dailyQuote = getDailyQuote();
  
  // Check for holidays and special days
  const today = getCurrentDate();
  const todayHolidays = getAllHolidaysForDate(today);
  const holidayInfo = todayHolidays.length > 0 ? todayHolidays[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Greeting Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`relative rounded-lg p-8 mb-8 text-white shadow-lg transition-all overflow-hidden ${
          holidayInfo ? `bg-gradient-to-br ${holidayInfo.animatedBg || holidayInfo.greetingBg} animate-gradient-x` : 'bg-gradient-to-r from-purple-500 to-pink-500'
        }`}>
          {/* Animated Background Elements */}
          {holidayInfo && holidayInfo.floatingEmojis && (
            <>
              {/* Floating Emojis Animation */}
              {holidayInfo.floatingEmojis.map((emoji, index) => (
                <div
                  key={index}
                  className={`absolute text-4xl animate-float-${index % 3} opacity-20`}
                  style={{
                    left: `${10 + (index * 15)}%`,
                    top: `${20 + (index * 10)}%`,
                    animationDelay: `${index * 0.5}s`,
                    animationDuration: `${3 + (index * 0.5)}s`,
                  }}
                >
                  {emoji}
                </div>
              ))}

              {/* Animated Particles */}
              {holidayInfo.particleColors && (
                <div className="absolute inset-0 overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className={`absolute w-2 h-2 rounded-full ${holidayInfo.particleColors[i % holidayInfo.particleColors.length]} animate-particle opacity-60`}
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        animationDuration: `${2 + Math.random() * 2}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Gradient Overlay for Depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
            </>
          )}

          <div className="relative z-10 flex flex-col lg:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                {todayHolidays.length > 0 && (
                  <div className="flex gap-2">
                    {todayHolidays.slice(0, 3).map((h, idx) => (
                      <span
                        key={idx}
                        className="text-5xl animate-holiday-twinkle hover:animate-bounce transition-all duration-300 drop-shadow-lg"
                        style={{
                          animationDelay: `${idx * 0.2}s`,
                          filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'
                        }}
                      >
                        {h.emoji}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-4xl font-bold drop-shadow-lg">
                  {holidayInfo ? holidayInfo.greetingText : `${getTimeOfDay((testDate || new Date()).getHours())}, ${displayName || 'User'}! 👋`}
                </h1>
              </div>
              {/* Compact Animated Date Concept */}
              <div className="relative mt-4">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 shadow-lg">
                  {/* Animated Calendar Icon */}
                  <div className="relative w-5 h-5">
                    <div className="absolute inset-0 bg-white/90 rounded-sm shadow-sm">
                      <div className="absolute top-0.5 left-0.5 right-0.5 h-1 bg-gradient-to-r from-blue-400 to-purple-500 rounded-sm"></div>
                      <div className="absolute bottom-0.5 left-0.5 right-0.5 grid grid-cols-7 gap-px">
                        {[...Array(7)].map((_, i) => (
                          <div key={i} className={`w-0.5 h-0.5 rounded-full ${i === new Date().getDay() ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        ))}
                      </div>
                    </div>
                    {/* Floating particles */}
                    <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-400 rounded-full animate-bounce opacity-80"></div>
                    <div className="absolute -bottom-0.5 -left-1 w-0.5 h-0.5 bg-pink-400 rounded-full animate-ping opacity-60"></div>
                  </div>

                  {/* Morphing Date Display */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-white animate-pulse">
                      {new Date().toLocaleDateString('en-US', { day: 'numeric' })}
                    </span>
                    <span className="text-sm font-medium text-white/80">
                      {new Date().toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-xs text-white/60 animate-pulse">
                      {new Date().getFullYear()}
                    </span>
                  </div>

                  {/* Animated day indicator */}
                  <div className="ml-2 flex flex-col items-center">
                    <div className="text-xs font-bold text-white/90 uppercase tracking-wider">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse mt-0.5"></div>
                  </div>
                </div>

                {/* Subtle animated underline */}
                <div className="mt-1 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
              </div>
              {todayHolidays.length > 0 && todayHolidays[0].activities && (
                <div className="mt-4 bg-white/20 rounded-lg p-4">
                  <p className="text-sm font-semibold mb-2">🎯 Today's Special Activities:</p>
                  <ul className="text-xs space-y-1 opacity-95">
                    {todayHolidays[0].activities.map((activity, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span>✓</span>
                        <span>{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Live Clock */}
            <div className="lg:pr-8 space-y-3">
              <LiveClock testDate={testDate} />
              
              {/* Weather Widget */}
              <WeatherWidget />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Today's Activity Schedule Column */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-8"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm">💭</span>
                </div>
                <div className="flex-1 min-w-0">
                  <blockquote className="text-slate-700 text-sm leading-relaxed mb-2 font-medium">
                    "{dailyQuote.quote}"
                  </blockquote>
                  <cite className="text-slate-500 text-xs font-medium block">
                    — {dailyQuote.author}
                  </cite>
                </div>
              </div>
            </motion.div>

            {/* Today's Activity Schedule — Modern Design */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 overflow-hidden"
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-5">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-purple-500/5" />
                <div className="relative flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Icon name="Calendar" size={17} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Today's Schedule</h2>
                        <p className="text-xs text-slate-400 font-medium">{activities.length} {activities.length === 1 ? 'activity' : 'activities'}{selectedDashCareHomeId && realCareHomes.length > 0 ? ` · ${realCareHomes.find(h => h.id === selectedDashCareHomeId)?.name || ''}` : ''}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="group flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Icon name="Plus" size={15} className="group-hover:rotate-90 transition-transform duration-300" />
                    Schedule
                  </button>
                </div>

                {/* Mini stats bar */}
                <div className="relative z-10 flex gap-3">
                  {[
                    { label: 'Total', value: stats.totalToday, color: 'text-violet-600', bg: 'bg-violet-50', icon: 'Calendar' },
                    { label: 'Done', value: stats.completed, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'CheckCircle' },
                    { label: 'Pending', value: stats.inProgress, color: 'text-amber-600', bg: 'bg-amber-50', icon: 'Clock' },
                    { label: 'Engaged', value: stats.participants, color: 'text-sky-600', bg: 'bg-sky-50', icon: 'Users' },
                  ].map((s) => (
                    <div key={s.label} className={`flex-1 ${s.bg} rounded-xl px-3 py-2 border border-white/80`}>
                      <div className="flex items-center gap-1.5">
                        <Icon name={s.icon} size={12} className={s.color} />
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.color}`}>{s.label}</span>
                      </div>
                      <p className={`text-xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Care Home Selector — Admins / Super Admins only */}
                {canViewAllHomes && realCareHomes.length > 1 && (
                  <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                    {realCareHomes.map((home) => (
                      <button
                        key={home.id}
                        onClick={() => setSelectedDashCareHomeId(home.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                          selectedDashCareHomeId === home.id
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                            : 'bg-white/80 text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm border border-slate-200/60'
                        }`}
                      >
                        {home.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity List */}
              {loading ? (
                <div className="px-6 pb-8 pt-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-3 border-violet-200 border-t-violet-600 animate-spin" />
                    <p className="text-sm text-slate-400 font-medium">Loading schedule...</p>
                  </div>
                </div>
              ) : activities.length === 0 ? (
                <div className="px-6 pb-8 pt-2">
                  <div className="flex flex-col items-center gap-3 py-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                      <Icon name="Calendar" size={28} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No activities today</p>
                    <p className="text-xs text-slate-400">Schedule one to get started</p>
                    <button
                      onClick={() => navigate('/calendar')}
                      className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      <Icon name="Plus" size={14} />
                      Schedule an Activity
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-3">
                  {activities.map((session, idx) => {
                    const isCompleting = completingSessionId === session.id;
                    const isEditing = editingSessionId === session.id;
                    const isCompleted = (session.status || '').toLowerCase() === 'completed';
                    const isCancelled = (session.status || '').toLowerCase() === 'cancelled';
                    const catColor = session.activities?.activity_categories?.color_code || '#7C3AED';

                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + (idx * 0.08), duration: 0.4 }}
                        className={`group relative rounded-2xl border transition-all duration-300 hover:shadow-md ${
                          isCompleted
                            ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border-emerald-200/60'
                            : isCancelled
                            ? 'bg-gradient-to-r from-red-50/60 to-orange-50/40 border-red-200/50 opacity-70'
                            : 'bg-white/90 border-slate-200/60 hover:border-violet-200'
                        }`}
                      >
                        {/* Accent strip */}
                        <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: isCompleted ? '#10b981' : catColor }} />

                        <div className="p-4 pl-5">
                          <div className="flex gap-4">
                            {/* Image with overlay */}
                            <div className="relative flex-shrink-0">
                              <img
                                src={session.activities?.image_url || getActivityImage(idx)}
                                alt={session.activities?.name}
                                className="w-[72px] h-[72px] rounded-xl object-cover shadow-sm"
                              />
                              {isCompleted && (
                                <div className="absolute inset-0 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                  <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                    <Icon name="Check" size={14} className="text-white" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: catColor }}>
                                      {getTimeString(session.start_time)}{session.end_time ? ` – ${getTimeString(session.end_time)}` : ''}
                                    </span>
                                    {session.activities?.activity_categories?.name && (
                                      <span
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: catColor + '18', color: catColor }}
                                      >
                                        {session.activities.activity_categories.name}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-[15px] font-bold text-slate-900 truncate leading-snug">
                                    {session.activities?.name}
                                  </h3>
                                </div>
                                {getStatusBadge(session.status)}
                              </div>

                              {session.activities?.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 mb-2 leading-relaxed">
                                  {session.activities.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-1.5 items-center mb-3">
                                <span className="inline-flex items-center gap-1 text-[11px] bg-white/80 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">
                                  <Icon name="MapPin" size={11} className="text-slate-400" />
                                  {session.location || session.activities?.location || 'TBC'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] bg-white/80 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">
                                  <Icon name="Clock" size={11} className="text-slate-400" />
                                  {session.activities?.duration_minutes || 60} min
                                </span>
                              </div>

                              {/* Completed engagement bar */}
                              {isCompleted && (session.participants_engaged != null || session.participants_not_engaged != null) && (
                                <div className="flex items-center gap-3 mb-3 p-2.5 bg-white/70 rounded-xl border border-emerald-100">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                                      <Icon name="UserCheck" size={12} className="text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-emerald-700 leading-none">{session.participants_engaged ?? 0}</p>
                                      <p className="text-[9px] text-slate-400">Engaged</p>
                                    </div>
                                  </div>
                                  <div className="w-px h-6 bg-slate-200" />
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                                      <Icon name="UserX" size={12} className="text-orange-500" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-orange-600 leading-none">{session.participants_not_engaged ?? 0}</p>
                                      <p className="text-[9px] text-slate-400">Not Engaged</p>
                                    </div>
                                  </div>
                                  {(() => {
                                    const total = (session.participants_engaged ?? 0) + (session.participants_not_engaged ?? 0);
                                    const pct = total > 0 ? Math.round(((session.participants_engaged ?? 0) / total) * 100) : 0;
                                    return total > 0 ? (
                                      <div className="flex-1 min-w-[80px] ml-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[9px] text-slate-400">Rate</span>
                                          <span className="text-[10px] font-bold text-emerald-600">{pct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => {
                                    setSelectedActivity(session);
                                    setIsModalOpen(true);
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
                                >
                                  <Icon name="Eye" size={12} />
                                  Details
                                </button>

                                <button
                                  onClick={() => navigate(`/tv-display/activity?sessionId=${session.id}&activityId=${session.activity_id}`)}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition-all duration-200"
                                >
                                  <Icon name="Monitor" size={12} />
                                  TV Display
                                </button>

                                {!isCompleted && !isCancelled && (
                                  <button
                                    onClick={() => {
                                      setCompletingSessionId(session.id);
                                      setEditingSessionId(null);
                                      setCompletingEngaged('');
                                      setCompletingNotEngaged('');
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-all duration-200"
                                  >
                                    <Icon name="CheckCircle" size={12} />
                                    Complete
                                  </button>
                                )}

                                {/* Edit button — shown for ALL statuses including completed */}
                                <button
                                  onClick={() => {
                                    setEditingSessionId(session.id);
                                    setCompletingSessionId(null);
                                    setEditForm({
                                      status: session.status || 'scheduled',
                                      participants_engaged: session.participants_engaged ?? '',
                                      participants_not_engaged: session.participants_not_engaged ?? '',
                                      notes: session.notes || '',
                                      location: session.location || session.activities?.location || '',
                                    });
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-violet-100 text-violet-700 hover:bg-violet-200 rounded-lg transition-all duration-200"
                                >
                                  <Icon name="Edit3" size={12} />
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Inline completion form */}
                          {isCompleting && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200"
                            >
                              <p className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-1.5">
                                <Icon name="Users" size={15} className="text-emerald-600" />
                                Record Attendance for "{session.activities?.name}"
                              </p>
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 8"
                                    value={completingEngaged}
                                    onChange={(e) => setCompletingEngaged(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Not Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="e.g. 2"
                                    value={completingNotEngaged}
                                    onChange={(e) => setCompletingNotEngaged(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  disabled={completingSaving}
                                  onClick={async () => {
                                    setCompletingSaving(true);
                                    let error = null;
                                    try {
                                      await updateActivitySession({
                                        sessionId: session.id,
                                        status: 'completed',
                                        location: session.location || null,
                                        notes: session.notes || null,
                                        participantsEngaged: completingEngaged !== '' ? parseInt(completingEngaged, 10) : 0,
                                        participantsNotEngaged: completingNotEngaged !== '' ? parseInt(completingNotEngaged, 10) : 0,
                                        completedAt: new Date().toISOString(),
                                      });
                                    } catch (updateError) {
                                      error = updateError;
                                    }
                                    setCompletingSaving(false);
                                    if (!error) {
                                      writeAuditLog({
                                        tableName: 'activity_sessions',
                                        recordId: session.id,
                                        action: 'COMPLETE',
                                        newValues: {
                                          status: 'completed',
                                          activity_name: session.activity_name || session.name || 'Session',
                                          participants_engaged: completingEngaged !== '' ? parseInt(completingEngaged, 10) : 0,
                                          participants_not_engaged: completingNotEngaged !== '' ? parseInt(completingNotEngaged, 10) : 0,
                                        },
                                      });
                                      setCompletingSessionId(null);
                                      await refreshActivities();
                                    } else {
                                      console.error('Failed to complete session:', error);
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-300"
                                >
                                  <Icon name="Check" size={14} />
                                  {completingSaving ? 'Saving…' : 'Confirm Completion'}
                                </button>
                                <button
                                  onClick={() => setCompletingSessionId(null)}
                                  className="px-4 py-2.5 bg-white/80 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-sm font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* Inline edit form — for any status including completed */}
                          {isEditing && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200"
                            >
                              <p className="text-sm font-bold text-violet-800 mb-3 flex items-center gap-1.5">
                                <Icon name="Edit3" size={15} className="text-violet-600" />
                                Edit Session — "{session.activities?.name}"
                              </p>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                {/* Status */}
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                  <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                  </select>
                                </div>
                                {/* Location */}
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Garden, Main Hall"
                                    value={editForm.location}
                                    onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mb-3">
                                {/* Engaged */}
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={editForm.participants_engaged}
                                    onChange={(e) => setEditForm(f => ({ ...f, participants_engaged: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                                {/* Not Engaged */}
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 mb-1">Not Engaged</label>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={editForm.participants_not_engaged}
                                    onChange={(e) => setEditForm(f => ({ ...f, participants_not_engaged: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                  />
                                </div>
                              </div>

                              {/* Notes */}
                              <div className="mb-3">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                                <textarea
                                  rows={2}
                                  placeholder="Session notes..."
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  disabled={editSaving}
                                  onClick={async () => {
                                    setEditSaving(true);
                                    const updates = {
                                      status: editForm.status,
                                      location: editForm.location || null,
                                      notes: editForm.notes || null,
                                      participants_engaged: editForm.participants_engaged !== '' ? parseInt(editForm.participants_engaged, 10) : null,
                                      participants_not_engaged: editForm.participants_not_engaged !== '' ? parseInt(editForm.participants_not_engaged, 10) : null,
                                    };
                                    if (editForm.status === 'completed' && !session.completed_at) {
                                      updates.completed_at = new Date().toISOString();
                                    } else if (editForm.status !== 'completed') {
                                      updates.completed_at = null;
                                    }
                                    let error = null;
                                    try {
                                      await updateActivitySession({
                                        sessionId: session.id,
                                        status: updates.status,
                                        location: updates.location,
                                        notes: updates.notes,
                                        participantsEngaged: updates.participants_engaged,
                                        participantsNotEngaged: updates.participants_not_engaged,
                                        completedAt: updates.completed_at ?? null,
                                      });
                                    } catch (updateError) {
                                      error = updateError;
                                    }
                                    setEditSaving(false);
                                    if (!error) {
                                      const auditAction = updates.status === 'completed' ? 'COMPLETE' : updates.status === 'cancelled' ? 'CANCEL' : 'UPDATE';
                                      writeAuditLog({
                                        tableName: 'activity_sessions',
                                        recordId: session.id,
                                        action: auditAction,
                                        newValues: {
                                          status: updates.status,
                                          activity_name: session.activity_name || session.name || 'Session',
                                          location: updates.location,
                                          notes: updates.notes,
                                          participants_engaged: updates.participants_engaged,
                                          participants_not_engaged: updates.participants_not_engaged,
                                        },
                                      });
                                      setEditingSessionId(null);
                                      await refreshActivities();
                                    } else {
                                      console.error('Failed to update session:', error);
                                    }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all duration-300"
                                >
                                  <Icon name="Save" size={14} />
                                  {editSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button
                                  onClick={() => setEditingSessionId(null)}
                                  className="px-4 py-2.5 bg-white/80 border border-slate-200 text-slate-600 hover:bg-white rounded-xl text-sm font-medium transition-colors"
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
              )}
            </motion.div>
          </motion.div>

          {/* Calendar Widget Column */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <ModernCalendar testDate={testDate} careHomeId={selectedDashCareHomeId || careHomeId} />
          </motion.div>
        </div>
      </main>

      {/* Schedule Calendar Section */}
      <motion.main 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="max-w-7xl mx-auto px-4 py-8"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mb-8"
        >
          <ScheduleCalendar
            careHomes={
              canViewAllHomes
                ? (realCareHomes.length > 0 ? realCareHomes : (careHomeId ? [{ id: careHomeId, name: 'My Care Home' }] : []))
                : (careHomeId ? realCareHomes.filter(h => h.id === careHomeId) || [{ id: careHomeId, name: 'My Care Home' }] : [])
            }
            initialCareHomeId={isCareHomeManager ? careHomeId : (selectedDashCareHomeId || careHomeId || realCareHomes[0]?.id)}
            isLoading={careHomeLoading}
            isAdmin={canViewAllHomes}
          />
        </motion.div>
      </motion.main>

      <AnimatePresence>
        {isModalOpen && (
          <ActivityDetailsModal
            isOpen={isModalOpen}
            activity={selectedActivity}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedActivity(null);
            }}
            onMarkComplete={async ({ participants_engaged, participants_not_engaged }) => {
              if (!selectedActivity?.id) return;
              let error = null;
              try {
                await updateActivitySession({
                  sessionId: selectedActivity.id,
                  status: 'completed',
                  location: selectedActivity.location || null,
                  notes: selectedActivity.notes || null,
                  participantsEngaged: participants_engaged ?? 0,
                  participantsNotEngaged: participants_not_engaged ?? 0,
                  completedAt: new Date().toISOString(),
                });
              } catch (updateError) {
                error = updateError;
              }
              if (error) {
                console.error('Failed to mark session complete:', error);
              } else {
                writeAuditLog({
                  tableName: 'activity_sessions',
                  recordId: selectedActivity.id,
                  action: 'COMPLETE',
                  newValues: {
                    status: 'completed',
                    activity_name: selectedActivity.activity_name || selectedActivity.name || 'Session',
                    participants_engaged: participants_engaged ?? 0,
                    participants_not_engaged: participants_not_engaged ?? 0,
                  },
                });
                setIsModalOpen(false);
                setSelectedActivity(null);
                await refreshActivities();
              }
            }}
            onEdit={() => {
              console.log('Edit activity:', selectedActivity?.id);
              setIsModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Compact Date/Time Testing Panel */}
      <motion.div 
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.8, duration: 0.6, type: "spring", stiffness: 300 }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 min-w-64">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700">🧪 Date Testing</h4>
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showTestPanel ? '−' : '+'}
            </button>
          </div>

          {showTestPanel && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Override Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={testDate ? testDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setTestDate(date);
                  }}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setTestDate(null)}
                  className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setTestDate(new Date())}
                  className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                >
                  Now
                </button>
              </div>
              {testDate && (
                <p className="text-xs text-gray-500 text-center">
                  Testing: {testDate.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Fixed TV Display Button */}
      <motion.div 
        className="fixed bottom-8 right-8 z-40"
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 0.9, duration: 0.8, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.button
          onClick={() => navigate('/tv-display-control')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
          title="Open TV Display Control Panel"
          whileHover={{ 
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            y: -2
          }}
        >
          <Icon name="Tv" size={20} />
          <span className="text-sm">TV Display</span>
        </motion.button>
      </motion.div>
    </div>
  );
};

export default MainDashboard;
