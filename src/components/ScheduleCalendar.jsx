import React, { useState, useEffect, useRef } from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';
import ActivityDetailsModal from './ActivityDetailsModal';
import supabase from '../services/supabaseClient';

const ScheduleCalendar = ({ careHomes = [], initialCareHomeId, isLoading = false, isAdmin = false }) => {
  // console.log('ScheduleCalendar: Component rendered', { careHomes, initialCareHomeId, isAdmin });

  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week' | 'month'
  const [selectedCareHome, setSelectedCareHome] = useState(() => {
    if (!isAdmin && initialCareHomeId) return initialCareHomeId;
    return 'all';
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredCell, setHoveredCell] = useState(null);
  const [showTodayFeedback, setShowTodayFeedback] = useState(false);
  const [activityData, setActivityData] = useState([]); // Real activity schedule data
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState(null); // Track which activity to show details for

  // Care home dropdown state
  const [isCareHomeDropdownOpen, setIsCareHomeDropdownOpen] = useState(false);

  // Horizontal scroll + swipe hint for monthly All Homes view
  const monthScrollRef = useRef(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);

  const getDateKey = (date) => {
    if (!(date instanceof Date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeSessionDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      return value.split('T')[0];
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : getDateKey(parsed);
  };

  const normalizeTimeValue = (value, fallback = '09:00') => {
    if (!value || typeof value !== 'string') return fallback;
    return value.slice(0, 5);
  };

  React.useEffect(() => {
    if (initialCareHomeId) {
      setSelectedCareHome(initialCareHomeId);
    }
  }, [initialCareHomeId]);

  React.useEffect(() => {
    if (!selectedCareHome && careHomes.length > 0) {
      setSelectedCareHome(initialCareHomeId || careHomes[0].id);
    }
  }, [selectedCareHome, initialCareHomeId, careHomes]);

  // Staff should never see the "All Homes" aggregate
  React.useEffect(() => {
    if (!isAdmin) {
      const fallbackId = initialCareHomeId || careHomes?.[0]?.id || null;
      if (fallbackId && selectedCareHome === 'all') {
        setSelectedCareHome(fallbackId);
      }
    }
  }, [isAdmin, careHomes, initialCareHomeId, selectedCareHome]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isCareHomeDropdownOpen && !event.target.closest('.care-home-dropdown')) {
        setIsCareHomeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCareHomeDropdownOpen]);

  // Fetch real activity data for current view period
  useEffect(() => {
    const fetchActivityData = async () => {
      setActivityData([]);

      if (careHomes.length === 0) {
        setLoadingActivities(false);
        return;
      }

      setLoadingActivities(true);

      try {
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

        // Fetch for selected care home(s)
        const careHomeIdsToFetch = (selectedCareHome === 'all'
          ? careHomes.map(ch => ch.id)
          : [selectedCareHome]
        ).filter(Boolean);

        const startStr = getDateKey(startDate);
        const endStr = getDateKey(endDate);

        // Build OR filter to include selected care homes AND global activities (null care_home_id)
        const orConditions = [
          ...careHomeIdsToFetch.map(id => `care_home_id.eq.${id}`),
          'care_home_id.is.null'
        ];
        const orFilter = orConditions.join(',');

        // Fetch activity sessions for the date range
        let query = supabase
          .from('activity_sessions')
          .select(`
            id,
            care_home_id,
            session_date,
            start_time,
            end_time,
            location,
            status,
            activities (
              id,
              name,
              description,
              duration_minutes,
              max_participants,
              image_url,
              activity_categories(name, color_code)
            )
          `)
          .gte('session_date', startStr)
          .lte('session_date', endStr)
          .order('start_time', { ascending: true });

        if (orFilter) {
          query = query.or(orFilter);
        }

        const { data: sessions, error: sessionsError } = await query;

        if (sessionsError) throw sessionsError;

        // Group sessions by date and time slots
        const groupedData = {};
        (sessions || []).forEach(session => {
          const dateKey = normalizeSessionDate(session.session_date);
          if (!dateKey) return;

          if (!groupedData[dateKey]) {
            groupedData[dateKey] = [];
          }

          // Determine time slot based on start time
          let timeSlot = 'Morning';
          const normalizedStartTime = normalizeTimeValue(session.start_time);
          const normalizedEndTime = normalizeTimeValue(session.end_time, normalizedStartTime);
          const hour = parseInt(normalizedStartTime.split(':')[0], 10);
          if (hour >= 12 && hour < 17) timeSlot = 'Afternoon';
          else if (hour >= 17) timeSlot = 'Evening';

          groupedData[dateKey].push({
            id: session.id,
            care_home_id: session.care_home_id || selectedCareHome || null,
            date: dateKey,
            time_slot: timeSlot,
            start_time: normalizedStartTime,
            end_time: normalizedEndTime,
            location: session.location,
            status: session.status,
            activity: session.activities,
            slot_kind: 'main' // All activities are main activities
          });
        });

        // Convert to array format expected by the calendar
        const activityArray = [];
        Object.keys(groupedData).forEach(date => {
          groupedData[date].forEach(activity => {
            activityArray.push(activity);
          });
        });

        setActivityData(activityArray);
      } catch (error) {
        console.error('ScheduleCalendar fetch error:', error);
        setActivityData([]);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivityData();
  }, [viewMode, currentDate, selectedCareHome, careHomes, isAdmin]);

  // Show swipe hint when entering monthly all-homes view; hide on interaction
  useEffect(() => {
    if (isAdmin && viewMode === 'month' && selectedCareHome === 'all') {
      setShowSwipeHint(true);
      const timer = setTimeout(() => setShowSwipeHint(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowSwipeHint(false);
    }
  }, [isAdmin, viewMode, selectedCareHome]);

  const handleMonthScroll = () => {
    if (showSwipeHint) setShowSwipeHint(false);
  };

  const smoothScrollBy = (delta) => {
    const el = monthScrollRef.current;
    if (!el) return;
    try {
      el.scrollBy({ left: delta, behavior: 'smooth' });
    } catch {
      el.scrollLeft += delta;
    }
    setShowSwipeHint(false);
  };

  // Mouse drag-to-scroll
  const handleMouseDown = (e) => {
    const el = monthScrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragStartScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e) => {
    const el = monthScrollRef.current;
    if (!el || !isDragging) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1; // multiplier for sensitivity
    el.scrollLeft = dragStartScrollLeftRef.current - walk;
  };

  const endDrag = () => setIsDragging(false);

  // Touch drag-to-scroll
  const touchStartXRef = useRef(0);
  const handleTouchStart = (e) => {
    const el = monthScrollRef.current;
    if (!el) return;
    setIsDragging(true);
    touchStartXRef.current = e.touches[0].pageX - el.offsetLeft;
    dragStartScrollLeftRef.current = el.scrollLeft;
  };
  const handleTouchMove = (e) => {
    const el = monthScrollRef.current;
    if (!el || !isDragging) return;
    const x = e.touches[0].pageX - el.offsetLeft;
    const walk = (x - touchStartXRef.current) * 1;
    el.scrollLeft = dragStartScrollLeftRef.current - walk;
  };
  const handleTouchEnd = () => setIsDragging(false);

  // Dynamic care home colors - cycle through color schemes
  const colorSchemes = [
    { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-400', accent: 'from-blue-400 to-blue-500', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    { bg: 'bg-teal-50 dark:bg-teal-950/20', border: 'border-teal-400', accent: 'from-teal-400 to-teal-500', badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300' },
    { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-400', accent: 'from-amber-400 to-amber-500', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    { bg: 'bg-pink-50 dark:bg-pink-950/20', border: 'border-pink-400', accent: 'from-pink-400 to-pink-500', badge: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300' }
  ];

  const getCareHomeColors = (index) => colorSchemes[index % colorSchemes.length];

  // Activity time slot configurations with colors and icons
  const timeSlotConfig = {
    Morning: { icon: '🌅', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/20', textColor: 'text-orange-700 dark:text-orange-300', time: '9:00 AM', label: 'Morning' },
    Afternoon: { icon: '☀️', color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/20', textColor: 'text-blue-700 dark:text-blue-300', time: '2:00 PM', label: 'Afternoon' },
    Evening: { icon: '🌆', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/20', textColor: 'text-purple-700 dark:text-purple-300', time: '6:00 PM', label: 'Evening' }
  };
  const timeSlotOrder = ['Morning', 'Afternoon', 'Evening'];

  // Generate dates for the current week
  const getWeekDates = (date) => {
    const week = [];
    const current = new Date(date);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    current.setDate(diff);

    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return week;
  };

  // Generate dates for the current month
  const getMonthDates = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const dates = [];
    const current = new Date(startDate);

    while (current <= lastDay || dates.length % 7 !== 0) {
      dates.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month
      });
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Navigation functions
  const navigateDay = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction);
      return newDate;
    });
  };

  const navigateWeek = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + (direction * 7));
      return newDate;
    });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setShowTodayFeedback(true);
    setTimeout(() => setShowTodayFeedback(false), 2000);
  };

  // Get current care home display name
  const getCurrentCareHomeName = () => {
    if (selectedCareHome === 'all') return 'All Homes';
    const careHome = careHomes.find(home => home.id === selectedCareHome);
    return careHome ? careHome.name : 'Select Care Home';
  };

  // Format date titles
  const formatDayTitle = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatWeekTitle = (date) => {
    const weekDates = getWeekDates(date);
    const start = weekDates[0];
    const end = weekDates[6];
    const startMonth = start.toLocaleDateString('en-GB', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-GB', { month: 'short' });
    const year = start.getFullYear();

    if (startMonth === endMonth) {
      return `${start.getDate()} - ${end.getDate()} ${startMonth} ${year}`;
    } else {
      return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${year}`;
    }
  };

  const formatMonthTitle = (date) => {
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long'
    });
  };

  // Get activities for a specific date and time slot
  const getActivitiesForDate = (date, timeSlot, careHomeId = null) => {
    const dateStr = getDateKey(date);
    return activityData.filter(activity =>
      activity.date === dateStr &&
      activity.time_slot === timeSlot &&
      (!careHomeId || activity.care_home_id === careHomeId)
    );
  };

  // Render helper to show activities for a date
  const renderActivitiesForDate = (date, timeSlot, careHomeId = null) => {
    const activities = getActivitiesForDate(date, timeSlot, careHomeId);
    if (activities.length === 0) return <span className="text-slate-400">—</span>;

    return (
      <div className="whitespace-normal break-normal leading-snug">
        {activities.slice(0, 2).map((activity, idx) => (
          <div
            key={activity.id}
            className="font-medium flex items-start gap-1 mb-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-xs"
            onClick={() => setSelectedActivityDetail(activity)}
            title="Click to view details"
          >
            <span className="truncate leading-tight">{activity.activity?.name || 'Unknown Activity'}</span>
            {activity.status === 'completed' && (
              <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded-full flex-shrink-0">✓</span>
            )}
          </div>
        ))}
        {activities.length > 2 && (
          <div className="text-xs text-slate-500">+{activities.length - 2} more</div>
        )}
      </div>
    );
  };

  // Detailed render for activities
  const renderActivitiesForDateDetailed = (date, timeSlot, careHomeId = null) => {
    const activities = getActivitiesForDate(date, timeSlot, careHomeId);
    if (activities.length === 0) return <span className="text-slate-400">—</span>;

    return (
      <div className="whitespace-normal break-normal leading-snug">
        {activities.map((activity, idx) => (
          <div
            key={activity.id}
            className="mb-2 last:mb-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded transition-colors"
            onClick={() => setSelectedActivityDetail(activity)}
            title="Click to view details"
          >
            <div className="font-semibold flex items-start gap-2">
              <span>{activity.activity?.name || 'Unknown Activity'}</span>
              {activity.status === 'completed' && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
              )}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {activity.start_time} - {activity.end_time}
              {activity.location && ` • ${activity.location}`}
            </div>
            {activity.activity?.category && (
              <div className="text-xs text-slate-500 mt-0.5">{activity.activity.category}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);
  const filteredCareHomes = selectedCareHome === 'all' ? careHomes : careHomes.filter(ch => ch.id === selectedCareHome);

  if (isLoading || loadingActivities) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span>📅</span>
              Activity Schedule Calendar
            </h2>
            <p className="text-indigo-100 mt-1">
              {viewMode === 'day' && formatDayTitle(currentDate)}
              {viewMode === 'week' && `Week of ${formatWeekTitle(currentDate)}`}
              {viewMode === 'month' && formatMonthTitle(currentDate)}
            </p>
          </div>

          {/* Care Home Selector */}
          {isAdmin && careHomes.length > 1 && (
            <div className="relative care-home-dropdown">
              <button
                onClick={() => setIsCareHomeDropdownOpen(!isCareHomeDropdownOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                <div className="w-5 h-5 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Icon name="Building2" size={12} className="text-white" />
                </div>
                <span className="truncate max-w-32">{getCurrentCareHomeName()}</span>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className={`transition-transform duration-300 ${isCareHomeDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isCareHomeDropdownOpen && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                  <div className="py-2">
                    {/* All Homes Option */}
                    <button
                      onClick={() => {
                        setSelectedCareHome('all');
                        setIsCareHomeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-3 ${
                        selectedCareHome === 'all' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Icon name="Building2" size={14} className="text-white" />
                      </div>
                      <span className="font-medium">All Homes</span>
                      {selectedCareHome === 'all' && (
                        <Icon name="Check" size={16} className="ml-auto text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>

                    {/* Individual Care Homes */}
                    {careHomes.map(home => (
                      <button
                        key={home.id}
                        onClick={() => {
                          setSelectedCareHome(home.id);
                          setIsCareHomeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 flex items-center gap-3 ${
                          selectedCareHome === home.id ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
                          <Icon name="Home" size={14} className="text-white" />
                        </div>
                        <span className="font-medium truncate">{home.name}</span>
                        {selectedCareHome === home.id && (
                          <Icon name="Check" size={16} className="ml-auto text-indigo-600 dark:text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-white/20 rounded-full p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                viewMode === 'day'
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              📅 Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                viewMode === 'week'
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              📅 Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                viewMode === 'month'
                  ? 'bg-white text-indigo-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              📅 Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex bg-white/20 rounded-full p-1">
            <button
              onClick={() => viewMode === 'day' ? navigateDay(-1) : viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
              className="p-2 rounded-full hover:bg-white/20 transition-all text-white"
            >
              <Icon name="ChevronLeft" size={20} />
            </button>
            <button
              onClick={goToToday}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                showTodayFeedback
                  ? 'bg-green-500 text-white shadow-xl scale-110'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {showTodayFeedback ? '✓ Today' : viewMode === 'day' ? 'Today' : viewMode === 'week' ? 'This Week' : 'This Month'}
            </button>
            <button
              onClick={() => viewMode === 'day' ? navigateDay(1) : viewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
              className="p-2 rounded-full hover:bg-white/20 transition-all text-white"
            >
              <Icon name="ChevronRight" size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Day View */}
      {!isLoading && viewMode === 'day' && (
        <div className="p-6">
          {selectedCareHome !== 'all' && filteredCareHomes.map((careHome) => (
            <div key={careHome.id} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {timeSlotOrder.map((timeSlot) => {
                  const cfg = timeSlotConfig[timeSlot];
                  const activities = getActivitiesForDate(currentDate, timeSlot, careHome.id);
                  return (
                    <div
                      key={timeSlot}
                      className={`rounded-xl border border-slate-200 dark:border-slate-700 p-4 ${cfg.bgColor} ${cfg.textColor}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{cfg.icon}</span>
                        <span className="font-semibold">{cfg.label}</span>
                        <span className="text-sm opacity-75">{cfg.time}</span>
                      </div>
                      <div className="space-y-2">
                        {activities.length === 0 ? (
                          <p className="text-sm text-slate-500">No activities scheduled</p>
                        ) : (
                          activities.map((activity) => (
                            <div key={activity.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-sm">{activity.activity?.name}</h4>
                                {activity.status === 'completed' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                <p>{activity.start_time} - {activity.end_time}</p>
                                {activity.location && <p>{activity.location}</p>}
                                {activity.activity?.category && <p>{activity.activity.category}</p>}
                              </div>
                              <button
                                onClick={() => setSelectedActivityDetail(activity)}
                                className="mt-2 px-3 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 transition-colors"
                              >
                                View Details
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* All Homes Day View */}
          {isAdmin && selectedCareHome === 'all' && (
            <div className="space-y-6">
              {timeSlotOrder.map((timeSlot) => {
                const cfg = timeSlotConfig[timeSlot];
                return (
                  <div key={timeSlot} className="rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className={`px-6 py-4 bg-gradient-to-r ${cfg.color} text-white font-bold flex items-center gap-2`}>
                      <span className="text-xl">{cfg.icon}</span>
                      {cfg.label} - {cfg.time}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredCareHomes.map((careHome) => (
                        <div
                          key={careHome.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 cursor-pointer hover:shadow-lg transition-all"
                        >
                          <h4 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">{careHome.name}</h4>
                          <div className="space-y-2">
                            {getActivitiesForDate(currentDate, timeSlot, careHome.id).map((activity) => (
                              <div key={activity.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h5 className="font-medium text-sm">{activity.activity?.name}</h5>
                                  {activity.status === 'completed' && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  {activity.start_time} - {activity.end_time}
                                  {activity.location && ` • ${activity.location}`}
                                </div>
                              </div>
                            ))}
                            {getActivitiesForDate(currentDate, timeSlot, careHome.id).length === 0 && (
                              <p className="text-sm text-slate-500 italic">No activities scheduled</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Week View */}
      {!isLoading && viewMode === 'week' && (
        <div className="p-6">
          {/* Single Care Home Week View */}
          {selectedCareHome !== 'all' && filteredCareHomes.map((careHome, chIdx) => (
            <div key={careHome.id} className="space-y-6">
              {timeSlotOrder.map((timeSlot) => {
                const config = timeSlotConfig[timeSlot];
                return (
                  <div key={timeSlot} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className={`px-6 py-4 bg-gradient-to-r ${config.color} text-white font-bold text-lg flex items-center gap-2`}>
                      <span className="text-xl">{config.icon}</span>
                      {config.label} – {config.time}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        <div className="grid grid-cols-8">
                          <div className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
                            {careHome.name}
                          </div>
                          {weekDates.map((date, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <div key={idx} className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-center ${
                                isToday ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                              }`}>
                                <div>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div className="text-xs opacity-80">{date.toLocaleDateString('en-GB', { day: 'numeric' })}</div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-8 border-t border-slate-200 dark:border-slate-700">
                          <div className="sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 font-bold text-sm text-slate-800 dark:text-slate-200">
                            Activities
                          </div>
                          {weekDates.map((date, cIdx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const cellKey = `${careHome.id}-${date.toISOString()}-${timeSlot}`;
                            const isHovered = hoveredCell === cellKey;
                            return (
                              <div
                                key={cIdx}
                                onMouseEnter={() => setHoveredCell(cellKey)}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`relative px-4 py-3 border-l border-slate-200 dark:border-slate-700 text-sm font-medium whitespace-normal break-normal leading-tight transition-all cursor-pointer ${
                                  isToday
                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                    : 'text-slate-800 dark:text-slate-200'
                                } ${isHovered ? 'shadow-lg scale-105 z-10 bg-slate-50 dark:bg-slate-700' : ''}`}
                              >
                                <div className="w-full">
                                  {renderActivitiesForDate(date, timeSlot, careHome.id)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* All Homes Week View */}
          {isAdmin && selectedCareHome === 'all' && (
            <div className="space-y-8">
              {timeSlotOrder.map((timeSlot) => {
                const config = timeSlotConfig[timeSlot];
                return (
                  <div key={timeSlot} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className={`px-6 py-4 bg-gradient-to-r ${config.color} text-white font-bold text-lg flex items-center gap-2`}>
                      <span className="text-xl">{config.icon}</span>
                      {config.label} – {config.time}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[900px]">
                        <div className="grid grid-cols-8">
                          <div className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shadow-lg px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
                            CARE HOME
                          </div>
                          {weekDates.map((date, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <div key={idx} className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-center ${
                                isToday ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
                              }`}>
                                <div>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div className="text-xs opacity-80">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                              </div>
                            );
                          })}
                        </div>

                        {filteredCareHomes.map((careHome, chIdx) => (
                          <div key={careHome.id} className="grid grid-cols-8 border-t border-slate-200 dark:border-slate-700">
                            <div className="sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-4 py-3 font-bold text-sm text-slate-800 dark:text-slate-200">
                              {careHome.name}
                            </div>
                            {weekDates.map((date, cIdx) => {
                              const isToday = date.toDateString() === new Date().toDateString();
                              const cellKey = `${careHome.id}-${date.toISOString()}-${timeSlot}`;
                              const isHovered = hoveredCell === cellKey;
                              return (
                                <div
                                  key={cIdx}
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`relative px-4 py-3 border-l border-slate-200 dark:border-slate-700 text-sm font-medium whitespace-normal break-normal leading-tight transition-all cursor-pointer ${
                                    isToday
                                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                      : 'text-slate-800 dark:text-slate-200'
                                  } ${isHovered ? 'shadow-lg scale-105 z-10' : ''}`}
                                >
                                  <div className="w-full">
                                    {renderActivitiesForDate(date, timeSlot, careHome.id)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Month View */}
      {!isLoading && viewMode === 'month' && (
        <div className="p-6">
          {/* Single Care Home Month View */}
          {selectedCareHome !== 'all' && filteredCareHomes.map((careHome) => (
            <div key={careHome.id}>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {monthDates.map(({ date, isCurrentMonth }, idx) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border transition-all duration-200 hover:shadow-lg overflow-hidden min-h-[120px] flex flex-col ${
                        isCurrentMonth
                          ? isToday
                            ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-2xl ring-2 ring-indigo-300 dark:ring-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 hover:shadow-lg'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      <div className={`px-3 py-2 border-b flex items-center justify-between ${
                        isToday
                          ? 'border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-600'
                          : isCurrentMonth
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700'
                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20'
                      }`}>
                        <div className={`text-center text-lg font-bold ${
                          isToday ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {date.getDate()}
                        </div>
                        {isToday && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isToday ? 'bg-white text-indigo-600' : ''}`}>
                            TODAY
                          </span>
                        )}
                      </div>

                      {isCurrentMonth && (
                        <div className="flex-1 p-3 space-y-2">
                          {timeSlotOrder.map((timeSlot) => {
                            const activities = getActivitiesForDate(date, timeSlot, careHome.id);
                            if (activities.length === 0) return null;

                            const cfg = timeSlotConfig[timeSlot];
                            return (
                              <div
                                key={timeSlot}
                                className={`text-xs p-2 rounded ${cfg.bgColor} ${cfg.textColor} cursor-pointer hover:opacity-80 transition-opacity`}
                                onClick={() => {
                                  if (activities.length > 0) {
                                    setSelectedActivityDetail(activities[0]);
                                  }
                                }}
                                title={`${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} - Click to view details`}
                              >
                                <div className="flex items-center gap-1 mb-1">
                                  <span>{cfg.icon}</span>
                                  <span className="font-medium">{activities.length}</span>
                                </div>
                                <div className="space-y-1">
                                  {activities.slice(0, 2).map((activity) => (
                                    <div key={activity.id} className="truncate text-xs">
                                      {activity.activity?.name}
                                    </div>
                                  ))}
                                  {activities.length > 2 && (
                                    <div className="text-xs opacity-75">+{activities.length - 2} more</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* All Homes Month View */}
          {isAdmin && selectedCareHome === 'all' && (
            <div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              <div
                ref={monthScrollRef}
                onScroll={handleMonthScroll}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`overflow-x-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div className="flex gap-4 min-w-max">
                  {filteredCareHomes.map((careHome, chIdx) => {
                    const colors = getCareHomeColors(chIdx);
                    return (
                      <div key={careHome.id} className="flex-1 min-w-[280px]">
                        <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 mb-4`}>
                          <h3 className="font-bold text-center text-slate-800 dark:text-slate-200">{careHome.name}</h3>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {monthDates.map(({ date, isCurrentMonth }, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <div
                                key={idx}
                                className={`rounded-lg border transition-all duration-200 overflow-hidden min-h-[100px] flex flex-col text-xs ${
                                  isCurrentMonth
                                    ? isToday
                                      ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-lg ring-1 ring-indigo-300 dark:ring-indigo-600'
                                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md'
                                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                                }`}
                              >
                                <div className={`px-2 py-1 border-b text-center font-bold ${
                                  isToday
                                    ? 'border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                    : isCurrentMonth
                                      ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-slate-400'
                                }`}>
                                  {date.getDate()}
                                </div>

                                {isCurrentMonth && (
                                  <div className="flex-1 p-2 space-y-1">
                                    {timeSlotOrder.map((timeSlot) => {
                                      const activities = getActivitiesForDate(date, timeSlot, careHome.id);
                                      if (activities.length === 0) return null;

                                      const cfg = timeSlotConfig[timeSlot];
                                      return (
                                        <div
                                          key={timeSlot}
                                          className={`text-xs p-1 rounded ${cfg.bgColor} ${cfg.textColor} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                                          onClick={() => {
                                            // Show the first activity details for this time slot
                                            if (activities.length > 0) {
                                              setSelectedActivityDetail(activities[0]);
                                            }
                                          }}
                                          title={`${activities.length} ${activities.length === 1 ? 'activity' : 'activities'} - Click to view details`}
                                        >
                                          {cfg.icon} {activities.length}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {showSwipeHint && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
                  👆 Swipe or drag to scroll horizontally
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Detail Modal */}
      <ActivityDetailsModal
        isOpen={!!selectedActivityDetail}
        activity={selectedActivityDetail ? {
          ...selectedActivityDetail,
          name: selectedActivityDetail.activity?.name,
          category: selectedActivityDetail.activity?.category,
          description: selectedActivityDetail.activity?.description,
          participants: selectedActivityDetail.activity?.max_participants || 0,
          duration: selectedActivityDetail.activity?.duration_minutes || 0,
          image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop', // Default activity image
          instructions: [], // Could be expanded later
          materials: [], // Could be expanded later
          suitabilityCriteria: [] // Could be expanded later
        } : null}
        onClose={() => setSelectedActivityDetail(null)}
      />
    </div>
  );
};

export default ScheduleCalendar;