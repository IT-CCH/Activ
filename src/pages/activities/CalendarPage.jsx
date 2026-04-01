import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import ActivityMediaCarousel from '../../components/activities/ActivityMediaCarousel';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import sanitizeHtml from '../../utils/sanitizeHtml';
import { writeAuditLog } from '../../services/activityAuditService';

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString) */
const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarPage = () => {
  const { user, careHomeId, isAdmin, isSuperAdmin, isOrgAdmin, isCareHomeManager, organizationId } = useAuth();
  const mouseDownOnBackdrop = useRef(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledActivities, setScheduledActivities] = useState([]);
  const [todayActivities, setTodayActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showActivityDetail, setShowActivityDetail] = useState(null);
  const [activityDetailMedia, setActivityDetailMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const activitySearchRef = useRef(null);

  // Multi-care-home support
  const [careHomes, setCareHomes] = useState([]);
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(careHomeId || '');
  const canViewAllHomes = isSuperAdmin || isOrgAdmin || isAdmin;
  const canViewOtherHomes = isCareHomeManager; // managers can peek at other homes

  const [scheduleFormData, setScheduleFormData] = useState({
    activity_id: '',
    session_date: '',
    start_time: '',
    end_time: '',
    location: '',
    notes: '',
    care_home_id: ''
  });

  const addOneHourToTime = (timeValue) => {
    if (!timeValue) return '';

    const [hours, minutes] = String(timeValue).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';

    const totalMinutes = (hours * 60) + minutes + 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;

    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  // Fetch care homes list for admins
  useEffect(() => {
    const fetchCareHomes = async () => {
      if (!canViewAllHomes && !canViewOtherHomes) return;
      try {
        const { data, error } = await supabase
          .from('care_homes')
          .select('id, name')
          .order('name');
        if (error) throw error;
        setCareHomes(data || []);
        // If admin has no careHomeId, default to first care home
        if (!selectedCareHomeId && data?.length > 0) {
          setSelectedCareHomeId(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching care homes:', err);
      }
    };
    fetchCareHomes();
  }, [canViewAllHomes, canViewOtherHomes]);

  // Set initial selectedCareHomeId from auth context
  useEffect(() => {
    if (careHomeId && !selectedCareHomeId) {
      setSelectedCareHomeId(careHomeId);
    }
  }, [careHomeId]);

  useEffect(() => {
    fetchData();
  }, [selectedCareHomeId, selectedDate]);

  useEffect(() => {
    fetchScheduledActivities();
  }, [currentDate, selectedCareHomeId]);

  // Fetch media when activity detail modal opens
  useEffect(() => {
    const fetchMedia = async () => {
      if (!showActivityDetail?.id) {
        setActivityDetailMedia([]);
        return;
      }
      setLoadingMedia(true);
      try {
        const { data, error } = await supabase
          .from('activity_media')
          .select('id, media_type, title, tagline, description, file_path, file_name, external_url, youtube_video_id, thumbnail_url, display_order, is_primary')
          .eq('activity_id', showActivityDetail.id)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true });
        if (!error && Array.isArray(data)) {
          setActivityDetailMedia(data);
        } else {
          setActivityDetailMedia([]);
        }
      } catch {
        setActivityDetailMedia([]);
      } finally {
        setLoadingMedia(false);
      }
    };
    fetchMedia();
  }, [showActivityDetail?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAllActivities(),
      fetchScheduledActivities(),
      fetchTodayActivities()
    ]);
    setLoading(false);
  };

  const fetchAllActivities = async () => {
    try {
      let query = supabase
        .from('activities')
        .select(`
          *,
          activity_categories(name, color_code)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setAllActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchScheduledActivities = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let query = supabase
        .from('activity_sessions')
        .select(`
          *,
          activities(
            id,
            name,
            image_url,
            activity_categories(name, color_code)
          )
        `)
        .gte('session_date', toLocalDateStr(startOfMonth))
        .lte('session_date', toLocalDateStr(endOfMonth));

      const effectiveId = selectedCareHomeId || careHomeId;
      if (effectiveId) {
        query = query.eq('care_home_id', effectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setScheduledActivities(data || []);
    } catch (err) {
      console.error('Error fetching scheduled activities:', err);
    }
  };

  const fetchTodayActivities = async () => {
    try {
      const today = toLocalDateStr(new Date());
      let query = supabase
        .from('activity_sessions')
        .select(`
          *,
          activities(
            id,
            name,
            description,
            objective,
            instructions,
            benefits,
            materials_needed,
            image_url,
            duration_minutes,
            max_participants,
            location,
            activity_categories(name, color_code)
          )
        `)
        .eq('session_date', today)
        .order('start_time');

      const effectiveId = selectedCareHomeId || careHomeId;
      if (effectiveId) {
        query = query.eq('care_home_id', effectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTodayActivities(data || []);
    } catch (err) {
      console.error('Error fetching today activities:', err);
    }
  };

  const handleScheduleActivity = async (e) => {
    e.preventDefault();
    try {
      const dateToUse = scheduleFormData.session_date || (selectedDate ? toLocalDateStr(selectedDate) : '');
      if (!dateToUse) {
        alert('Please select a date');
        return;
      }

      const selectedActivity = allActivities.find(a => a.id === scheduleFormData.activity_id);
      if (!selectedActivity) return;

      // Admins choose the care home in the modal; staff/managers use their own
      let care_home_id = scheduleFormData.care_home_id || selectedCareHomeId || careHomeId;
      if (!care_home_id) {
        const { data: fallback, error: chError } = await supabase
          .from('care_homes')
          .select('id')
          .limit(1)
          .single();
        if (!chError && fallback) care_home_id = fallback.id;
      }

      // Default end_time to one hour after the chosen start time.
      let endTime = scheduleFormData.end_time;
      if (!endTime && scheduleFormData.start_time) {
        endTime = addOneHourToTime(scheduleFormData.start_time);
      }

      const { data: insertedData, error } = await supabase
        .from('activity_sessions')
        .insert([{
          activity_id: scheduleFormData.activity_id,
          care_home_id: care_home_id,
          session_date: dateToUse,
          start_time: scheduleFormData.start_time,
          end_time: endTime || scheduleFormData.start_time,
          location: scheduleFormData.location || selectedActivity.location || '',
          status: 'scheduled',
          notes: scheduleFormData.notes || ''
        }])
        .select()
        .single();

      if (error) throw error;

      if (insertedData?.id) {
        writeAuditLog({ tableName: 'activity_sessions', recordId: insertedData.id, action: 'INSERT', newValues: insertedData });
      }

      setScheduleFormData({
        activity_id: '',
        session_date: '',
        start_time: '',
        end_time: '',
        location: '',
        notes: '',
        care_home_id: ''
      });
      setActivitySearch('');
      setShowScheduleModal(false);
      await fetchData();
    } catch (err) {
      console.error('Error scheduling activity:', err);
      alert('Failed to schedule activity: ' + err.message);
    }
  };

  // Calendar utility functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const getActivitiesForDate = (date) => {
    const dateStr = toLocalDateStr(date);
    return scheduledActivities.filter(session => session.session_date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const changeMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Activities Calendar
            </h1>
            <p className="text-gray-600">View and schedule activities for residents</p>

            {/* Care Home Selector for Admins / Managers */}
            {(canViewAllHomes || canViewOtherHomes) && careHomes.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Icon name="Building2" size={18} className="text-indigo-600" />
                  <span>Viewing:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {careHomes.map(ch => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedCareHomeId(ch.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        selectedCareHomeId === ch.id
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }`}
                    >
                      {ch.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Calendar Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-2xl shadow-xl p-4 md:p-5 mb-8 border border-indigo-100 max-w-4xl mx-auto"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-indigo-100 rounded-lg transition-all hover:scale-110"
              >
                <Icon name="ChevronLeft" size={20} className="text-indigo-600" />
              </button>
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-indigo-100 rounded-lg transition-all hover:scale-110"
              >
                <Icon name="ChevronRight" size={20} className="text-indigo-600" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {/* Day names */}
              {dayNames.map(day => (
                <div key={day} className="text-center font-bold text-indigo-700 py-1.5 text-xs md:text-sm">
                  {day}
                </div>
              ))}

              {/* Empty cells before month starts */}
              {[...Array(startingDayOfWeek)].map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {/* Calendar days */}
              {[...Array(daysInMonth)].map((_, index) => {
                const day = index + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayActivities = getActivitiesForDate(date);
                const hasActivities = dayActivities.length > 0;
                const isCurrentDay = isToday(date);
                const isSelected = isSameDay(date, selectedDate);

                return (
                  <motion.button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`aspect-square p-1 md:p-2 rounded-lg border-2 transition-all relative shadow-sm ${
                      isCurrentDay
                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-100 to-indigo-200 shadow-lg shadow-indigo-200'
                        : isSelected
                        ? 'border-purple-500 bg-gradient-to-br from-purple-100 to-purple-200 shadow-lg shadow-purple-200'
                        : hasActivities
                        ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-100 hover:from-emerald-100 hover:to-green-200 shadow-md'
                        : 'border-gray-200 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span
                        className={`text-sm md:text-base font-bold ${
                          isCurrentDay
                            ? 'text-indigo-700'
                            : isSelected
                            ? 'text-purple-700'
                            : hasActivities
                            ? 'text-emerald-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </span>
                      {hasActivities && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayActivities.slice(0, 3).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="w-1 h-1 rounded-full bg-emerald-600"
                            />
                          ))}
                          {dayActivities.length > 3 && (
                            <span className="text-[8px] font-bold text-emerald-600 ml-0.5">
                              +{dayActivities.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Selected Date Info */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border border-indigo-200 shadow-lg"
              >
                <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-base flex items-center gap-2">
                  <Icon name="Calendar" size={18} className="text-indigo-600" />
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                {getActivitiesForDate(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getActivitiesForDate(selectedDate).map(session => (
                      <motion.div
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-900 text-base">
                              {session.activities?.name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <Icon name="Clock" size={14} className="text-indigo-600" />
                              <span className="text-sm text-gray-600">
                                {session.start_time} - {session.end_time}
                              </span>
                            </div>
                          </div>
                          <span
                            className="px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                            style={{
                              backgroundColor:
                                session.activities?.activity_categories?.color_code + '30',
                              color: session.activities?.activity_categories?.color_code,
                              border: `2px solid ${session.activities?.activity_categories?.color_code}50`
                            }}
                          >
                            {session.activities?.activity_categories?.name}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 flex items-center gap-2">
                    <Icon name="Info" size={16} />
                    No activities scheduled
                  </p>
                )}
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
                >
                  <Icon name="Plus" size={20} />
                  Schedule Activity
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* Today's Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
              <Icon name="Star" size={28} className="text-yellow-500" />
              Today's Activities
            </h2>
            {todayActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todayActivities.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    onClick={() => setShowActivityDetail(session.activities)}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all border border-indigo-100"
                  >
                    {/* Session Image */}
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={
                          session.activities?.image_url ||
                          'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80'
                        }
                        alt={session.activities?.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm"
                          style={{
                            backgroundColor:
                              session.activities?.activity_categories?.color_code + 'dd',
                            color: '#ffffff'
                          }}
                        >
                          {session.activities?.activity_categories?.name}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center gap-2 text-white font-bold text-sm bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                          <Icon name="Clock" size={16} />
                          {session.start_time} - {session.end_time}
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                        {session.activities?.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {session.activities?.description}
                      </p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="flex items-center gap-1.5 bg-rose-50 px-3 py-2 rounded-lg">
                          <Icon name="MapPin" size={16} className="text-rose-500" />
                          <span className="font-semibold text-rose-700">
                            {session.location || 'Not specified'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-lg">
                          <Icon name="Users" size={16} className="text-blue-500" />
                          <span className="font-semibold text-blue-700">
                            {session.enrolled_count || 0} enrolled
                          </span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-16 text-center border border-gray-200"
              >
                <Icon name="Calendar" size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 text-xl font-semibold">No activities scheduled for today</p>
                <p className="text-gray-500 text-sm mt-2">Use the calendar above to schedule activities</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {showActivityDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownOnBackdrop.current = true; }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop.current) setShowActivityDetail(null);
              mouseDownOnBackdrop.current = false;
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onMouseDown={() => { mouseDownOnBackdrop.current = false; }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden"
            >
              {/* Modal Header with Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={
                    showActivityDetail.image_url ||
                    'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80'
                  }
                  alt={showActivityDetail.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <button
                  onClick={() => setShowActivityDetail(null)}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition shadow-lg"
                >
                  <Icon name="X" size={24} className="text-gray-800" />
                </button>
                <div className="absolute bottom-6 left-6 right-6">
                  <span
                    className="inline-block px-4 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm mb-3"
                    style={{
                      backgroundColor:
                        showActivityDetail.activity_categories?.color_code + 'dd',
                      color: '#ffffff'
                    }}
                  >
                    {showActivityDetail.activity_categories?.name}
                  </span>
                  <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                    {showActivityDetail.name}
                  </h2>
                </div>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 16rem)' }}>
                <div className="p-6 md:p-8 space-y-6">
                  {showActivityDetail.description && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="FileText" size={20} className="text-indigo-600" />
                        Description
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{showActivityDetail.description}</p>
                    </div>
                  )}
                  {showActivityDetail.objective && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Target" size={20} className="text-indigo-600" />
                        Objective
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{showActivityDetail.objective}</p>
                    </div>
                  )}
                  {showActivityDetail.instructions && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="ListChecks" size={20} className="text-indigo-600" />
                        How to Conduct
                      </h3>
                      <div className="space-y-2">
                        {showActivityDetail.instructions.split(/\r?\n/).filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="flex gap-2.5 text-sm text-gray-600">
                            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="leading-relaxed">{line.replace(/^\d+\.\s*/, '').trim()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showActivityDetail.materials_needed && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Package" size={20} className="text-indigo-600" />
                        Materials Needed
                      </h3>
                      <div className="space-y-1.5">
                        {showActivityDetail.materials_needed.split(/\r?\n/).filter(l => l.trim()).map((line, i) => (
                          <div key={i} className="text-sm text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                            {line.replace(/^\d+\.\s*/, '').trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showActivityDetail.benefits && (
                    <div>
                      <h3 className="font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 text-lg flex items-center gap-2">
                        <Icon name="Heart" size={20} className="text-indigo-600" />
                        Benefits
                      </h3>
                      <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(showActivityDetail.benefits) }} />
                    </div>
                  )}

                  {/* Media & References */}
                  {loadingMedia && (
                    <p className="text-xs text-gray-400">Loading media...</p>
                  )}
                  {activityDetailMedia.length > 0 && (
                    <ActivityMediaCarousel mediaItems={activityDetailMedia} />
                  )}

                  {/* Activity Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-xl">
                      <Icon name="Clock" size={24} className="text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Duration</p>
                        <p className="font-bold text-gray-900">{showActivityDetail.duration_minutes} minutes</p>
                      </div>
                    </div>
                    {showActivityDetail.max_participants && (
                      <div className="flex items-center gap-3 bg-purple-50 p-4 rounded-xl">
                        <Icon name="Users" size={24} className="text-purple-600" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Capacity</p>
                          <p className="font-bold text-gray-900">Max {showActivityDetail.max_participants}</p>
                        </div>
                      </div>
                    )}
                    {showActivityDetail.location && (
                      <div className="flex items-center gap-3 bg-green-50 p-4 rounded-xl">
                        <Icon name="MapPin" size={24} className="text-green-600" />
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Location</p>
                          <p className="font-bold text-gray-900">{showActivityDetail.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Close Button */}
                  <div className="flex gap-3 pt-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowActivityDetail(null)}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Activity Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) mouseDownOnBackdrop.current = true; }}
            onMouseUp={(e) => {
              if (e.target === e.currentTarget && mouseDownOnBackdrop.current) { setActivitySearch(''); setShowScheduleModal(false); }
              mouseDownOnBackdrop.current = false;
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onMouseDown={() => { mouseDownOnBackdrop.current = false; }}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Schedule Activity
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedDate
                      ? selectedDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Select date and time'}
                  </p>
                </div>
                <button
                  onClick={() => { setActivitySearch(''); setShowScheduleModal(false); }}
                  className="p-2 hover:bg-white rounded-xl transition shadow-sm"
                >
                  <Icon name="X" size={24} className="text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleScheduleActivity} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Care Home selector for Admins */}
                {canViewAllHomes && careHomes.length > 1 && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Building2" size={16} className="text-indigo-600" />
                      Schedule for Care Home *
                    </label>
                    <select
                      value={scheduleFormData.care_home_id || selectedCareHomeId}
                      onChange={e => setScheduleFormData({ ...scheduleFormData, care_home_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      required
                    >
                      {careHomes.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Icon name="Activity" size={16} className="text-indigo-600" />
                    Select Activity *
                  </label>
                  {/* Searchable activity combobox */}
                  <div className="relative">
                    <div className="relative">
                      <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        ref={activitySearchRef}
                        type="text"
                        placeholder="Type to search activities..."
                        value={activitySearch}
                        onChange={e => {
                          setActivitySearch(e.target.value);
                          setActivityDropdownOpen(true);
                          if (!e.target.value) {
                            setScheduleFormData({ ...scheduleFormData, activity_id: '', location: '' });
                          }
                        }}
                        onFocus={() => setActivityDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setActivityDropdownOpen(false), 150)}
                        className="w-full pl-9 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        autoComplete="off"
                      />
                      {activitySearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivitySearch('');
                            setScheduleFormData({ ...scheduleFormData, activity_id: '', location: '' });
                            activitySearchRef.current?.focus();
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      )}
                    </div>
                    {/* Hidden native input to satisfy required validation */}
                    <input type="hidden" value={scheduleFormData.activity_id} required />
                    {activityDropdownOpen && (() => {
                      const filtered = allActivities
                        .filter(a => a.status === 'active')
                        .filter(a => {
                          const q = activitySearch.toLowerCase();
                          return !q
                            || a.name.toLowerCase().includes(q)
                            || (a.activity_categories?.name || '').toLowerCase().includes(q)
                            || (a.description || '').toLowerCase().includes(q);
                        });
                      return filtered.length > 0 ? (
                        <ul className="absolute z-50 w-full mt-1 bg-white border-2 border-indigo-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                          {filtered.map(activity => (
                            <li
                              key={activity.id}
                              onMouseDown={() => {
                                setScheduleFormData({
                                  ...scheduleFormData,
                                  activity_id: activity.id,
                                  location: activity.location || ''
                                });
                                setActivitySearch(activity.name);
                                setActivityDropdownOpen(false);
                              }}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-indigo-50 transition-colors ${
                                scheduleFormData.activity_id === activity.id ? 'bg-indigo-50' : ''
                              }`}
                            >
                              {activity.image_url && (
                                <img src={activity.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{activity.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                  {activity.activity_categories?.name || 'Uncategorized'} &middot; {activity.duration_minutes} min
                                </p>
                              </div>
                              {scheduleFormData.activity_id === activity.id && (
                                <Icon name="Check" size={14} className="text-indigo-600 flex-shrink-0" />
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-500">
                          No activities match &ldquo;{activitySearch}&rdquo;
                        </div>
                      );
                    })()}
                  </div>
                  {/* Selected activity preview */}
                  {scheduleFormData.activity_id && (() => {
                    const sel = allActivities.find(a => a.id === scheduleFormData.activity_id);
                    if (!sel) return null;
                    return (
                      <div className="mt-3 flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                        {sel.image_url && (
                          <img src={sel.image_url} alt={sel.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{sel.name}</p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{sel.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {sel.activity_categories?.name && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                                backgroundColor: (sel.activity_categories.color_code || '#3B82F6') + '20',
                                color: sel.activity_categories.color_code || '#3B82F6'
                              }}>
                                {sel.activity_categories.name}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon name="Clock" size={12} /> {sel.duration_minutes} min
                            </span>
                            {sel.max_participants && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Icon name="Users" size={12} /> Max {sel.max_participants}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Icon name="Calendar" size={16} className="text-indigo-600" />
                    Date *
                  </label>
                  <input
                    type="date"
                    value={
                      scheduleFormData.session_date ||
                      (selectedDate ? toLocalDateStr(selectedDate) : '')
                    }
                    onChange={e =>
                      setScheduleFormData({ ...scheduleFormData, session_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Clock" size={16} className="text-indigo-600" />
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={scheduleFormData.start_time}
                      onChange={e => {
                        const startTime = e.target.value;
                        setScheduleFormData({
                          ...scheduleFormData,
                          start_time: startTime,
                          end_time: addOneHourToTime(startTime)
                        });
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon name="Clock" size={16} className="text-indigo-600" />
                      End Time
                    </label>
                    <input
                      type="time"
                      value={scheduleFormData.end_time}
                      onChange={e =>
                        setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      placeholder="Auto-filled to one hour later"
                    />
                    <p className="text-xs text-gray-400 mt-1">Auto-fills to one hour after the start time, but you can still change it.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Icon name="MapPin" size={16} className="text-indigo-600" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={scheduleFormData.location}
                    onChange={e =>
                      setScheduleFormData({ ...scheduleFormData, location: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="e.g., Main Hall"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Icon name="FileText" size={16} className="text-indigo-600" />
                    Notes
                  </label>
                  <textarea
                    value={scheduleFormData.notes}
                    onChange={e =>
                      setScheduleFormData({ ...scheduleFormData, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="Optional notes for this session"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setActivitySearch(''); setShowScheduleModal(false); }}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <Icon name="CalendarPlus" size={20} />
                    Schedule Activity
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CalendarPage;
