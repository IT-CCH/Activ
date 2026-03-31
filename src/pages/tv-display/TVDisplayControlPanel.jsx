import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/navigation/Header';
import Icon from '../../components/AppIcon';
import supabase from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const TV_CHANNEL = 'tv-display-sync';

const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const getStatusStyle = (status) => {
  const s = (status || 'scheduled').toLowerCase();
  if (s === 'completed') return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed', icon: 'CheckCircle' };
  if (s === 'cancelled') return { bg: 'bg-red-100', text: 'text-red-600', label: 'Cancelled', icon: 'XCircle' };
  if (s === 'in_progress' || s === 'in progress') return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: 'PlayCircle' };
  return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Scheduled', icon: 'Clock' };
};

const TVDisplayControlPanel = () => {
  const { isCareHomeManager, careHomeId: authCareHomeId } = useAuth();
  const [connected, setConnected] = useState(false);
  const [tvStatus, setTvStatus] = useState(null);
  const [careHomes, setCareHomes] = useState([]);
  const [selectedCareHome, setSelectedCareHome] = useState(isCareHomeManager ? (authCareHomeId || '') : '');
  const [slideInterval, setSlideInterval] = useState(12);
  const [localActivities, setLocalActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customSlides, setCustomSlides] = useState([]);
  const [showSlideEditor, setShowSlideEditor] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const channelRef = useRef(null);
  const pingRef = useRef(null);

  /* Load custom slides from localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tv-custom-slides');
      if (saved) setCustomSlides(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  /* BroadcastChannel setup */
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel(TV_CHANNEL);
      channelRef.current.onmessage = (e) => {
        const msg = e.data;
        if (msg?.type === 'status') {
          setConnected(true);
          setTvStatus(msg);
        }
      };
      // Ping the display to get initial status
      channelRef.current.postMessage({ type: 'ping' });
      // Periodic ping every 5 seconds
      pingRef.current = setInterval(() => {
        try {
          channelRef.current?.postMessage({ type: 'ping' });
        } catch { /* ignore */ }
      }, 5000);
    } catch { /* BroadcastChannel not supported */ }

    return () => {
      channelRef.current?.close();
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, []);

  // If no status for 10s, mark as disconnected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!tvStatus) setConnected(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [tvStatus]);

  /* Send commands to TV Display */
  const send = useCallback((msg) => {
    try { channelRef.current?.postMessage(msg); } catch { /* ignore */ }
  }, []);

  /* Fetch care homes for filter */
  useEffect(() => {
    const fetchCareHomes = async () => {
      try {
        const { data } = await supabase
          .from('care_homes')
          .select('id, name')
          .order('name', { ascending: true });
        setCareHomes(data || []);
        // Auto-select user's care home or first available for non-managers
        if (!isCareHomeManager && !selectedCareHome) {
          const defaultId = authCareHomeId || (data && data.length > 0 ? data[0].id : '');
          if (defaultId) {
            setSelectedCareHome(defaultId);
            send({ type: 'setCareHome', careHomeId: defaultId });
          }
        }
      } catch { /* ignore */ }
    };
    fetchCareHomes();
  }, []);

  /* Lock care home managers to their own care home */
  useEffect(() => {
    if (isCareHomeManager && authCareHomeId) {
      setSelectedCareHome(authCareHomeId);
      send({ type: 'setCareHome', careHomeId: authCareHomeId });
    }
  }, [isCareHomeManager, authCareHomeId, send]);

  /* Fetch activities locally for display in control panel */
  const fetchActivities = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('activity_sessions')
        .select(`
          id, activity_id, care_home_id, session_date, start_time, end_time,
          status, location, notes, participants_engaged, completed_at,
          activities (id, name, description, image_url, duration_minutes, location,
            activity_categories(name, color_code))
        `)
        .eq('session_date', today);

      if (selectedCareHome) query = query.eq('care_home_id', selectedCareHome);

      const { data: sessions, error } = await query.order('start_time', { ascending: true });
      if (error) throw error;

      const normalized = (sessions || []).map((s) => ({
        ...s,
        status: s.completed_at ? 'completed' : (s.status || 'scheduled').toLowerCase(),
      }));
      setLocalActivities(normalized);
    } catch (err) {
      console.error('[ControlPanel] Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCareHome]);

  useEffect(() => {
    fetchActivities();
    const id = setInterval(fetchActivities, 120000);
    return () => clearInterval(id);
  }, [fetchActivities]);

  const goToSlide = (index) => send({ type: 'navigate', slide: index });
  const nextSlide = () => send({ type: 'next' });
  const prevSlide = () => send({ type: 'prev' });
  const pauseSlides = () => send({ type: 'pause' });
  const playSlides = () => send({ type: 'play' });
  const refreshDisplay = () => { fetchActivities(); send({ type: 'refresh' }); };

  const updateInterval = (val) => {
    const n = Math.max(3, Math.min(120, parseInt(val) || 12));
    setSlideInterval(n);
    send({ type: 'setInterval', interval: n });
  };

  const updateCareHome = (id) => {
    setSelectedCareHome(id);
    send({ type: 'setCareHome', careHomeId: id || null });
  };

  const openTVDisplay = () => {
    window.open('/tv-display', '_blank', 'noopener,noreferrer');
  };

  /* Custom slides management */
  const saveCustomSlides = useCallback((slides) => {
    setCustomSlides(slides);
    try { localStorage.setItem('tv-custom-slides', JSON.stringify(slides)); } catch {}
    send({ type: 'setCustomSlides', slides });
  }, [send]);

  const addCustomSlide = (slide) => {
    const newSlide = {
      id: Date.now().toString(),
      title: slide.title || 'Untitled',
      subtitle: slide.subtitle || '',
      message: slide.message || '',
      category: slide.category || 'celebration',
      emoji: slide.emoji || '',
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    saveCustomSlides([...customSlides, newSlide]);
    setShowSlideEditor(false);
    setEditingSlide(null);
  };

  const updateCustomSlide = (updatedSlide) => {
    const updated = customSlides.map((s) => s.id === updatedSlide.id ? { ...s, ...updatedSlide } : s);
    saveCustomSlides(updated);
    setShowSlideEditor(false);
    setEditingSlide(null);
  };

  const deleteCustomSlide = (id) => {
    saveCustomSlides(customSlides.filter((s) => s.id !== id));
  };

  const toggleCustomSlide = (id) => {
    const updated = customSlides.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s);
    saveCustomSlides(updated);
  };

  const isPaused = tvStatus?.paused ?? false;
  const currentSlide = tvStatus?.slideIndex ?? 0;
  const enabledCustom = customSlides.filter((s) => s.enabled !== false);
  const totalSlides = tvStatus?.totalSlides ?? (localActivities.length + enabledCustom.length);
  const displayActivities = tvStatus?.activities ?? localActivities.map((s) => ({
    id: s.id,
    name: s.activities?.name,
    start_time: s.start_time,
    end_time: s.end_time,
    status: s.status,
    location: s.location || s.activities?.location,
    category: s.activities?.activity_categories?.name,
    categoryColor: s.activities?.activity_categories?.color_code,
    imageUrl: s.activities?.image_url,
  }));

  const stats = {
    total: localActivities.length,
    completed: localActivities.filter((s) => s.status === 'completed').length,
    pending: localActivities.filter((s) => ['scheduled', 'in_progress', 'in progress'].includes(s.status)).length,
    engaged: localActivities.reduce((sum, s) => sum + (s.participants_engaged || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Icon name="Monitor" size={20} className="text-white" />
              </div>
              TV Display Control Panel
            </h1>
            <p className="text-gray-500 text-sm mt-1">Control and monitor the TV display in real-time</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
              connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`}
                animate={connected ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {connected ? 'TV Connected' : 'TV Not Connected'}
            </div>

            <button
              onClick={openTVDisplay}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Icon name="ExternalLink" size={16} />
              Open TV Display
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-5">

            {/* Playback Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Icon name="Play" size={16} className="text-violet-500" />
                Playback Controls
              </h3>

              <div className="flex items-center justify-center gap-3 mb-5">
                <button
                  onClick={prevSlide}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all hover:scale-110"
                  title="Previous slide"
                >
                  <Icon name="SkipBack" size={20} />
                </button>

                <button
                  onClick={isPaused ? playSlides : pauseSlides}
                  className={`w-16 h-16 flex items-center justify-center rounded-2xl text-white shadow-lg transition-all hover:scale-110 ${
                    isPaused
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-emerald-300/50'
                      : 'bg-gradient-to-br from-amber-500 to-orange-600 hover:shadow-amber-300/50'
                  }`}
                  title={isPaused ? 'Play' : 'Pause'}
                >
                  <Icon name={isPaused ? 'Play' : 'Pause'} size={28} />
                </button>

                <button
                  onClick={nextSlide}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all hover:scale-110"
                  title="Next slide"
                >
                  <Icon name="SkipForward" size={20} />
                </button>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                {totalSlides > 0 ? (
                  <span className="font-semibold text-gray-700">
                    Slide {currentSlide + 1} of {totalSlides}
                  </span>
                ) : (
                  <span>No slides</span>
                )}
                {isPaused && (
                  <span className="ml-2 text-amber-600 font-medium">(Paused)</span>
                )}
              </div>

              {/* Slide Progress Dots */}
              {totalSlides > 1 && totalSlides <= 20 && (
                <div className="flex items-center justify-center gap-1.5 flex-wrap mb-4">
                  {Array.from({ length: totalSlides }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToSlide(i)}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentSlide
                          ? 'w-6 h-2.5 bg-violet-500 shadow-md'
                          : 'w-2.5 h-2.5 bg-gray-300 hover:bg-violet-300'
                      }`}
                      title={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Interval Control */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Auto-advance Interval
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="3"
                    max="60"
                    value={slideInterval}
                    onChange={(e) => updateInterval(e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-sm font-bold text-violet-600 min-w-[40px] text-right">
                    {slideInterval}s
                  </span>
                </div>
              </div>
            </div>

            {/* Care Home Filter */}
            {careHomes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icon name="Building2" size={16} className="text-violet-500" />
                  Care Home
                </h3>
                {isCareHomeManager ? (
                  <p className="text-sm font-medium text-gray-700 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                    {careHomes.find((ch) => ch.id === authCareHomeId)?.name || 'My Care Home'}
                  </p>
                ) : (
                  <select
                    value={selectedCareHome}
                    onChange={(e) => updateCareHome(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                  >
                    {careHomes.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Icon name="Zap" size={16} className="text-violet-500" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={refreshDisplay}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-violet-50 text-gray-700 hover:text-violet-700 border border-gray-200 hover:border-violet-200 transition-all text-sm font-medium"
                >
                  <Icon name="RefreshCw" size={16} />
                  Refresh Data
                </button>
                <button
                  onClick={openTVDisplay}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-violet-50 text-gray-700 hover:text-violet-700 border border-gray-200 hover:border-violet-200 transition-all text-sm font-medium"
                >
                  <Icon name="Maximize2" size={16} />
                  Open Fullscreen TV
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total', value: stats.total, icon: 'Calendar', color: 'violet' },
                { label: 'Completed', value: stats.completed, icon: 'CheckCircle', color: 'emerald' },
                { label: 'Pending', value: stats.pending, icon: 'Clock', color: 'amber' },
                { label: 'Engaged', value: stats.engaged, icon: 'Users', color: 'sky' },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name={s.icon} size={14} className={`text-${s.color}-500`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-black text-${s.color}-600`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Activity List + Preview */}
          <div className="lg:col-span-2 space-y-5">

            {/* Mini TV Preview */}
            <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden border-2 border-gray-800">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <span className="text-gray-400 text-xs font-mono flex-1 text-center">
                  TV Display Preview — {connected ? 'Live' : 'Offline'}
                </span>
              </div>

              <div className="flex h-[280px]">
                {/* Left preview panel */}
                <div className="w-[40%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 border-r border-white/10 flex flex-col items-center justify-center">
                  <p className="text-violet-300 text-[10px] font-semibold uppercase tracking-widest">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-white text-sm font-bold mt-1">
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-white/50 text-[10px] font-mono mt-2">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="mt-3 w-full space-y-1.5">
                    {displayActivities.slice(0, 4).map((a, i) => (
                      <div
                        key={a.id || i}
                        className={`px-2 py-1 rounded text-[9px] truncate ${
                          i === currentSlide
                            ? 'bg-white/20 text-white font-bold border border-white/30'
                            : 'bg-white/5 text-white/50'
                        }`}
                      >
                        {formatTime(a.start_time)} — {a.name || 'Activity'}
                      </div>
                    ))}
                    {displayActivities.length > 4 && (
                      <p className="text-white/30 text-[8px] text-center">
                        +{displayActivities.length - 4} more
                      </p>
                    )}
                  </div>
                </div>

                {/* Right preview panel */}
                <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden">
                  {(() => {
                    // Determine what's showing on the current slide
                    const actCount = displayActivities.length;
                    const enabledCust = customSlides.filter(s => s.enabled !== false);
                    const isCustomSlide = currentSlide >= actCount && enabledCust[currentSlide - actCount];
                    const customSlideData = isCustomSlide ? enabledCust[currentSlide - actCount] : null;
                    const actSlideData = !isCustomSlide && displayActivities[currentSlide] ? displayActivities[currentSlide] : null;

                    if (customSlideData) {
                      const previewBg = {
                        birthday: 'from-pink-500 via-rose-400 to-orange-300',
                        celebration: 'from-amber-400 via-yellow-300 to-orange-300',
                        announcement: 'from-violet-500 via-indigo-400 to-blue-400',
                        holiday: 'from-emerald-500 via-green-400 to-teal-300',
                        welcome: 'from-sky-400 via-cyan-300 to-teal-300',
                        memorial: 'from-slate-500 via-gray-400 to-slate-300',
                      };
                      return (
                        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${previewBg[customSlideData.category] || previewBg.celebration}`}>
                          <span className="text-3xl mb-1">{customSlideData.emoji || '\u2728'}</span>
                          <p className="text-white text-sm font-bold text-center px-3 leading-tight">{customSlideData.title}</p>
                          {customSlideData.subtitle && <p className="text-white/80 text-[10px] text-center px-3 mt-0.5">{customSlideData.subtitle}</p>}
                        </div>
                      );
                    }

                    if (actSlideData) {
                      return (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0"
                          >
                            {actSlideData.imageUrl ? (
                              <img src={actSlideData.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-violet-900 to-indigo-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <p className="text-white text-lg font-bold leading-tight">{actSlideData.name || 'Activity'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/70 text-[10px]">
                                  {formatTime(actSlideData.start_time)}
                                  {actSlideData.end_time ? ` - ${formatTime(actSlideData.end_time)}` : ''}
                                </span>
                                {actSlideData.location && (
                                  <span className="text-white/50 text-[10px]">{actSlideData.location}</span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      );
                    }

                    return (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-white/30 text-sm">No Slides</p>
                      </div>
                    );
                  })()}

                  {/* Slide counter */}
                  {totalSlides > 0 && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-black/50 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        {currentSlide + 1}/{totalSlides}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Activities List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Icon name="List" size={16} className="text-violet-500" />
                  Today's Activities
                  <span className="ml-2 px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full text-xs font-bold">
                    {localActivities.length}
                  </span>
                </h3>
                <button
                  onClick={refreshDisplay}
                  className="text-gray-400 hover:text-violet-500 transition-colors"
                  title="Refresh"
                >
                  <Icon name="RefreshCw" size={16} />
                </button>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-3 border-violet-400 border-t-transparent animate-spin" />
                  </div>
                ) : localActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <Icon name="Calendar" size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">No activities scheduled for today</p>
                  </div>
                ) : (
                  localActivities.map((session, idx) => {
                    const activity = session?.activities;
                    const catColor = activity?.activity_categories?.color_code || '#7C3AED';
                    const statusInfo = getStatusStyle(session.status);
                    const isCurrentSlide = idx === currentSlide;

                    return (
                      <motion.button
                        key={session.id}
                        onClick={() => goToSlide(idx)}
                        className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-all hover:bg-violet-50 ${
                          isCurrentSlide ? 'bg-violet-50 border-l-4 border-violet-500' : 'border-l-4 border-transparent'
                        }`}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                          {activity?.image_url ? (
                            <img
                              src={activity.image_url}
                              alt={activity?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ backgroundColor: catColor + '30' }}
                            >
                              <Icon name="Activity" size={20} style={{ color: catColor }} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold truncate ${isCurrentSlide ? 'text-violet-700' : 'text-gray-800'}`}>
                              {activity?.name || 'Activity'}
                            </h4>
                            {isCurrentSlide && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-0.5 bg-violet-500 text-white text-[10px] font-bold rounded-full"
                              >
                                NOW SHOWING
                              </motion.span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon name="Clock" size={11} />
                              {formatTime(session.start_time)}
                              {session.end_time ? ` - ${formatTime(session.end_time)}` : ''}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Icon name="MapPin" size={11} />
                              {session.location || activity?.location || 'TBC'}
                            </span>
                          </div>
                        </div>

                        {/* Category + Status */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {activity?.activity_categories?.name && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: catColor + '20', color: catColor }}
                            >
                              {activity.activity_categories.name}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusInfo.bg} ${statusInfo.text}`}>
                            <Icon name={statusInfo.icon} size={10} />
                            {statusInfo.label}
                          </span>
                        </div>

                        {/* Slide number */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCurrentSlide
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {idx + 1}
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Connection Info */}
            {!connected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Icon name="AlertTriangle" size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm">TV Display Not Connected</h4>
                    <p className="text-amber-600 text-xs mt-1">
                      Open the TV Display in a browser tab to establish a live connection.
                      The control panel and TV display must be open in the same browser.
                    </p>
                    <button
                      onClick={openTVDisplay}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <Icon name="ExternalLink" size={12} />
                      Open TV Display Now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Custom Slides Manager */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <Icon name="Sparkles" size={16} className="text-pink-500" />
                  Custom Slides
                  <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full text-xs font-bold">
                    {customSlides.length}
                  </span>
                </h3>
                <button
                  onClick={() => { setEditingSlide(null); setShowSlideEditor(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all hover:scale-105"
                >
                  <Icon name="Plus" size={14} />
                  Add Slide
                </button>
              </div>

              {customSlides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 flex items-center justify-center">
                    <Icon name="PartyPopper" size={28} className="text-pink-300" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No custom slides yet</p>
                  <p className="text-gray-300 text-xs max-w-xs text-center">
                    Add birthday celebrations, special announcements, or holiday messages that will appear on the TV display
                  </p>
                  <button
                    onClick={() => { setEditingSlide(null); setShowSlideEditor(true); }}
                    className="mt-2 flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-sm font-semibold hover:bg-pink-100 border border-pink-200 transition-all"
                  >
                    <Icon name="Plus" size={14} />
                    Create Your First Slide
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                  {customSlides.map((slide, idx) => {
                    const slideIdx = localActivities.length + idx;
                    const isShowing = slideIdx === currentSlide && slide.enabled !== false;
                    return (
                      <div
                        key={slide.id}
                        className={`flex items-center gap-3 px-5 py-3 transition-all ${
                          isShowing ? 'bg-pink-50 border-l-4 border-pink-500' : 'border-l-4 border-transparent hover:bg-gray-50'
                        } ${slide.enabled === false ? 'opacity-50' : ''}`}
                      >
                        <span className="text-2xl flex-shrink-0">{slide.emoji || '\u2728'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 text-sm truncate">{slide.title}</h4>
                            {isShowing && (
                              <span className="px-2 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full">NOW SHOWING</span>
                            )}
                          </div>
                          {slide.subtitle && <p className="text-gray-400 text-xs truncate">{slide.subtitle}</p>}
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 capitalize flex-shrink-0">
                          {slide.category || 'custom'}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => toggleCustomSlide(slide.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
                              slide.enabled !== false
                                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={slide.enabled !== false ? 'Disable' : 'Enable'}
                          >
                            <Icon name={slide.enabled !== false ? 'Eye' : 'EyeOff'} size={14} />
                          </button>
                          <button
                            onClick={() => { setEditingSlide(slide); setShowSlideEditor(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-violet-100 hover:text-violet-600 transition-all"
                            title="Edit"
                          >
                            <Icon name="Pencil" size={14} />
                          </button>
                          <button
                            onClick={() => { goToSlide(slideIdx); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-all"
                            title="Show on TV"
                          >
                            <Icon name="Monitor" size={14} />
                          </button>
                          <button
                            onClick={() => deleteCustomSlide(slide.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all"
                            title="Delete"
                          >
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Editor Modal */}
      <AnimatePresence>
        {showSlideEditor && (
          <SlideEditorModal
            slide={editingSlide}
            onSave={editingSlide ? updateCustomSlide : addCustomSlide}
            onClose={() => { setShowSlideEditor(false); setEditingSlide(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

/* Slide Editor Modal Component */
const SLIDE_CATEGORIES = [
  { id: 'birthday', label: 'Birthday', emoji: '\ud83c\udf82', color: 'bg-pink-100 text-pink-700' },
  { id: 'celebration', label: 'Celebration', emoji: '\ud83c\udf89', color: 'bg-amber-100 text-amber-700' },
  { id: 'announcement', label: 'Announcement', emoji: '\ud83d\udce2', color: 'bg-violet-100 text-violet-700' },
  { id: 'holiday', label: 'Holiday', emoji: '\ud83c\udf84', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'welcome', label: 'Welcome', emoji: '\ud83d\udc4b', color: 'bg-sky-100 text-sky-700' },
  { id: 'memorial', label: 'Memorial', emoji: '\ud83d\udd6f\ufe0f', color: 'bg-slate-100 text-slate-700' },
];

const EMOJI_OPTIONS = ['\ud83c\udf82', '\ud83c\udf89', '\ud83c\udf88', '\ud83c\udf81', '\u2764\ufe0f', '\ud83c\udf1f', '\ud83c\udf08', '\ud83c\udf3b', '\u2728', '\ud83c\udfb6', '\ud83e\udd73', '\ud83d\ude0a', '\ud83c\udfc6', '\ud83d\udc96', '\ud83c\udf1e', '\ud83c\udf3a', '\ud83e\udd70', '\ud83d\ude4f', '\ud83c\udf84', '\u2744\ufe0f', '\ud83d\udce2', '\ud83d\udc4b', '\ud83d\udd6f\ufe0f', '\ud83c\udf39', '\ud83c\udf89', '\ud83c\udf86', '\ud83e\udde1', '\ud83d\udc9c'];

const SlideEditorModal = ({ slide, onSave, onClose }) => {
  const [title, setTitle] = useState(slide?.title || '');
  const [subtitle, setSubtitle] = useState(slide?.subtitle || '');
  const [message, setMessage] = useState(slide?.message || '');
  const [category, setCategory] = useState(slide?.category || 'celebration');
  const [emoji, setEmoji] = useState(slide?.emoji || '');

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      ...(slide || {}),
      title: title.trim(),
      subtitle: subtitle.trim(),
      message: message.trim(),
      category,
      emoji,
    });
  };

  const selectedCatInfo = SLIDE_CATEGORIES.find((c) => c.id === category);
  const previewEmoji = emoji || selectedCatInfo?.emoji || '\u2728';

  // Preview gradient colors for categories
  const previewBg = {
    birthday: 'from-pink-500 via-rose-400 to-orange-300',
    celebration: 'from-amber-400 via-yellow-300 to-orange-300',
    announcement: 'from-violet-500 via-indigo-400 to-blue-400',
    holiday: 'from-emerald-500 via-green-400 to-teal-300',
    welcome: 'from-sky-400 via-cyan-300 to-teal-300',
    memorial: 'from-slate-500 via-gray-400 to-slate-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Icon name="Sparkles" size={20} className="text-pink-500" />
            {slide ? 'Edit Custom Slide' : 'Add Custom Slide'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400 transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mini Preview */}
          <div className={`rounded-xl overflow-hidden h-36 bg-gradient-to-br ${previewBg[category] || previewBg.celebration} flex flex-col items-center justify-center relative`}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full bg-white/20" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
              ))}
            </div>
            <span className="text-4xl mb-1">{previewEmoji}</span>
            <p className="text-white text-xl font-black text-center px-4 truncate max-w-full drop-shadow-lg">
              {title || 'Your title here...'}
            </p>
            {subtitle && <p className="text-white/80 text-sm font-semibold text-center px-4 truncate max-w-full">{subtitle}</p>}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SLIDE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${
                    category === cat.id
                      ? 'border-pink-500 bg-pink-50 shadow-md scale-105'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[10px] font-bold text-gray-600">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Happy Birthday Margaret!"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              maxLength={100}
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Wishing you a wonderful 85th year!"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              maxLength={150}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. From all the staff and residents at Sunny Care Home, we hope your day is filled with joy and laughter!"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
              maxLength={300}
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Custom Emoji (optional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEmoji('')}
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  !emoji ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                title="Use default"
              >
                Auto
              </button>
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => setEmoji(em)}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                    emoji === em ? 'border-pink-500 bg-pink-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {slide ? 'Update Slide' : 'Add Slide'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TVDisplayControlPanel;
