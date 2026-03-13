import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import supabase from '../../services/supabaseClient';

/* ─── helpers ──────────────────────────────────────────────── */
const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m || '00'} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  const s = String(value).trim();
  if (!s) return [];
  try { const p = JSON.parse(s); if (Array.isArray(p)) return p.filter(Boolean).map(String); } catch {}
  return s.split(/\r?\n|,|;/).map((x) => x.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean);
};

const getMediaLink = (media) => {
  if (media.external_url) return media.external_url;
  if (media.file_path) {
    const { data } = supabase.storage.from('activity-media').getPublicUrl(media.file_path);
    return data?.publicUrl || media.file_path;
  }
  return media.thumbnail_url || null;
};

const getYouTubeEmbed = (media) => {
  if (media.youtube_video_id) return `https://www.youtube.com/embed/${media.youtube_video_id}?autoplay=1&mute=1&loop=1`;
  if (!media.external_url) return null;
  try {
    const url = new URL(media.external_url);
    let id = null;
    if (url.hostname.includes('youtu.be')) id = url.pathname.replace('/', '');
    else if (url.hostname.includes('youtube.com')) id = url.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1` : null;
  } catch { return null; }
};

const getMediaKind = (media, link) => {
  const type = (media.media_type || '').toLowerCase();
  const src = `${link || ''} ${media.file_name || ''} ${media.mime_type || ''}`.toLowerCase();
  if (type === 'youtube' || getYouTubeEmbed(media)) return 'youtube';
  if (type === 'photo' || type === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(src)) return 'image';
  if (type === 'video' || /\.(mp4|mov|webm|m4v|ogg)$/i.test(src)) return 'video';
  return 'other';
};

/* ─── component ────────────────────────────────────────────── */
const ActivityTVDisplay = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('sessionId');
  const activityId = params.get('activityId');

  const [session, setSession] = useState(null);
  const [activity, setActivity] = useState(null);
  const [media, setMedia] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideDuration, setSlideDuration] = useState(10);
  const [showControls, setShowControls] = useState(true); // start visible
  const controlTimeout = useRef(null);

  // Build slides using useMemo so downstream hooks see stable length
  const allSlides = useMemo(() => {
    const result = [];
    if (activity?.image_url) {
      result.push({ type: 'hero', url: activity.image_url, title: activity.name });
    }
    media.forEach((m) => {
      const link = getMediaLink(m);
      const kind = getMediaKind(m, link);
      if (kind === 'image' || kind === 'video' || kind === 'youtube') {
        result.push({ type: kind, url: link, embed: getYouTubeEmbed(m), title: m.title || m.file_name, media: m });
      }
    });
    return result;
  }, [activity, media]);

  const slideCount = allSlides.length;

  /* ─── Fetch data ──────────────────────── */
  useEffect(() => {
    const loadMediaAndResources = async (aId) => {
      if (!aId) return;
      const [mediaRes, resourcesRes] = await Promise.all([
        supabase
          .from('activity_media')
          .select('id, media_type, title, tagline, description, file_path, file_name, external_url, youtube_video_id, thumbnail_url, display_order, is_primary')
          .eq('activity_id', aId)
          .order('is_primary', { ascending: false })
          .order('display_order', { ascending: true }),
        supabase
          .from('activity_resources')
          .select('id, resource_name, resource_type, quantity_needed, quantity_available, unit_of_measure, notes, is_reusable')
          .eq('activity_id', aId)
          .order('resource_name'),
      ]);
      console.log('[TV] media result:', mediaRes.data?.length, mediaRes.error);
      console.log('[TV] resources result:', resourcesRes.data?.length, resourcesRes.error);
      if (!mediaRes.error) setMedia(mediaRes.data || []);
      if (!resourcesRes.error) setResources(resourcesRes.data || []);
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let aId = activityId;

        // Always load activity if we have activityId
        if (aId) {
          const { data: actData, error: actErr } = await supabase
            .from('activities')
            .select('id, name, description, objective, duration_minutes, max_participants, location, equipment_required, materials_needed, instructions, benefits, image_url, activity_categories(name, color_code)')
            .eq('id', aId)
            .single();
          console.log('[TV] activity loaded:', actData?.name, actErr);
          if (actData) setActivity(actData);
          else setError(`Activity not found: ${actErr?.message || 'unknown error'}`);
        }

        // Load session if provided (separate query — no FK join on views)
        if (sessionId) {
          const { data: sData, error: sErr } = await supabase
            .from('activity_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
          console.log('[TV] session loaded:', sData?.id, sErr);
          if (sData) {
            setSession(sData);
            // If we didn't have activityId, use the one from the session
            if (!aId && sData.activity_id) {
              aId = sData.activity_id;
              const { data: actData } = await supabase
                .from('activities')
                .select('id, name, description, objective, duration_minutes, max_participants, location, equipment_required, materials_needed, instructions, benefits, image_url, activity_categories(name, color_code)')
                .eq('id', aId)
                .single();
              if (actData) setActivity(actData);
            }
          }
        }

        if (aId) await loadMediaAndResources(aId);
      } catch (err) {
        console.error('[TV] load error:', err);
        setError(err.message);
      }
      setLoading(false);
    };

    if (activityId || sessionId) {
      load();
    } else {
      setLoading(false);
      setError('No activityId or sessionId provided in URL');
    }
  }, [sessionId, activityId]);

  /* ─── Slideshow auto-advance ────────── */
  const advanceSlide = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    const timer = setInterval(advanceSlide, slideDuration * 1000);
    return () => clearInterval(timer);
  }, [isPaused, slideDuration, advanceSlide, slideCount]);

  /* ─── Controls auto-hide ────────────── */
  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlTimeout.current);
    controlTimeout.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  /* ─── Keyboard ──────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      showControlsBriefly();
      if (e.key === 'Escape') navigate(-1);
      if (e.key === 'ArrowRight' && slideCount > 1) setCurrentSlide((p) => (p + 1) % slideCount);
      if (e.key === 'ArrowLeft' && slideCount > 1) setCurrentSlide((p) => (p - 1 + slideCount) % slideCount);
      if (e.key === ' ') { e.preventDefault(); setIsPaused((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slideCount, navigate, showControlsBriefly]);

  const catColor = activity?.activity_categories?.color_code || '#8B5CF6';
  const equipmentList = parseList(activity?.equipment_required);
  const materialsList = parseList(activity?.materials_needed);
  const instructionsList = parseList(activity?.instructions);
  const benefitsList = parseList(activity?.benefits);

  if (loading) {
    return (
      <div data-persist="true" className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto" />
          <p className="mt-6 text-white/70 text-xl font-light">Loading activity for TV display…</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div data-persist="true" className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center z-[9999]">
        <div className="text-center space-y-4">
          <Icon name="AlertCircle" size={64} className="text-red-400 mx-auto" />
          <p className="text-white text-2xl font-semibold">Activity not found</p>
          {error && <p className="text-white/50 text-sm max-w-md mx-auto">{error}</p>}
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">
            <Icon name="ArrowLeft" size={18} className="inline mr-2" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentSlideData = allSlides[currentSlide];

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 z-[9999] overflow-hidden cursor-none"
      data-persist="true"
      onMouseMove={showControlsBriefly}
      onClick={showControlsBriefly}
    >
      {/* ── Progress bar ──────────────────── */}
      {slideCount > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 z-50 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 to-pink-400"
            key={`progress-${currentSlide}-${isPaused}`}
            initial={{ width: '0%' }}
            animate={{ width: isPaused ? undefined : '100%' }}
            transition={{ duration: isPaused ? 0 : slideDuration, ease: 'linear' }}
          />
        </div>
      )}

      {/* ── Back button & controls ────────── */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-50 p-6 flex items-start justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ cursor: 'default' }}
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md transition-all"
            >
              <Icon name="ArrowLeft" size={18} /> Exit TV
            </button>

            <div className="flex items-center gap-3">
              {slideCount > 1 && (
                <>
                  <button
                    onClick={() => setCurrentSlide((p) => (p - 1 + slideCount) % slideCount)}
                    className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md transition-all"
                  >
                    <Icon name="ChevronLeft" size={20} />
                  </button>
                  <button
                    onClick={() => setIsPaused((p) => !p)}
                    className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md transition-all"
                  >
                    <Icon name={isPaused ? 'Play' : 'Pause'} size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((p) => (p + 1) % slideCount)}
                    className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-md transition-all"
                  >
                    <Icon name="ChevronRight" size={20} />
                  </button>
                  <select
                    value={slideDuration}
                    onChange={(e) => setSlideDuration(Number(e.target.value))}
                    className="px-3 py-2.5 bg-black/40 text-white rounded-xl backdrop-blur-md border-0 text-sm"
                  >
                    {[5, 10, 15, 20, 30, 60].map((s) => (
                      <option key={s} value={s}>{s}s</option>
                    ))}
                  </select>
                </>
              )}
              <span className="px-3 py-2.5 bg-black/40 text-white/60 rounded-xl backdrop-blur-md text-sm">
                ESC to exit
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content area ─────────────── */}
      <div className="h-full flex">

        {/* Left panel — Activity info (takes ~38% if media present, full width otherwise) */}
        <div className={`h-full overflow-y-auto custom-scrollbar ${slideCount > 0 ? 'w-[38%]' : 'w-full'}`}>
          <div className="p-8 lg:p-10 space-y-6 min-h-full flex flex-col">

            {/* Header */}
            <div>
              {activity.activity_categories && (
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white mb-4"
                  style={{ backgroundColor: catColor + 'cc' }}
                >
                  {activity.activity_categories.name}
                </span>
              )}
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                {activity.name || 'Activity'}
              </h1>

              {/* Session info chips */}
              <div className="flex flex-wrap gap-3 mt-5">
                {session?.session_date && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Icon name="Calendar" size={16} className="text-purple-300" />
                    <span className="text-white/90 text-sm font-medium">
                      {new Date(session.session_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                {session?.start_time && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Icon name="Clock" size={16} className="text-blue-300" />
                    <span className="text-white/90 text-sm font-medium">
                      {formatTime(session.start_time)}{session.end_time ? ` – ${formatTime(session.end_time)}` : ''}
                    </span>
                  </div>
                )}
                {(session?.location || activity.location) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Icon name="MapPin" size={16} className="text-emerald-300" />
                    <span className="text-white/90 text-sm font-medium">{session?.location || activity.location}</span>
                  </div>
                )}
                {activity.duration_minutes && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                    <Icon name="Timer" size={16} className="text-amber-300" />
                    <span className="text-white/90 text-sm font-medium">{activity.duration_minutes} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {activity.description && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">About</h2>
                <p className="text-white/80 text-lg leading-relaxed">{activity.description}</p>
              </div>
            )}

            {/* Objective */}
            {activity.objective && (
              <div className="p-4 bg-indigo-500/15 rounded-xl border border-indigo-400/20">
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Objective</p>
                <p className="text-white/85 text-base leading-relaxed">{activity.objective}</p>
              </div>
            )}

            {/* Instructions */}
            {instructionsList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Instructions</h2>
                <div className="space-y-2">
                  {instructionsList.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="w-7 h-7 rounded-full bg-purple-500/30 text-purple-200 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-white/80 text-base leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipment & Materials */}
            {(equipmentList.length > 0 || materialsList.length > 0) && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">What You Need</h2>
                <div className="flex flex-wrap gap-2">
                  {equipmentList.map((item, i) => (
                    <span key={`eq-${i}`} className="px-3 py-1.5 bg-blue-500/15 text-blue-200 rounded-lg text-sm border border-blue-400/20">
                      {item}
                    </span>
                  ))}
                  {materialsList.map((item, i) => (
                    <span key={`mat-${i}`} className="px-3 py-1.5 bg-teal-500/15 text-teal-200 rounded-lg text-sm border border-teal-400/20">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {benefitsList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Benefits</h2>
                <div className="space-y-2">
                  {benefitsList.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Icon name="CheckCircle" size={16} className="text-emerald-400 flex-shrink-0 mt-1" />
                      <p className="text-white/80 text-base">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/40">Resources</h2>
                <div className="grid grid-cols-1 gap-2">
                  {resources.map((r) => (
                    <div key={r.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white/90 font-semibold text-sm">{r.resource_name}</p>
                        {r.resource_type && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/50">{r.resource_type}</span>
                        )}
                      </div>
                      <p className="text-white/50 text-xs mt-1">
                        Needed: {r.quantity_needed ?? 0}{r.unit_of_measure ? ` ${r.unit_of_measure}` : ''}
                        {r.quantity_available != null ? ` · Available: ${r.quantity_available}` : ''}
                        {r.is_reusable ? ' · Reusable' : ''}
                      </p>
                      {r.notes && <p className="text-white/40 text-xs mt-1">{r.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Notes */}
            {session?.notes && (
              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="FileText" size={15} className="text-amber-400" />
                  <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">Session Notes</p>
                </div>
                <p className="text-white/80 text-base leading-relaxed">{session.notes}</p>
              </div>
            )}

            {/* Spacer to keep content from being cramped at bottom */}
            <div className="flex-1" />
          </div>
        </div>

        {/* Right panel — Media slideshow (takes ~62%) */}
        {slideCount > 0 && (
          <div className="w-[62%] h-full relative bg-black/30">
            <AnimatePresence mode="wait">
              {currentSlideData && (
                <motion.div
                  key={`slide-${currentSlide}`}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                >
                  {/* Hero image or media image */}
                  {(currentSlideData.type === 'hero' || currentSlideData.type === 'image') && (
                    <img
                      src={currentSlideData.url}
                      alt={currentSlideData.title || 'Activity media'}
                      className="w-full h-full object-contain"
                      style={{ maxHeight: '100vh' }}
                    />
                  )}

                  {/* Video */}
                  {currentSlideData.type === 'video' && (
                    <video
                      key={currentSlideData.url}
                      src={currentSlideData.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                      style={{ maxHeight: '100vh', background: 'black' }}
                    />
                  )}

                  {/* YouTube */}
                  {currentSlideData.type === 'youtube' && currentSlideData.embed && (
                    <iframe
                      title={currentSlideData.title || 'YouTube video'}
                      src={currentSlideData.embed}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}

                  {/* Caption overlay */}
                  {currentSlideData.title && currentSlideData.type !== 'hero' && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-lg font-semibold drop-shadow">{currentSlideData.title}</p>
                      {currentSlideData.media?.tagline && (
                        <p className="text-white/70 text-sm mt-1">{currentSlideData.media.tagline}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide indicator dots */}
            {slideCount > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-40">
                {allSlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === currentSlide ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
};

export default ActivityTVDisplay;
