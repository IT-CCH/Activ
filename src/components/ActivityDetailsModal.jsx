import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './AppIcon';
import ActivityMediaCarousel from './activities/ActivityMediaCarousel';
import supabase from '../services/supabaseClient';

const ActivityDetailsModal = ({ isOpen, activity: session, onClose, onMarkComplete, onEdit }) => {
  // Support both Dashboard structure (session.activities) and ScheduleCalendar structure (session.activity)
  const safeSession = session || {};
  const act = safeSession.activities || safeSession.activity || {};
  const activityId = safeSession.activity_id || act.id;
  const sessionDate = safeSession.session_date || safeSession.date;
  const [fullActivity, setFullActivity] = useState(act);
  const [mediaItems, setMediaItems] = useState([]);
  const [resourceItems, setResourceItems] = useState([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [engagedCount, setEngagedCount] = useState('');
  const [notEngagedCount, setNotEngagedCount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mergedActivity = useMemo(() => ({ ...act, ...fullActivity }), [act, fullActivity]);
  const category = mergedActivity.activity_categories;

  const formatTime = (t) => {
    if (!t) return '';
    const parts = t.split(':');
    const hour = parseInt(parts[0], 10);
    const min = parts[1] || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 || 12;
    return `${String(display).padStart(2, '0')}:${min} ${ampm}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return d; }
  };

  const statusConfig = {
    completed:   { bg: 'bg-emerald-500/20', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Completed' },
    in_progress: { bg: 'bg-blue-500/20',    text: 'text-blue-300',    dot: 'bg-blue-400',    label: 'In Progress' },
    scheduled:   { bg: 'bg-amber-500/20',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Scheduled' },
    cancelled:   { bg: 'bg-red-500/20',     text: 'text-red-300',     dot: 'bg-red-400',     label: 'Cancelled' },
  };
  const st = statusConfig[(safeSession.status || 'scheduled').toLowerCase().replace(' ', '_')] || statusConfig.scheduled;
  const catColor = category?.color_code || '#8B5CF6';

  const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
    if (typeof value !== 'string') return [String(value)];

    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // ignore JSON parse errors and use split parsing below
    }

    // Handle HTML content (e.g. from rich text editor)
    if (/<li[^>]*>/i.test(trimmed)) {
      const items = [];
      trimmed.replace(/<li[^>]*>(.*?)<\/li>/gi, (_, inner) => {
        const text = inner.replace(/<[^>]*>/g, '').trim();
        if (text) items.push(text);
      });
      if (items.length) return items;
    }

    return trimmed
      .split(/\r?\n/)
      .map((part) => part.replace(/^[-•\d.)\s]+/, '').trim())
      .filter(Boolean);
  };

  const equipmentList = parseList(mergedActivity.equipment_required);
  const materialsList = parseList(mergedActivity.materials_needed);
  const instructionsList = parseList(mergedActivity.instructions);
  const benefitsList = parseList(mergedActivity.benefits);

  useEffect(() => {
    const loadFullDetails = async () => {
      if (!isOpen || !activityId) {
        setFullActivity(act);
        setMediaItems([]);
        setResourceItems([]);
        return;
      }

      setIsLoadingExtra(true);
      try {
        const [activityRes, mediaRes, resourcesRes] = await Promise.all([
          supabase
            .from('activities')
            .select(`
              id,
              name,
              description,
              objective,
              duration_minutes,
              max_participants,
              min_participants,
              status,
              location,
              equipment_required,
              materials_needed,
              instructions,
              benefits,
              image_url,
              activity_categories(name, color_code)
            `)
            .eq('id', activityId)
            .single(),
          supabase
            .from('activity_media')
            .select(`
              id,
              media_type,
              title,
              tagline,
              description,
              file_path,
              file_name,
              external_url,
              youtube_video_id,
              thumbnail_url,
              display_order,
              is_primary
            `)
            .eq('activity_id', activityId)
            .order('is_primary', { ascending: false })
            .order('display_order', { ascending: true }),
          supabase
            .from('activity_resources')
            .select(`
              id,
              resource_name,
              resource_type,
              quantity_needed,
              quantity_available,
              unit_of_measure,
              notes,
              is_reusable
            `)
            .eq('activity_id', activityId)
            .order('resource_name')
        ]);

        if (!activityRes.error && activityRes.data) {
          setFullActivity(activityRes.data);
        } else {
          setFullActivity(act);
        }

        if (!mediaRes.error && Array.isArray(mediaRes.data)) {
          setMediaItems(mediaRes.data);
        } else {
          setMediaItems([]);
        }

        if (!resourcesRes.error && Array.isArray(resourcesRes.data)) {
          setResourceItems(resourcesRes.data);
        } else {
          setResourceItems([]);
        }
      } catch {
        setFullActivity(act);
        setMediaItems([]);
        setResourceItems([]);
      } finally {
        setIsLoadingExtra(false);
      }
    };

    loadFullDetails();
  }, [isOpen, activityId]);

  // Early return after all hooks
  if (!isOpen || !session) return null;

  // Colour chip helpers
  const chipColors = [
    { bg: 'bg-violet-50', valueClass: 'text-violet-700', labelClass: 'text-violet-500' },
    { bg: 'bg-sky-50',    valueClass: 'text-sky-700',    labelClass: 'text-sky-500'    },
    { bg: 'bg-teal-50',   valueClass: 'text-teal-700',   labelClass: 'text-teal-500'   },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* ── Hero ────────────────────────────────── */}
            <div className="relative flex-shrink-0 h-56 overflow-hidden rounded-t-2xl">
              {mergedActivity.image_url ? (
                <img
                  src={mergedActivity.image_url}
                  alt={mergedActivity.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${catColor}40, ${catColor}90)` }}
                >
                  <span className="text-8xl opacity-20 select-none">🎯</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 bg-black/40 hover:bg-black/65 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
              >
                <Icon name="X" size={17} color="white" />
              </button>

              {/* Status pill */}
              <div className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 ${st.bg} ${st.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${st.dot}`} />
                {st.label}
              </div>

              {/* Title */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                {category && (
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white mb-2"
                    style={{ backgroundColor: catColor + 'cc' }}
                  >
                    {category.name}
                  </span>
                )}
                <h2 className="text-xl font-bold text-white leading-tight drop-shadow">
                  {mergedActivity.name || 'Activity'}
                </h2>
                {sessionDate && (
                  <p className="text-white/75 text-xs mt-0.5">{formatDate(sessionDate)}</p>
                )}
              </div>
            </div>

            {/* ── Scrollable body ──────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {/* Quick-info chips */}
              <div className="grid grid-cols-3 gap-2.5 p-4 border-b border-gray-100">
                {[
                  { title: 'Time',     value: formatTime(session.start_time), sub: session.end_time ? `→ ${formatTime(session.end_time)}` : null, ...chipColors[0] },
                  { title: 'Duration', value: mergedActivity.duration_minutes ? `${mergedActivity.duration_minutes}` : '—', sub: mergedActivity.duration_minutes ? 'minutes' : null, ...chipColors[1] },
                  { title: 'Location', value: session.location || mergedActivity.location || 'TBC', sub: null, ...chipColors[2] },
                ].map((chip, i) => (
                  <div key={i} className={`text-center p-3 rounded-xl ${chip.bg}`}>
                    <div className={`text-xs font-semibold mb-1 ${chip.labelClass}`}>{chip.title}</div>
                    <div className={`text-sm font-bold truncate ${chip.valueClass}`} title={chip.value}>{chip.value}</div>
                    {chip.sub && <div className="text-xs text-slate-400 mt-0.5">{chip.sub}</div>}
                  </div>
                ))}
              </div>

              {/* About */}
              {mergedActivity.description && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">{mergedActivity.description}</p>
                  {mergedActivity.objective && (
                    <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs text-indigo-600 font-semibold mb-1">Objective</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{mergedActivity.objective}</p>
                    </div>
                  )}
                </div>
              )}

              {(equipmentList.length > 0 || materialsList.length > 0) && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preparation</h3>
                  <div className="space-y-3">
                    {equipmentList.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Equipment Required</p>
                        <div className="flex flex-wrap gap-2">
                          {equipmentList.map((item, idx) => (
                            <span key={`eq-${idx}`} className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {materialsList.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">Materials Needed</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {materialsList.map((item, idx) => (
                            <div key={`mat-${idx}`} className="text-sm text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {instructionsList.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Instructions</h3>
                  <div className="space-y-2">
                    {instructionsList.map((item, idx) => (
                      <div key={`inst-${idx}`} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {benefitsList.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Benefits</h3>
                  <div className="space-y-2">
                    {benefitsList.map((item, idx) => (
                      <div key={`ben-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
                        <Icon name="CheckCircle" size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resourceItems.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Resources</h3>
                  <div className="space-y-2">
                    {resourceItems.map((resource) => (
                      <div key={resource.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-800 truncate">{resource.resource_name}</p>
                          {resource.resource_type && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
                              {resource.resource_type}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Needed: {resource.quantity_needed ?? 0}
                          {resource.unit_of_measure ? ` ${resource.unit_of_measure}` : ''}
                          {resource.quantity_available != null ? ` • Available: ${resource.quantity_available}` : ''}
                          {resource.is_reusable ? ' • Reusable' : ''}
                        </div>
                        {resource.notes && <p className="mt-1 text-xs text-slate-500">{resource.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <ActivityMediaCarousel mediaItems={mediaItems} />
                </div>
              )}

              {/* Session Notes */}
              {session.notes && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Session Notes</h3>
                  <div className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <Icon name="FileText" size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-slate-700 text-sm leading-relaxed">{session.notes}</p>
                  </div>
                </div>
              )}

              {/* Max participants */}
              {mergedActivity.max_participants && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: catColor + '22' }}
                    >
                      <Icon name="Users" size={17} style={{ color: catColor }} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Max Participants</div>
                      <div className="text-sm font-semibold text-slate-800">{mergedActivity.max_participants} people</div>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingExtra && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-slate-400">Loading full activity details...</p>
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────── */}
            <div className="border-t border-gray-100 bg-white flex-shrink-0 rounded-b-2xl">
              {/* Completion form — slides in when user hits Complete */}
              {showCompletionForm && (
                <div className="px-5 pt-4 pb-3 bg-emerald-50 border-b border-emerald-100">
                  <p className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-1.5">
                    <Icon name="CheckCircle" size={15} className="text-emerald-600" />
                    Record Session Attendance
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Participants Engaged
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 8"
                        value={engagedCount}
                        onChange={(e) => setEngagedCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Took part in the activity</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Participants Not Engaged
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2"
                        value={notEngagedCount}
                        onChange={(e) => setNotEngagedCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Present but did not participate</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={isSaving}
                      onClick={async () => {
                        if (isSaving) return;
                        setIsSaving(true);
                        await onMarkComplete({
                          participants_engaged: engagedCount !== '' ? parseInt(engagedCount, 10) : 0,
                          participants_not_engaged: notEngagedCount !== '' ? parseInt(notEngagedCount, 10) : 0,
                        });
                        setIsSaving(false);
                        setShowCompletionForm(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                      <Icon name="Check" size={14} />
                      {isSaving ? 'Saving…' : 'Confirm Completion'}
                    </button>
                    <button
                      onClick={() => setShowCompletionForm(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 flex gap-2.5">
                {onMarkComplete && session.status !== 'completed' && !showCompletionForm && (
                  <button
                    onClick={() => {
                      setEngagedCount('');
                      setNotEngagedCount('');
                      setShowCompletionForm(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    <Icon name="Check" size={15} />
                    Mark as Complete
                  </button>
                )}
                {session.status === 'completed' && (
                  <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-200">
                    <Icon name="CheckCircle" size={15} />
                    Session Completed
                  </div>
                )}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                  >
                    <Icon name="Edit2" size={15} />
                    Edit
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-200 text-slate-600 hover:bg-gray-50 rounded-xl font-medium text-sm transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActivityDetailsModal;
