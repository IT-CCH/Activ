import React, { useState, useEffect } from 'react';
import Icon from './AppIcon';
import { getHolidayInfo, getHolidaysForMonth, getAllHolidaysForDate } from '../utils/ukHolidays';
import { getWorldSpecialDaysForMonth, getWorldSpecialDaysForDate } from '../utils/worldSpecialDays';
import HolidayFactsModal from './HolidayFactsModal';
import supabase from '../services/supabaseClient';

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString) */
const toLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ModernCalendar = ({ testDate, careHomeId }) => {
  const [currentDate, setCurrentDate] = useState(testDate || new Date());
  const [viewMode, setViewMode] = useState('month'); // 'day', 'week', 'month'
  const [selectedHolidays, setSelectedHolidays] = useState([]);
  const [isFactsModalOpen, setIsFactsModalOpen] = useState(false);
  // Real sessions grouped by ISO date string
  const [sessions, setSessions] = useState({});

  // Function to get current date (with test date override)
  const getCurrentDate = () => {
    return testDate || new Date();
  };

  // Helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatFullDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getSpecialDaysForDate = (date) => {
    return [
      ...getAllHolidaysForDate(date),
      ...getWorldSpecialDaysForDate(date),
    ];
  };

  // Get week start (Monday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // Navigate functions
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // Fetch real sessions whenever the visible month or careHomeId changes
  useEffect(() => {
    const fetchSessions = async () => {
      if (!careHomeId) { setSessions({}); return; }
      try {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const end   = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
        const startStr = toLocalDateStr(start);
        const endStr   = toLocalDateStr(end);

        const { data, error } = await supabase
          .from('activity_sessions')
          .select(`id, session_date, start_time, end_time, status, location,
            activities(name, duration_minutes, activity_categories(name, color_code))`)
          .or(`care_home_id.eq.${careHomeId},care_home_id.is.null`)
          .gte('session_date', startStr)
          .lte('session_date', endStr)
          .order('start_time', { ascending: true });

        if (error) throw error;
        const grouped = {};
        (data || []).forEach(s => {
          const key = s.session_date;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
        });
        setSessions(grouped);
      } catch (err) {
        console.error('ModernCalendar sessions fetch error:', err);
      }
    };
    fetchSessions();
  }, [careHomeId, `${currentDate.getFullYear()}-${currentDate.getMonth()}`]);

  // Map a category name to a Tailwind color pair
  const getCategoryColor = (categoryName) => {
    const key = (categoryName || '').toLowerCase();
    if (key.includes('physical') || key.includes('exercise') || key.includes('yoga')) return 'bg-emerald-100 text-emerald-700';
    if (key.includes('art') || key.includes('craft') || key.includes('creative')) return 'bg-purple-100 text-purple-700';
    if (key.includes('music') || key.includes('sing')) return 'bg-pink-100 text-pink-700';
    if (key.includes('social') || key.includes('community')) return 'bg-blue-100 text-blue-700';
    if (key.includes('cogni') || key.includes('game') || key.includes('memory')) return 'bg-amber-100 text-amber-700';
    if (key.includes('therap')) return 'bg-teal-100 text-teal-700';
    if (key.includes('garden') || key.includes('outdoor')) return 'bg-lime-100 text-lime-700';
    return 'bg-violet-100 text-violet-700';
  };

  // Return real sessions for a given date as { time, name, color } objects
  const getActivitiesForDate = (date) => {
    const key = toLocalDateStr(date);
    return (sessions[key] || []).map(s => ({
      time: (s.start_time || '').substring(0, 5),
      name: s.activities?.name || 'Activity',
      color: getCategoryColor(s.activities?.activity_categories?.name),
    }));
  };

  // MONTH VIEW
  const MonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weeks = [];
    const monthHolidays = [
      ...getHolidaysForMonth(currentDate.getFullYear(), currentDate.getMonth() + 1),
      ...getWorldSpecialDaysForMonth(currentDate.getFullYear(), currentDate.getMonth() + 1),
    ];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div>
        {/* Month header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">{formatDate(currentDate)}</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous month"
            >
              <Icon name="ChevronLeft" size={20} className="text-slate-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next month"
            >
              <Icon name="ChevronRight" size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Day names header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center py-2 text-xs font-semibold text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIdx) => {
                const isToday = day && day.toDateString() === getCurrentDate().toDateString();
                const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
                const holidays = day ? getSpecialDaysForDate(day) : [];
                const holiday = holidays.length > 0 ? holidays[0] : null; // Primary holiday for styling
                const daySessions = day ? getActivitiesForDate(day) : [];
                const hasActivities = daySessions.length > 0;

                return (
                  <div
                    key={dayIdx}
                    className={`
                      aspect-square p-1 rounded-lg text-xs font-medium cursor-pointer transition-all relative group
                      ${!day ? 'bg-transparent' : ''}
                      ${holiday ? holiday.color + ' hover:shadow-md hover:scale-105' : (isToday ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-50 text-slate-700')}
                      ${!isCurrentMonth && day ? 'text-slate-300' : ''}
                      ${day && !isToday && !holiday ? 'hover:bg-purple-100 hover:text-purple-700' : ''}
                    `}
                    onClick={() => {
                      if (holidays.length > 0) {
                        setSelectedHolidays(holidays);
                        setIsFactsModalOpen(true);
                      }
                    }}
                    title={holidays.length > 0 ? `Click to learn more about ${holidays.map(h => h.name).join(', ')}` : ''}
                  >
                    {day && (
                      <div className="h-full flex flex-col items-center justify-center">
                        {holidays.length > 0 && (
                          <div className="flex flex-wrap justify-center">
                            {holidays.slice(0, 2).map((h, idx) => (
                              <span key={idx} className="text-sm leading-none animate-holiday-twinkle hover:animate-bounce transition-all duration-300">{h.emoji}</span>
                            ))}
                            {holidays.length > 2 && <span className="text-xs leading-none">+</span>}
                          </div>
                        )}
                        <span className={`font-semibold ${holidays.length > 0 ? 'text-xs' : ''}`}>{day.getDate()}</span>
                        {hasActivities && !isToday && (
                          <div className="flex gap-0.5 justify-center mt-0.5">
                            {daySessions.slice(0, 3).map((_, di) => (
                              <div key={di} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-purple-400'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {holidays.length > 0 && (
                      <div className="absolute left-1/2 transform -translate-x-1/2 -top-12 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                        <div className="relative">
                          {holidays.map(h => `${h.emoji} ${h.name}`).join(', ')}
                          {/* Arrow pointing down */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Holidays for this month */}
        {monthHolidays.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">🎉 Special Days This Month</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {monthHolidays.map((holiday, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedHolidays([holiday]);
                    setIsFactsModalOpen(true);
                  }}
                  className={`w-full flex items-center gap-2 text-xs p-2 rounded border-l-4 ${holiday.color} hover:shadow-md hover:scale-105 transition-all text-left`}
                >
                  <span className="text-lg animate-holiday-twinkle hover:animate-bounce transition-all duration-300">{holiday.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{holiday.name}</div>
                    <div className="text-xs text-slate-600">{formatDateShort(holiday.date)}</div>
                  </div>
                  <span className="text-xs opacity-60">📖</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick upcoming activities */}
        <div className="mt-4 pt-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Upcoming Activities</h4>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {(() => {
              const todayKey = toLocalDateStr(new Date());
              const upcomingDays = Object.keys(sessions)
                .filter(k => k >= todayKey)
                .sort()
                .slice(0, 5);
              const items = upcomingDays.flatMap(day =>
                (sessions[day] || []).map(s => ({
                  day,
                  time: (s.start_time || '').substring(0, 5),
                  name: s.activities?.name || 'Activity',
                  color: getCategoryColor(s.activities?.activity_categories?.name),
                }))
              ).slice(0, 8);
              if (items.length === 0) {
                return <p className="text-xs text-slate-400 text-center py-2">No upcoming activities scheduled</p>;
              }
              return items.map((activity, idx) => {
                const isToday = activity.day === todayKey;
                const dateLabel = isToday ? 'Today' : new Date(activity.day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${activity.color.split(' ')[0]}`}></div>
                    <span className={`font-medium flex-shrink-0 ${isToday ? 'text-purple-600' : 'text-slate-500'}`}>{dateLabel}</span>
                    <span className="text-slate-500 flex-shrink-0">{activity.time}</span>
                    <span className="text-slate-700 flex-1 truncate font-medium">{activity.name}</span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  };

  // WEEK VIEW
  const WeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays = getWeekDays(weekStart);

    return (
      <div className="w-full">
        {/* Week header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">
            {formatDateShort(weekStart)} - {formatDateShort(weekDays[6])}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous week"
            >
              <Icon name="ChevronLeft" size={20} className="text-slate-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next week"
            >
              <Icon name="ChevronRight" size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Week days - compact responsive layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {weekDays.map((day, idx) => {
            const isToday = day.toDateString() === getCurrentDate().toDateString();
            const activities = getActivitiesForDate(day);
            const holidays = getSpecialDaysForDate(day);
            const holiday = holidays.length > 0 ? holidays[0] : null;

            return (
              <div
                key={idx}
                className={`
                  p-3 rounded-lg border-2 transition-all cursor-pointer bg-white
                  ${holiday ? holiday.color + ' border-current shadow-md' : (isToday ? 'border-purple-600 bg-purple-50 shadow-md' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm')}
                  ${holiday ? 'hover:shadow-lg hover:scale-105' : ''}
                `}
                onClick={() => {
                  if (holidays.length > 0) {
                    setSelectedHolidays(holidays);
                    setIsFactsModalOpen(true);
                  }
                }}
                title={holidays.length > 0 ? `Click to learn more about ${holidays.map(h => h.name).join(', ')}` : ''}
              >
                {/* Day header - compact horizontal layout */}
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isToday || holiday ? 'text-slate-900' : 'text-slate-500'}`}>
                        {formatDayName(day)}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-purple-700' : holidays.length > 0 ? 'text-slate-900' : 'text-slate-900'}`}>
                        {day.getDate()}
                      </p>
                    </div>
                    {holidays.length > 0 && (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1">
                          {holidays.slice(0, 2).map((h, idx) => (
                            <span key={idx} className="text-base animate-holiday-twinkle hover:animate-bounce transition-all duration-300">{h.emoji}</span>
                          ))}
                        </div>
                        <p className="text-xs font-medium text-slate-700 text-center max-w-20 truncate" title={holidays.map(h => h.name).join(', ')}>
                          {holidays.map(h => h.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  {holidays.length > 0 && (
                    <span className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer">📖</span>
                  )}
                </div>

                {/* Activities for this day - compact horizontal layout */}
                <div className="space-y-1">
                  {activities.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {activities.map((activity, actIdx) => (
                        <div
                          key={actIdx}
                          className={`flex-shrink-0 p-2 rounded text-xs font-medium ${activity.color} border border-opacity-20 min-w-0 flex-1 max-w-full`}
                          title={`${activity.time} - ${activity.name}`}
                        >
                          <div className="font-semibold text-xs opacity-80">{activity.time}</div>
                          <div className="truncate text-xs leading-tight">{activity.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-slate-400 text-xs">No activities</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">📅 Week Overview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-slate-900">{weekDays.filter(day => getSpecialDaysForDate(day).length > 0).length}</div>
              <div className="text-slate-500">Special Days</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-slate-900">{weekDays.reduce((sum, day) => sum + getActivitiesForDate(day).length, 0)}</div>
              <div className="text-slate-500">Activities</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // DAY VIEW
  const DayView = () => {
    const activities = getActivitiesForDate(currentDate);
    const holidays = getSpecialDaysForDate(currentDate);
    const holiday = holidays.length > 0 ? holidays[0] : null;
    const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 10 PM

    return (
      <div>
        {/* Day header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {holidays.length > 0 && (
              <div className="flex gap-1">
                {holidays.slice(0, 3).map((h, idx) => (
                  <span key={idx} className="text-2xl animate-holiday-twinkle hover:animate-bounce transition-all duration-300">{h.emoji}</span>
                ))}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {formatFullDayName(currentDate)}, {formatDateShort(currentDate)}
              </h3>
              {holidays.length > 0 && (
                <p className="text-sm text-slate-600 font-semibold">
                  {holidays.map(h => h.name).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous day"
            >
              <Icon name="ChevronLeft" size={20} className="text-slate-600" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next day"
            >
              <Icon name="ChevronRight" size={20} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Holiday banner if applicable */}
        {holiday && (
          <button
            onClick={() => {
              setSelectedHolidays([holiday]);
              setIsFactsModalOpen(true);
            }}
            className={`p-4 rounded-lg mb-4 ${holiday.color} border-l-4 hover:shadow-lg hover:scale-105 transition-all text-left w-full`}
          >
            <p className="font-semibold text-sm mb-2">✨ Special Day - Click for facts!</p>
            <div className="text-xs space-y-1">
              {holiday.activities && holiday.activities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span>•</span>
                  <span>{activity}</span>
                </div>
              ))}
            </div>
          </button>
        )}

        {/* Timeline */}
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {hours.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const hourActivities = activities.filter((a) => a.time.startsWith(String(hour).padStart(2, '0')));

            return (
              <div key={hour} className="flex gap-3">
                <div className="w-12 text-xs font-semibold text-slate-500 text-right pt-2">
                  {String(hour % 12 || 12).padStart(2, '0')}:{String(0).padStart(2, '0')} {hour >= 12 ? 'PM' : 'AM'}
                </div>
                <div className="flex-1">
                  {hourActivities.length > 0 ? (
                    <div className="space-y-1">
                      {hourActivities.map((activity, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg text-xs font-medium ${activity.color} border-l-4`}
                        >
                          <div className="font-semibold">{activity.name}</div>
                          <div className="text-xs mt-1 opacity-75">{activity.time}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 border-l-2 border-gray-200"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      {/* View toggle buttons */}
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-6">
        <button
          onClick={() => setViewMode('day')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'day'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
          }`}
        >
          Day
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'week'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            viewMode === 'month'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
          }`}
        >
          Month
        </button>
      </div>

      {/* View content */}
      {viewMode === 'day' && <DayView />}
      {viewMode === 'week' && <WeekView />}
      {viewMode === 'month' && <MonthView />}

      {/* Holiday Facts Modal */}
      <HolidayFactsModal
        isOpen={isFactsModalOpen}
        holidays={selectedHolidays}
        onClose={() => {
          setIsFactsModalOpen(false);
          setSelectedHolidays([]);
        }}
      />
    </div>
  );
};

export default ModernCalendar;
