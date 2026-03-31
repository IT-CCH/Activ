import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import supabase from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

/* helpers */
const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop',
];

const getStatusStyle = (status) => {
  const s = (status || 'scheduled').toLowerCase();
  if (s === 'completed') return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed', icon: 'CheckCircle' };
  if (s === 'cancelled') return { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelled', icon: 'XCircle' };
  if (s === 'in_progress' || s === 'in progress') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: 'PlayCircle' };
  return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Scheduled', icon: 'Clock' };
};

/* Live Clock (TV-sized) */
const TVClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : hour < 21 ? 'Good Evening' : 'Good Night';

  return (
    <div className="text-center">
      <motion.p
        className="text-white/80 text-2xl font-medium mb-1"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {greeting}
      </motion.p>
      <p className="text-white text-6xl font-bold font-mono tracking-wider drop-shadow-lg">{timeStr}</p>
    </div>
  );
};

/* Analog Clock (SVG) */
const AnalogClock = ({ size = 180 }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12;
  const secDeg = seconds * 6;
  const minDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;
  const c = size / 2;
  const r = c - 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto drop-shadow-xl">
      <circle cx={c} cy={c} r={r} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
      {[...Array(12)].map((_, i) => {
        const ang = i * 30;
        const x1 = c + Math.sin((ang * Math.PI) / 180) * (r - 10);
        const y1 = c - Math.cos((ang * Math.PI) / 180) * (r - 10);
        const x2 = c + Math.sin((ang * Math.PI) / 180) * r;
        const y2 = c - Math.cos((ang * Math.PI) / 180) * r;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.7)" strokeWidth={i % 3 === 0 ? 3 : 1} />;
      })}
      <line x1={c} y1={c} x2={c} y2={c - r * 0.5} stroke="white" strokeWidth="6" transform={`rotate(${hourDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c} x2={c} y2={c - r * 0.7} stroke="white" strokeWidth="4" transform={`rotate(${minDeg} ${c} ${c})`} strokeLinecap="round" />
      <line x1={c} y1={c + r * 0.15} x2={c} y2={c - r * 0.9} stroke="#ef4444" strokeWidth="2" transform={`rotate(${secDeg} ${c} ${c})`} strokeLinecap="round" />
      <circle cx={c} cy={c} r="5" fill="white" />
    </svg>
  );
};

/* Custom Slide (Right Panel - for birthday/special messages) */
const CustomSlide = ({ slide }) => {
  const bgGradients = {
    birthday: 'from-pink-600 via-rose-500 to-orange-400',
    celebration: 'from-amber-500 via-yellow-400 to-orange-400',
    announcement: 'from-violet-600 via-indigo-500 to-blue-500',
    holiday: 'from-emerald-600 via-green-500 to-teal-400',
    welcome: 'from-sky-500 via-cyan-400 to-teal-400',
    memorial: 'from-slate-600 via-gray-500 to-slate-400',
  };
  const emojis = {
    birthday: '🎂',
    celebration: '🎉',
    announcement: '📢',
    holiday: '🎄',
    welcome: '👋',
    memorial: '🕯️',
  };
  const bg = bgGradients[slide.category] || bgGradients.celebration;
  const emoji = emojis[slide.category] || '✨';

  return (
    <motion.div
      key={slide.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${bg}`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-white/20"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>
      <motion.div
        className="text-[120px] mb-4"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {slide.emoji || emoji}
      </motion.div>
      <motion.h2
        className="text-white text-6xl font-black text-center px-12 mb-4 drop-shadow-2xl leading-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {slide.title}
      </motion.h2>
      {slide.subtitle && (
        <motion.p
          className="text-white/90 text-3xl font-semibold text-center px-16 drop-shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {slide.subtitle}
        </motion.p>
      )}
      {slide.message && (
        <motion.p
          className="text-white/70 text-xl font-medium text-center px-20 mt-4 max-w-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {slide.message}
        </motion.p>
      )}
    </motion.div>
  );
};

/* Activity Slide (Right Panel) */
const ActivitySlide = ({ session, index }) => {
  if (!session) return null;
  const activity = session?.activities;
  const catColor = activity?.activity_categories?.color_code || '#7C3AED';
  const statusInfo = getStatusStyle(session?.status);
  const imgUrl = activity?.image_url || DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];

  return (
    <motion.div
      key={session.id}
      initial={{ opacity: 0, x: 80 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -80 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className="absolute inset-0 flex flex-col"
    >
      <div className="relative flex-1 overflow-hidden">
        <img
          src={imgUrl}
          alt={activity?.name || 'Activity'}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {activity?.activity_categories?.name && (
          <div className="absolute top-6 left-6">
            <span className="px-4 py-2 rounded-full text-white text-lg font-bold shadow-lg" style={{ backgroundColor: catColor }}>
              {activity.activity_categories.name}
            </span>
          </div>
        )}

        <div className="absolute top-6 right-6">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold shadow-lg ${statusInfo.bg} ${statusInfo.text}`}>
            <Icon name={statusInfo.icon} size={18} />
            {statusInfo.label}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <motion.h2
            className="text-white text-5xl font-black mb-3 drop-shadow-xl leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {activity?.name || 'Activity'}
          </motion.h2>

          <motion.div
            className="flex flex-wrap items-center gap-4 mb-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xl font-semibold">
              <Icon name="Clock" size={20} />
              {formatTime(session.start_time)}{session.end_time ? ` - ${formatTime(session.end_time)}` : ''}
            </span>

            <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xl font-semibold">
              <Icon name="MapPin" size={20} />
              {session.location || activity?.location || 'TBC'}
            </span>

            {activity?.duration_minutes && (
              <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xl font-semibold">
                <Icon name="Timer" size={20} />
                {activity.duration_minutes} min
              </span>
            )}
          </motion.div>

          {activity?.description && (
            <motion.p
              className="text-white/90 text-2xl leading-relaxed line-clamp-3 max-w-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {activity.description}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* Schedule Item (Left Panel) */
const ScheduleItem = ({ session, index, isActive }) => {
  const activity = session?.activities;
  const catColor = activity?.activity_categories?.color_code || '#7C3AED';
  const statusInfo = getStatusStyle(session.status);
  const isCompleted = (session.status || '').toLowerCase() === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4 }}
      className={`relative rounded-2xl border-2 p-4 transition-all duration-500 ${
        isActive
          ? 'border-white/60 bg-white/20 shadow-lg shadow-white/10 scale-[1.02]'
          : isCompleted
          ? 'border-emerald-400/30 bg-emerald-500/10'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      {isActive && (
        <motion.div
          className="absolute -left-1 top-3 bottom-3 w-1.5 rounded-full bg-white"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="absolute top-0 right-0 w-1 h-full rounded-r-2xl" style={{ backgroundColor: catColor }} />

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-center min-w-[70px]">
          <p className="text-white text-lg font-bold leading-none">{formatTime(session.start_time)}</p>
          {session.end_time && (
            <p className="text-white/50 text-sm mt-1">{formatTime(session.end_time)}</p>
          )}
        </div>

        <div className="w-px h-12 bg-white/20 flex-shrink-0 mt-1" />

        <div className="flex-1 min-w-0">
          <h4 className="text-white text-lg font-bold truncate leading-snug">{activity?.name || 'Activity'}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 text-white/60 text-sm">
              <Icon name="MapPin" size={12} />
              {session.location || activity?.location || 'TBC'}
            </span>
            {activity?.activity_categories?.name && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: catColor + '30', color: catColor }}>
                {activity.activity_categories.name}
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${statusInfo.bg} ${statusInfo.text}`}>
              <Icon name={statusInfo.icon} size={11} />
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* Main TV Display Component */
const TV_CHANNEL = 'tv-display-sync';

const TVDisplayModern = () => {
  const { careHomeId: authCareHomeId } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [now, setNow] = useState(new Date());
  const [slideInterval, setSlideInterval] = useState(12);
  const [paused, setPaused] = useState(false);
  const [careHomeId, setCareHomeId] = useState(authCareHomeId || null);
  const [customSlides, setCustomSlides] = useState([]);
  const scheduleRef = useRef(null);
  const channelRef = useRef(null);
  const activitiesRef = useRef([]);
  const fetchRef = useRef(null);
  const broadcastRef = useRef(null);

  /* activitiesRef is updated via allSlides effect below */

  /* Sync careHomeId from auth when it loads (if not already set by control panel) */
  useEffect(() => {
    if (authCareHomeId && !careHomeId) {
      setCareHomeId(authCareHomeId);
    }
  }, [authCareHomeId]);

  /* Load custom slides from localStorage on mount */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tv-custom-slides');
      if (saved) setCustomSlides(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  /* BroadcastChannel: receive commands from control panel (single setup, no stale closures) */
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(TV_CHANNEL);
      channelRef.current.onmessage = (e) => {
        const msg = e.data;
        if (!msg || !msg.type) return;
        const len = activitiesRef.current.length || 1;
        switch (msg.type) {
          case 'navigate':
            if (typeof msg.slide === 'number') setCurrentSlide(msg.slide);
            break;
          case 'next':
            setCurrentSlide((p) => (p + 1) % len);
            break;
          case 'prev':
            setCurrentSlide((p) => (p - 1 + len) % len);
            break;
          case 'pause':
            setPaused(true);
            break;
          case 'play':
            setPaused(false);
            break;
          case 'setInterval':
            if (typeof msg.interval === 'number' && msg.interval >= 3) setSlideInterval(msg.interval);
            break;
          case 'refresh':
            fetchRef.current?.();
            break;
          case 'setCareHome':
            setCareHomeId(msg.careHomeId || null);
            break;
          case 'setCustomSlides':
            if (Array.isArray(msg.slides)) {
              setCustomSlides(msg.slides);
              try { localStorage.setItem('tv-custom-slides', JSON.stringify(msg.slides)); } catch {}
            }
            break;
          case 'ping':
            broadcastRef.current?.();
            break;
          default:
            break;
        }
      };
    } catch { /* BroadcastChannel not supported */ }
    return () => { channelRef.current?.close(); };
  }, []); // empty deps — single setup, uses refs for current values

  /* Build combined slides list: activities + custom slides */
  const allSlides = useMemo(() => {
    const actSlides = activities.map((s, i) => ({ type: 'activity', data: s, idx: i }));
    const custSlides = customSlides
      .filter((s) => s.enabled !== false)
      .map((s) => ({ type: 'custom', data: s, idx: null }));
    return [...actSlides, ...custSlides];
  }, [activities, customSlides]);

  /* Keep total ref updated for BroadcastChannel handler */
  useEffect(() => { activitiesRef.current = allSlides; }, [allSlides]);

  const broadcastStatus = useCallback(() => {
    try {
      channelRef.current?.postMessage({
        type: 'status',
        slideIndex: currentSlide,
        totalSlides: allSlides.length,
        paused,
        interval: slideInterval,
        careHomeId,
        customSlides,
        activities: activities.map((s) => ({
          id: s.id,
          name: s.activities?.name,
          start_time: s.start_time,
          end_time: s.end_time,
          status: s.status,
          location: s.location || s.activities?.location,
          category: s.activities?.activity_categories?.name,
          categoryColor: s.activities?.activity_categories?.color_code,
          imageUrl: s.activities?.image_url,
        })),
      });
    } catch { /* ignore */ }
  }, [currentSlide, allSlides, activities, paused, slideInterval, careHomeId, customSlides]);

  /* keep broadcastRef current */
  useEffect(() => { broadcastRef.current = broadcastStatus; }, [broadcastStatus]);

  /* broadcast status whenever key state changes */
  useEffect(() => { broadcastStatus(); }, [broadcastStatus]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
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
        .eq('session_date', today);

      if (careHomeId) query = query.eq('care_home_id', careHomeId);

      const { data: sessions, error } = await query.order('start_time', { ascending: true });

      if (error) throw error;

      const normalized = (sessions || []).map((s) => ({
        ...s,
        status: s.completed_at ? 'completed' : (s.status || 'scheduled').toLowerCase(),
      }));

      setActivities(normalized);
      setCurrentSlide((prev) => Math.min(prev, Math.max(0, (normalized.length + customSlides.filter(s => s.enabled !== false).length || 1) - 1)));
    } catch (err) {
      console.error('[TVDisplay] Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  }, [careHomeId, customSlides]);

  /* Keep fetch ref current for BroadcastChannel handler */
  useEffect(() => { fetchRef.current = fetchActivities; }, [fetchActivities]);

  useEffect(() => {
    fetchActivities();
    const id = setInterval(fetchActivities, 120000);
    return () => clearInterval(id);
  }, [fetchActivities]);

  useEffect(() => {
    if (allSlides.length <= 1 || paused) return;
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allSlides.length);
    }, slideInterval * 1000);
    return () => clearInterval(id);
  }, [allSlides.length, slideInterval, paused]);

  useEffect(() => {
    if (!scheduleRef.current) return;
    const activeEl = scheduleRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentSlide]);

  const stats = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter((s) => s.status === 'completed').length;
    const pending = activities.filter((s) => ['scheduled', 'in_progress', 'in progress'].includes(s.status)).length;
    const engaged = activities.reduce((sum, s) => sum + (s.participants_engaged || 0), 0);
    return { total, completed, pending, engaged };
  }, [activities]);

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div data-persist className="fixed inset-0 flex bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/20 to-indigo-600/20 rounded-full blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-pink-600/15 to-orange-600/15 rounded-full blur-3xl"
          animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1.2, 1, 1.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* LEFT PANEL */}
      <div className="relative w-[40%] flex flex-col p-8 border-r border-white/10 overflow-hidden">
        <div className="text-center mb-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-violet-300 text-xl font-semibold uppercase tracking-widest mb-1">{dayName}</p>
            <h1 className="text-white text-4xl font-black mb-4 drop-shadow-lg">{dateStr}</h1>
          </motion.div>

          <AnalogClock size={160} />

          <div className="mt-4">
            <TVClock />
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-4" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'from-violet-500/30 to-violet-600/30', textColor: 'text-violet-300' },
            { label: 'Done', value: stats.completed, color: 'from-emerald-500/30 to-emerald-600/30', textColor: 'text-emerald-300' },
            { label: 'Pending', value: stats.pending, color: 'from-amber-500/30 to-amber-600/30', textColor: 'text-amber-300' },
            { label: 'Engaged', value: stats.engaged, color: 'from-sky-500/30 to-sky-600/30', textColor: 'text-sky-300' },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} backdrop-blur-sm rounded-xl px-2 py-2 text-center border border-white/10`}>
              <p className={`text-2xl font-black ${s.textColor}`}>{s.value}</p>
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Icon name="Calendar" size={16} className="text-white" />
          </div>
          <h2 className="text-white text-xl font-bold">Today's Schedule</h2>
          <span className="ml-auto text-white/40 text-sm font-medium">{allSlides.length} slides</span>
        </div>

        <div ref={scheduleRef} className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-violet-400 border-t-transparent animate-spin" />
              <p className="text-white/50 text-sm">Loading schedule...</p>
            </div>
          ) : activities.length === 0 && customSlides.filter(s => s.enabled !== false).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                <Icon name="Calendar" size={32} className="text-white/30" />
              </div>
              <p className="text-white/50 text-lg font-semibold">No activities today</p>
            </div>
          ) : (
            <>
              {activities.map((session, idx) => (
                <div key={session.id} data-active={idx === currentSlide ? 'true' : 'false'}>
                  <ScheduleItem session={session} index={idx} isActive={idx === currentSlide} />
                </div>
              ))}
              {customSlides.filter(s => s.enabled !== false).map((slide, idx) => {
                const slideIdx = activities.length + idx;
                return (
                  <div key={slide.id} data-active={slideIdx === currentSlide ? 'true' : 'false'}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * slideIdx, duration: 0.4 }}
                      className={`relative rounded-2xl border-2 p-4 transition-all duration-500 ${
                        slideIdx === currentSlide
                          ? 'border-white/60 bg-white/20 shadow-lg shadow-white/10 scale-[1.02]'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {slideIdx === currentSlide && (
                        <motion.div
                          className="absolute -left-1 top-3 bottom-3 w-1.5 rounded-full bg-white"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{slide.emoji || '✨'}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-lg font-bold truncate">{slide.title}</h4>
                          {slide.subtitle && <p className="text-white/50 text-sm truncate">{slide.subtitle}</p>}
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-300 capitalize">{slide.category || 'custom'}</span>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-white/20 text-xs font-medium">Activity Planner</p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative flex-1 overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <Icon name="AlertTriangle" size={64} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-400 text-2xl font-bold mb-2">Error Loading Activities</p>
              <p className="text-white/40 text-lg">{error}</p>
              <button onClick={() => { setError(null); setLoading(true); fetchActivities(); }} className="mt-4 px-6 py-2 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-500 transition-colors">
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-violet-400 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-white/50 text-xl">Loading activities...</p>
            </div>
          </div>
        ) : allSlides.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <Icon name="CalendarOff" size={80} className="text-white/20 mx-auto mb-6" />
              <p className="text-white/60 text-4xl font-bold">No Activities Scheduled</p>
              <p className="text-white/30 text-xl mt-2">Check back later for today's activities</p>
              <p className="text-white/20 text-sm mt-6">{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </motion.div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {(() => {
                const slide = allSlides[currentSlide] || allSlides[0];
                if (!slide) return null;
                if (slide.type === 'custom') {
                  return <CustomSlide key={`custom-${slide.data.id}`} slide={slide.data} />;
                }
                return (
                  <ActivitySlide
                    key={`activity-${slide.data?.id}`}
                    session={slide.data}
                    index={slide.idx}
                  />
                );
              })()}
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30 z-10">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-400 to-indigo-400"
                key={currentSlide}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: slideInterval, ease: 'linear' }}
              />
            </div>

            {allSlides.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {allSlides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`rounded-full transition-all duration-300 ${
                      idx === currentSlide
                        ? 'w-8 h-3 bg-white shadow-lg'
                        : s.type === 'custom'
                        ? 'w-3 h-3 bg-pink-400/60 hover:bg-pink-300'
                        : 'w-3 h-3 bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="absolute top-6 right-6 z-10">
              <span className="bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full text-lg font-bold">
                {currentSlide + 1} / {allSlides.length}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TVDisplayModern;
