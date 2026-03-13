import React, { useEffect, useMemo, useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { listResidents, listMeals, listMealsByHomeAndGlobal } from '../../../services/deliveryService';
import { resolveIdsFromStatus as resolveIdsFromStatusHelper, computeCostBreakdown as computeCostBreakdownHelper } from './confirmDeliveryHelpers';

const ConfirmDeliveryModal = ({
  isOpen,
  onClose,
  careHomeId,
  careHomeName,
  date,
  mealType,
  initialStatus,
  scheduledInfo,
  readOnly = false,
  onSave,
  userId,
  userName,
  isSecondEdit = false,
  userRole = 'staff',
}) => {
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [meals, setMeals] = useState([]);

  const [delivered, setDelivered] = useState(initialStatus?.delivered ?? false);
  const [initialDelivered, setInitialDelivered] = useState(initialStatus?.delivered ?? false);
  const [servedCount, setServedCount] = useState(initialStatus?.servedCount ?? 0);
  const [sideMealCounts, setSideMealCounts] = useState(initialStatus?.sideMealCounts || {});
  const [dessertCounts, setDessertCounts] = useState(initialStatus?.dessertCounts || {});
  const [changedForAll, setChangedForAll] = useState(initialStatus?.changedForAll ?? false);
  const [newMainMealId, setNewMainMealId] = useState(initialStatus?.newMainMealId || '');
  const [newSideMealIds, setNewSideMealIds] = useState(initialStatus?.newSideMealIds || []);
  const [newDessertIds, setNewDessertIds] = useState(initialStatus?.newDessertIds || []);
  const [changeReason, setChangeReason] = useState(initialStatus?.changeReason || '');
  const [alternates, setAlternates] = useState(initialStatus?.alternates || []);
  const [specialMeals, setSpecialMeals] = useState(initialStatus?.specialMeals || []);
  const [editReason, setEditReason] = useState('');
  const [disableReason, setDisableReason] = useState('');

  // Filter meals by type
  const sideMeals = useMemo(() => meals.filter(m => m.type === 'side' || m.type?.toLowerCase().includes('side')), [meals]);
  const mainMeals = useMemo(() => meals.filter(m => m.type !== 'side' && !m.type?.toLowerCase().includes('side')), [meals]);
  const dessertMeals = useMemo(() => meals.filter(m => m.type === 'dessert' || m.type?.toLowerCase()?.includes('dessert') || m.slot_kind === 'dessert'), [meals]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [r, m] = await Promise.all([
        careHomeId ? listResidents(careHomeId) : Promise.resolve([]),
        careHomeId ? listMealsByHomeAndGlobal(careHomeId) : listMeals(),
      ]);
      if (!cancelled) {
        setResidents(r || []);
        setMeals(m || []);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, careHomeId]);

  useEffect(() => {
    if (!isOpen) {
      // Only clear edit reason when modal closes
      setEditReason('');
      return;
    }
    // Sync initial status when it changes
    const initialDeliveredValue = initialStatus?.delivered ?? false;
    setDelivered(initialDeliveredValue);
    setInitialDelivered(initialDeliveredValue);
    setServedCount(initialStatus?.servedCount ?? 0);
    
    // Parse sideMealCounts if it's a string (from JSONB)
    let parsedSideCounts = initialStatus?.sideMealCounts || {};
    if (typeof parsedSideCounts === 'string') {
      try {
        parsedSideCounts = JSON.parse(parsedSideCounts);
      } catch (e) {
        console.warn('Failed to parse sideMealCounts from string:', e);
        parsedSideCounts = {};
      }
    }
    setSideMealCounts(parsedSideCounts);
    
    // Parse dessertCounts if it's a string (from JSONB)
    let parsedDessertCounts = initialStatus?.dessertCounts || {};
    if (typeof parsedDessertCounts === 'string') {
      try {
        parsedDessertCounts = JSON.parse(parsedDessertCounts);
      } catch (e) {
        console.warn('Failed to parse dessertCounts from string:', e);
        parsedDessertCounts = {};
      }
    }
    setDessertCounts(parsedDessertCounts);
    
    setChangedForAll(initialStatus?.changedForAll ?? false);
    setNewMainMealId(initialStatus?.newMainMealId || '');
    setNewSideMealIds(initialStatus?.newSideMealIds || (initialStatus?.newSideMealId ? [initialStatus.newSideMealId] : []));
    setNewDessertIds(initialStatus?.newDessertIds || (initialStatus?.newDessertMealId ? [initialStatus.newDessertMealId] : []));
    setChangeReason(initialStatus?.changeReason || '');
    // Normalize older single-side fields to multi-select arrays for the UI
    const normAlternates = (initialStatus?.alternates || []).map(a => ({
      ...a,
      alternateSideMealIds: a.alternateSideMealIds || (a.alternateSideMealId ? [a.alternateSideMealId] : []),
      alternateDessertIds: a.alternateDessertIds || (a.alternateDessertId ? [a.alternateDessertId] : []),
    }));
    const normSpecials = (initialStatus?.specialMeals || []).map(s => ({
      ...s,
      specialSideMealIds: s.specialSideMealIds || (s.specialSideMealId ? [s.specialSideMealId] : []),
      specialDessertIds: s.specialDessertIds || (s.specialDessertId ? [s.specialDessertId] : []),
    }));
    setAlternates(normAlternates);
    setSpecialMeals(normSpecials);
  }, [initialStatus, isOpen]);

  // Calculate total served (main + alternates + special)
  // NOTE: Side and dessert counts are subsets of main residents, not additional
  const calculateTotalServed = () => {
    let total = Number(servedCount || 0);
    alternates.forEach(a => total += Number(a.residentCount || 0));
    specialMeals.forEach(s => total += Number(s.residentCount || 0));
    // Side meal counts and dessert counts are NOT added - they're subsets of main residents
    return total;
  };

  // Get meal name and price
  const getMealInfo = (mealId) => {
    const meal = meals.find(m => m.id === mealId);
    return meal ? { name: meal.name, price: Number(meal.cost_per_person || 0) } : { name: 'Unknown', price: 0 };
  };

  const getMealById = (mealId) => {
    if (!mealId) return null;
    // Prefer enriched meals returned by getStatus (contains image_url/description)
    const enriched = initialStatus?.mealsById || {};
    if (enriched && enriched[mealId]) return enriched[mealId];
    return meals.find(m => m.id === mealId) || null;
  };

  const findMealByName = (name) => {
    if (!name) return null;
    const enriched = initialStatus?.mealsById || {};
    const byName = Object.values(enriched).find(m => m && m.name && String(m.name).trim().toLowerCase() === String(name).trim().toLowerCase());
    if (byName) return byName;
    return meals.find(m => m.name && String(m.name).trim().toLowerCase() === String(name).trim().toLowerCase()) || null;
  };



  const renderMealList = (ids) => {
    if (!ids || ids.length === 0) return '—';
    return ids.map(id => {
      const m = getMealById(id);
      return m ? `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` : String(id);
    }).join(', ');
  };

  const renderMealChips = (ids) => {
    if (!ids || ids.length === 0) return (<div className="text-sm text-muted-foreground">—</div>);
    return (
      <div className="flex flex-wrap gap-3">
        {ids.map((item, idx) => {
          const isObj = item && typeof item === 'object';
          const id = isObj ? item.id : item;
          const m = isObj ? item : getMealById(id);
          const key = id || `meal-${idx}`;
          return (
            <div key={key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded px-2 py-1">
              {m && (m.image_url || m.image) ? (
                <img src={m.image_url || m.image} alt={m.name} className="w-8 h-8 rounded object-cover" />
              ) : (
                <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600">Img</div>
              )}
              <div className="text-sm">
                <div className="font-medium">{m ? m.name : (isObj ? JSON.stringify(item) : String(item))}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Use extracted helper to compute cost breakdown (passes in helper accessors)
  const computeCostBreakdown = () => computeCostBreakdownHelper(initialStatus, { getMealById, findMealByName });

  const renderMealNames = (ids) => {
    if (!ids || ids.length === 0) return '—';
    return ids.map(id => {
      const m = getMealById(id) || findMealByName(id);
      return m ? m.name : String(id);
    }).join(', ');
  };

  const contentRef = useRef(null);

  const handleDownload = () => {
    try {
      const content = contentRef.current?.innerHTML;
      if (!content) return;
      const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0');
      if (!w) return;
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(n => n.outerHTML).join('\n');
      w.document.open();
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Delivery Status</title>${styles}<style>body{font-family:Inter, system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial; padding:20px; color:#111}</style></head><body>${content}</body></html>`);
      w.document.close();
      // Give the new window a moment to layout
      setTimeout(() => { w.print(); }, 500);
    } catch (e) {
      // fallback: do nothing
    }
  };

  const title = readOnly ? 'Meal Delivery Status' : 'Confirm Meal Delivery / Serving';

  const addAlternate = () => setAlternates(prev => [...prev, { residentCount: 0, alternateMealId: '', alternateSideMealIds: [], alternateDessertIds: [], reason: '' }]);
  const removeAlternate = (idx) => setAlternates(prev => prev.filter((_, i) => i !== idx));
  const updateAlternate = (idx, patch) => setAlternates(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a));

  const addSpecialMeal = () => setSpecialMeals(prev => [...prev, { residentCount: 0, specialMealId: '', specialSideMealIds: [], specialDessertIds: [], reason: '' }]);
  const removeSpecialMeal = (idx) => setSpecialMeals(prev => prev.filter((_, i) => i !== idx));
  const updateSpecialMeal = (idx, patch) => setSpecialMeals(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const canSave = useMemo(() => {
    if (readOnly) return false;
    
    // If already confirmed and trying to edit
    if (initialStatus?.confirmedBy) {
      // Block further edits if already edited, UNLESS this is a second edit override
      if (initialStatus?.editedAt && !isSecondEdit) {
        setDisableReason('Already edited - cannot modify further');
        return false;
      }
      // For second edit override, allow editing regardless of date
      if (!isSecondEdit) {
        const today = new Date().toISOString().slice(0, 10);
        // Staff can only edit on same day, managers can edit past records
        if (userRole === 'staff' && date !== today) {
          setDisableReason('Staff can only edit on the same day');
          return false;
        }
        // Managers can edit past records but not future ones
        if (userRole === 'care_home_manager' && date > today) {
          setDisableReason('Cannot edit future deliveries');
          return false;
        }
      }
      // For second edit override, only require edit reason (the reason itself is the change)
      if (isSecondEdit) {
        if (!editReason.trim()) {
          setDisableReason('Edit reason is required');
          return false;
        }
        setDisableReason('');
        return true;
      }
      
      // For regular edits, check for actual changes
      const deliveryToggled = delivered !== initialDelivered;
      const servedCountChanged = Number(servedCount) !== Number(initialStatus?.servedCount ?? 0);
      
      // Check if any side meal counts changed
      const sideMealCountsChanged = Object.keys(sideMealCounts).some(id => 
        Number(sideMealCounts[id]) !== Number((initialStatus?.sideMealCounts?.[id]) ?? 0)
      ) || Object.keys(initialStatus?.sideMealCounts || {}).some(id => !(id in sideMealCounts));
      
      // Check if any dessert counts changed
      const dessertCountsChanged = Object.keys(dessertCounts).some(id => 
        Number(dessertCounts[id]) !== Number((initialStatus?.dessertCounts?.[id]) ?? 0)
      ) || Object.keys(initialStatus?.dessertCounts || {}).some(id => !(id in dessertCounts));
      
      const hasNewAlternates = alternates.length > (initialStatus?.alternates?.length ?? 0) || alternates.some(a => a.residentCount && a.alternateMealId);
      const hasNewSpecialMeals = specialMeals.length > (initialStatus?.specialMeals?.length ?? 0) || specialMeals.some(s => s.residentCount && s.specialMealId);
      
      if (!deliveryToggled && !servedCountChanged && !sideMealCountsChanged && !dessertCountsChanged && !hasNewAlternates && !hasNewSpecialMeals) {
        setDisableReason('Make a change (toggle delivery status, update counts, or add alternates/special meals)');
        return false;
      }
      
      // Check for edit reason
      if (!editReason.trim()) {
        setDisableReason('Edit reason is required');
        return false;
      }
      setDisableReason('');
      return true;
    }
    
    // New confirmation
    if (changedForAll && !changeReason.trim()) {
      setDisableReason('Reason for meal change is required');
      return false;
    }
    if (changedForAll && !newMainMealId && (!newSideMealIds || newSideMealIds.length === 0) && (!newDessertIds || newDessertIds.length === 0)) {
      setDisableReason('Please select a new meal');
      return false;
    }
    if (delivered && (servedCount == null || isNaN(servedCount) || servedCount < 0)) {
      setDisableReason('Served count must be valid');
      return false;
    }
    
    // Validate alternates
    for (const a of alternates) {
      if ((a.residentCount || a.alternateMealId || (a.alternateSideMealIds && a.alternateSideMealIds.length > 0) || (a.alternateDessertIds && a.alternateDessertIds.length > 0) || a.reason)) {
        if (!a.residentCount || !a.alternateMealId || !a.reason) {
          setDisableReason('Complete all alternate meal details');
          return false;
        }
      }
    }
    
    // Validate special meals
    for (const s of specialMeals) {
      if ((s.residentCount || s.specialMealId || (s.specialSideMealIds && s.specialSideMealIds.length > 0) || (s.specialDessertIds && s.specialDessertIds.length > 0) || s.reason)) {
        if (!s.residentCount || !s.specialMealId || !s.reason) {
          setDisableReason('Complete all special meal details');
          return false;
        }
      }
    }
    
    setDisableReason('');
    return true;
  }, [readOnly, changedForAll, changeReason, newMainMealId, newSideMealIds, newDessertIds, delivered, initialDelivered, servedCount, sideMealCounts, dessertCounts, alternates, specialMeals, initialStatus, editReason, date, isSecondEdit, userRole]);

  const handleSave = () => {
    if (readOnly) return;
    // Build final counts from both newSideMealIds AND from sideMealCounts keys
    // This handles both cases: when meals are selected AND when user just enters counts
    console.log('[ConfirmDeliveryModal.handleSave] DEBUG:');
    console.log('  sideMealCounts:', sideMealCounts);
    console.log('  sideMealCounts keys:', Object.keys(sideMealCounts || {}));
    console.log('  newSideMealIds:', newSideMealIds);
    console.log('  servedCount:', servedCount);
    
    const allSideIds = Array.from(new Set([
      ...(newSideMealIds || []),
      ...Object.keys(sideMealCounts || {})
    ])).filter(Boolean);
    
    console.log('  allSideIds after dedup:', allSideIds);
    
    const finalSideMealCounts = {};
    allSideIds.forEach(id => {
      const count = sideMealCounts[id];
      // Use the entered count if available, otherwise use servedCount as default
      finalSideMealCounts[id] = count !== undefined && count !== null ? Number(count) : Number(servedCount ?? 0);
    });
    
    console.log('  finalSideMealCounts:', finalSideMealCounts);
    
    const allDessertIds = Array.from(new Set([
      ...(newDessertIds || []),
      ...Object.keys(dessertCounts || {})
    ])).filter(Boolean);
    
    console.log('  allDessertIds after dedup:', allDessertIds);
    
    const finalDessertCounts = {};
    allDessertIds.forEach(id => {
      const count = dessertCounts[id];
      // Use the entered count if available, otherwise use servedCount as default
      finalDessertCounts[id] = count !== undefined && count !== null ? Number(count) : Number(servedCount ?? 0);
    });
    
    console.log('  finalDessertCounts:', finalDessertCounts);

    const payload = {
      careHomeId,
      careHomeName,
      date,
      mealType,
      delivered,
      servedCount: delivered ? Number(servedCount || 0) : 0,
      sideMealCounts: delivered && Object.keys(finalSideMealCounts).length > 0 ? finalSideMealCounts : null,
      dessertCounts: delivered && Object.keys(finalDessertCounts).length > 0 ? finalDessertCounts : null,
      // Only set changedForAll if user explicitly changed meals via the UI
      changedForAll: changedForAll,
      newMainMealId: newMainMealId || null,
      // Backwards-compatible single-value fields (first selected) for current DB schema
      newSideMealId: (allSideIds && allSideIds.length > 0) ? allSideIds[0] : null,
      newDessertMealId: (allDessertIds && allDessertIds.length > 0) ? allDessertIds[0] : null,
      // Full arrays for future-proofing
      newSideMealIds: allSideIds && allSideIds.length > 0 ? allSideIds : null,
      newDessertIds: allDessertIds && allDessertIds.length > 0 ? allDessertIds : null,
      changeReason: changeReason || null,
      alternates: alternates
        .filter(a => a.residentCount && a.alternateMealId)
        .map(a => ({
          residentCount: Number(a.residentCount || 0),
          alternateMealId: a.alternateMealId,
          // Backwards-compatible single-value fields (first selected)
          alternateSideMealId: (a.alternateSideMealIds && a.alternateSideMealIds.length > 0) ? a.alternateSideMealIds[0] : null,
          alternateDessertId: (a.alternateDessertIds && a.alternateDessertIds.length > 0) ? a.alternateDessertIds[0] : null,
          alternateSideMealIds: a.alternateSideMealIds && a.alternateSideMealIds.length > 0 ? a.alternateSideMealIds : null,
          alternateDessertIds: a.alternateDessertIds && a.alternateDessertIds.length > 0 ? a.alternateDessertIds : null,
          reason: a.reason || '',
        })),
      specialMeals: specialMeals
        .filter(s => s.residentCount && s.specialMealId)
        .map(s => ({
          residentCount: Number(s.residentCount || 0),
          specialMealId: s.specialMealId,
          // Backwards-compatible single-value fields (first selected)
          specialSideMealId: (s.specialSideMealIds && s.specialSideMealIds.length > 0) ? s.specialSideMealIds[0] : null,
          specialDessertId: (s.specialDessertIds && s.specialDessertIds.length > 0) ? s.specialDessertIds[0] : null,
          specialSideMealIds: s.specialSideMealIds && s.specialSideMealIds.length > 0 ? s.specialSideMealIds : null,
          specialDessertIds: s.specialDessertIds && s.specialDessertIds.length > 0 ? s.specialDessertIds : null,
          reason: s.reason || '',
        })),
      userId,
      userDisplayName: userName,
      editReason: initialStatus?.confirmedBy ? editReason : null,
    };
    
    console.log('[ConfirmDeliveryModal.handleSave] FINAL PAYLOAD:');
    console.log('  payload.sideMealCounts:', payload.sideMealCounts);
    console.log('  payload.newSideMealIds:', payload.newSideMealIds);
    console.log('  payload.newSideMealId (backwards compat):', payload.newSideMealId);
    console.log('  payload.dessertCounts:', payload.dessertCounts);
    console.log('  payload.newDessertIds:', payload.newDessertIds);
    console.log('  Full payload:', payload);
    
    onSave?.(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh] relative">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Icon name={readOnly ? 'Eye' : 'CheckCircle2'} size={22} />
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {readOnly && (
              <Button size="sm" variant="outline" onClick={handleDownload} iconName="Download">Download</Button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">
              <Icon name="X" size={22} />
            </button>
          </div>
        </div>

        <div ref={contentRef} className="p-6 space-y-6 overflow-y-auto flex-1 pb-80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">{date} • {careHomeName}</div>
              <div className="text-lg font-bold">{mealType}</div>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${delivered ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {delivered ? 'DELIVERED' : 'NOT DELIVERED'}
                </span>
                {delivered && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-white/60 dark:bg-slate-800 border">
                      Main: <span className="font-semibold">{Number(servedCount || 0)}</span>
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-white/60 dark:bg-slate-800 border">
                      Alternates: <span className="font-semibold">{(alternates || []).reduce((s, a) => s + Number(a.residentCount || 0), 0)}</span>
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-white/60 dark:bg-slate-800 border">
                      Specials: <span className="font-semibold">{(specialMeals || []).reduce((s, a) => s + Number(a.residentCount || 0), 0)}</span>
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-extrabold">
                      Total: <span className="font-bold">{calculateTotalServed()}</span>
                    </span>
                  </div>
                )}
              </div>
          </div>

          {/* Confirmation info */}
          {initialStatus?.confirmedBy && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Icon name="CheckCircle2" size={16} />
                Confirmed {initialStatus.confirmedAt ? `on ${new Date(initialStatus.confirmedAt).toLocaleDateString('en-GB')} at ${new Date(initialStatus.confirmedAt).toLocaleTimeString('en-GB')}` : 'previously'}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 space-y-1">
                <div>
                  <span className="font-semibold">By:</span> {initialStatus.confirmedByName || 'Unknown Staff Member'}
                </div>
                <div>
                  <span className="font-semibold">Care Home:</span> {careHomeName}
                </div>
              </div>
              {initialStatus.editedAt && (
                <div className="mt-3 pt-3 border-t border-emerald-300 dark:border-emerald-700">
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Icon name="Edit" size={12} />
                    <span className="font-semibold">Edited:</span> {new Date(initialStatus.editedAt).toLocaleString('en-GB')}
                  </div>
                  {initialStatus.editReason && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <span className="font-semibold">Reason:</span> {initialStatus.editReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delivery Confirmation */}
          {!readOnly && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">Delivery Confirmation</div>
              {!readOnly && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" disabled={readOnly} checked={delivered === true} onChange={() => setDelivered(true)} /> Delivered
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" disabled={readOnly} checked={delivered === false} onChange={() => setDelivered(false)} /> Not Delivered
                  </label>
                </div>
              )}
            </div>
            {delivered && (
              <div className="mt-3 space-y-4">
                {/* Main Meal Count */}
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Main Meal: {scheduledInfo?.scheduledMainName || 'Main Meal'}
                  </label>
                  <input type="number" min="0" value={servedCount || ''} placeholder="0" disabled={readOnly}
                         onChange={e => setServedCount(e.target.value)}
                         className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
                  <div className="text-xs text-muted-foreground mt-1">Number of residents that received the main meal</div>
                </div>
                
                {/* Scheduled Side Meals Count */}
                {scheduledInfo?.scheduledSides && scheduledInfo.scheduledSides.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Side Meals (out of {servedCount} main residents)</div>
                    {scheduledInfo.scheduledSides.map((side, idx) => {
                      const sideId = side.id || side.meal_id;
                      return (
                        <div key={sideId || idx} className="pl-4 border-l-2 border-blue-300">
                          <label className="block text-xs font-bold mb-1">{side.name || 'Side Meal'}</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={sideMealCounts[sideId] !== undefined ? sideMealCounts[sideId] : ''} 
                            placeholder="0"
                            disabled={readOnly}
                            onChange={e => setSideMealCounts(prev => ({ ...prev, [sideId]: Number(e.target.value) || 0 }))}
                            className="w-full md:w-64 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">How many of the {servedCount} main residents received this side?</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Scheduled Desserts Count */}
                {scheduledInfo?.scheduledDesserts && scheduledInfo.scheduledDesserts.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Desserts (out of {servedCount} main residents)</div>
                    {scheduledInfo.scheduledDesserts.map((dessert, idx) => {
                      const dessertId = dessert.id || dessert.meal_id;
                      return (
                        <div key={dessertId || idx} className="pl-4 border-l-2 border-pink-300">
                          <label className="block text-xs font-bold mb-1">{dessert.name || 'Dessert'}</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={dessertCounts[dessertId] !== undefined ? dessertCounts[dessertId] : ''} 
                            placeholder="0"
                            disabled={readOnly}
                            onChange={e => setDessertCounts(prev => ({ ...prev, [dessertId]: Number(e.target.value) || 0 }))}
                            className="w-full md:w-64 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">How many of the {servedCount} main residents received this dessert?</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Show changed meals counts if different from scheduled */}
                {newSideMealIds && newSideMealIds.length > 0 && changedForAll && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-amber-200">
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      <Icon name="AlertTriangle" size={14} className="inline mr-1" />
                      Changed Side Meals
                    </div>
                    {newSideMealIds.map((sideId, idx) => {
                      const sideMeal = getMealById(sideId);
                      return (
                        <div key={sideId || idx} className="pl-4 border-l-2 border-amber-300">
                          <label className="block text-xs font-bold mb-1">{sideMeal?.name || 'Side Meal'}</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={sideMealCounts[sideId] || 0} 
                            disabled={readOnly}
                            onChange={e => setSideMealCounts(prev => ({ ...prev, [sideId]: Number(e.target.value) || 0 }))}
                            className="w-full md:w-64 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">Number of residents who received this side</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Show changed desserts counts if different from scheduled */}
                {newDessertIds && newDessertIds.length > 0 && changedForAll && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-amber-200">
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      <Icon name="AlertTriangle" size={14} className="inline mr-1" />
                      Changed Desserts
                    </div>
                    {newDessertIds.map((dessertId, idx) => {
                      const dessertMeal = getMealById(dessertId);
                      return (
                        <div key={dessertId || idx} className="pl-4 border-l-2 border-amber-300">
                          <label className="block text-xs font-bold mb-1">{dessertMeal?.name || 'Dessert'}</label>
                          <input 
                            type="number" 
                            min="0" 
                            value={dessertCounts[dessertId] || 0} 
                            disabled={readOnly}
                            onChange={e => setDessertCounts(prev => ({ ...prev, [dessertId]: Number(e.target.value) || 0 }))}
                            className="w-full md:w-64 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" 
                          />
                          <div className="text-xs text-muted-foreground mt-1">Number of residents who received this dessert</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
          )}

          {/* Read-only detailed status view */}
          {readOnly && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/80">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="text-sm text-muted-foreground">{date} • {careHomeName}</div>
                  <h3 className="text-lg font-bold mt-1">{mealType}</h3>
                  <div className="mt-3 flex items-start gap-4">
                    <div className="w-36 h-24 bg-slate-100 rounded-lg overflow-hidden">
                      {(() => {
                        const mainId = initialStatus?.newMainMealId || null;
                        let m = mainId ? getMealById(mainId) : null;
                        if (!m) {
                          // Try scheduled/main name fallback
                          const candidateName = initialStatus?.newMainMeal || initialStatus?.mainName || initialStatus?.new_main_meal || null;
                          m = findMealByName(candidateName);
                        }
                        if (m && (m.image_url || m.image)) return (<img src={m.image_url || m.image} alt={m.name} className="w-full h-full object-cover" />);
                        return (<div className="w-full h-full flex items-center justify-center text-sm text-slate-500">No Image</div>);
                      })()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Main Meal</div>
                      <div className="text-base font-bold mt-1">{(() => {
                        const mainId = initialStatus?.newMainMealId || null;
                        let m = mainId ? getMealById(mainId) : null;
                        if (!m) {
                          const candidateName = initialStatus?.newMainMeal || initialStatus?.mainName || initialStatus?.new_main_meal || null;
                          m = findMealByName(candidateName);
                        }
                                return m ? `${m.name}` : (initialStatus?.newMainMeal || initialStatus?.mainName || '—');
                      })()}</div>
                      <div className="text-sm text-muted-foreground mt-2">{initialStatus?.mainDescription || ''}</div>
                      {initialStatus?.allergens && initialStatus.allergens.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {initialStatus.allergens.map((a, i) => (<span key={i} className="px-2 py-1 text-xs rounded bg-amber-50 text-amber-700">{typeof a === 'string' ? a : a.name}</span>))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <div className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700">
                    <div className="text-xs font-semibold">Delivery</div>
                    <div className="mt-1 font-bold">{initialStatus?.delivered ? 'Delivered' : 'Not Delivered'}</div>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700">
                    <div className="text-xs font-semibold">Main Meal Served</div>
                    <div className="mt-1 font-bold">{initialStatus?.servedCount ?? 0}</div>
                  </div>
                  
                  {/* Show individual side counts if available */}
                  {initialStatus?.sideMealCounts && Object.keys(initialStatus.sideMealCounts).length > 0 && (
                    <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">Side Meals (of main residents)</div>
                      {Object.entries(initialStatus.sideMealCounts).map(([sideId, count]) => {
                        const sideMeal = getMealById(sideId);
                        return (
                          <div key={sideId} className="mt-1 text-sm">
                            <span className="font-semibold">{sideMeal?.name || 'Side'}:</span> {count} <span className="text-xs text-muted-foreground">(of {initialStatus?.servedCount ?? 0})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Show individual dessert counts if available */}
                  {initialStatus?.dessertCounts && Object.keys(initialStatus.dessertCounts).length > 0 && (
                    <div className="px-4 py-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                      <div className="text-xs font-semibold text-pink-700 dark:text-pink-300">Desserts (of main residents)</div>
                      {Object.entries(initialStatus.dessertCounts).map(([dessertId, count]) => {
                        const dessertMeal = getMealById(dessertId);
                        return (
                          <div key={dessertId} className="mt-1 text-sm">
                            <span className="font-semibold">{dessertMeal?.name || 'Dessert'}:</span> {count} <span className="text-xs text-muted-foreground">(of {initialStatus?.servedCount ?? 0})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700">
                    <div className="text-xs font-semibold">Total Residents</div>
                    <div className="mt-1 font-bold">{(initialStatus?.servedCount || 0) + ((initialStatus?.alternates || []).reduce((s,a)=>s+Number(a.residentCount||0),0)) + ((initialStatus?.specialMeals || []).reduce((s,a)=>s+Number(a.residentCount||0),0))}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold mb-2">Sides</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const effectiveSideIds = resolveIdsFromStatusHelper(initialStatus, {
                        arrayIds: initialStatus?.newSideMealIds,
                        singleId: initialStatus?.newSideMealId || initialStatus?.new_side_meal_id,
                        nameField: initialStatus?.newSideMeal || initialStatus?.new_side_meal || initialStatus?.originalSide || null,
                        slotKind: 'side',
                        findMealByName,
                        allowEnrichedFallback: false,
                      });
                      return (effectiveSideIds && effectiveSideIds.length > 0) ? renderMealChips(effectiveSideIds) : (initialStatus?.originalSide || '—');
                    })()}
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-sm font-semibold mb-2">Desserts</div>
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const effectiveDessertIds = resolveIdsFromStatusHelper(initialStatus, {
                        arrayIds: initialStatus?.newDessertIds,
                        singleId: initialStatus?.newDessertMealId || initialStatus?.new_dessert_meal_id,
                        nameField: initialStatus?.newDessert || initialStatus?.dessertName || initialStatus?.dessert_name || null,
                        slotKind: 'dessert',
                        findMealByName,
                        allowEnrichedFallback: false,
                      });
                      return (effectiveDessertIds && effectiveDessertIds.length > 0) ? renderMealChips(effectiveDessertIds) : (initialStatus?.dessertName || '—');
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold">Was the scheduled Main Meal changed?</div>
                <div className="flex items-center gap-3 mt-1">
                  {initialStatus?.changedForAll ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <Icon name="Check" size={14} />
                      <span className="font-medium">Yes</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Icon name="X" size={14} />
                      <span className="font-medium">No</span>
                    </div>
                  )}
                </div>
                {initialStatus?.changedForAll && (
                  <div className="text-sm text-muted-foreground mt-2">
                    <div className="font-semibold">Reason:</div>
                    <div className="mt-1">{initialStatus?.changeReason || changeReason || '—'}</div>
                  </div>
                )}
              </div>



              <div className="mt-4">
                <div className="text-sm font-semibold mb-2">Alternates</div>
                {(initialStatus?.alternates && initialStatus.alternates.length > 0) ? (
                  <div className="grid gap-3">
                    {initialStatus.alternates.map((a, i) => {
                      const altMeal = getMealById(a.alternateMealId) || findMealByName(a.alternateMealName);
                      const altName = altMeal ? altMeal.name : (a.alternateMealName || a.alternateMealId || 'Alternate');
                      const unitCost = altMeal ? Number(altMeal.cost_per_person || 0) : (Number(a.unitCost || 0));
                      return (
                        <div key={i} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-slate-100 shadow-sm border-l-4 border-amber-300">
                          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-slate-50">
                            {altMeal && (altMeal.image_url || altMeal.image) ? (
                              <img src={altMeal.image_url || altMeal.image} alt={altMeal.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">Img</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{altName}</div>
                                <div className="text-xs text-muted-foreground mt-1 truncate">{(a.alternateSideMealIds && a.alternateSideMealIds.length > 0) ? renderMealNames(a.alternateSideMealIds) : ''}{(a.alternateDessertIds && a.alternateDessertIds.length > 0) ? ((a.alternateSideMealIds && a.alternateSideMealIds.length > 0) ? ' • ' : '') + renderMealNames(a.alternateDessertIds) : ''}</div>
                                <div className="text-xs text-muted-foreground mt-2">Reason: {a.reason || '—'}</div>
                                <div className="mt-2">{(a.alternateSideMealIds && a.alternateSideMealIds.length > 0) ? renderMealChips(a.alternateSideMealIds) : null}</div>
                                <div className="mt-2">{(a.alternateDessertIds && a.alternateDessertIds.length > 0) ? renderMealChips(a.alternateDessertIds) : null}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm">{a.residentCount || 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">served</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No alternates recorded.</div>
                )}
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold mb-2">Special Meals</div>
                {(initialStatus?.specialMeals && initialStatus.specialMeals.length > 0) ? (
                  <div className="grid gap-3">
                    {initialStatus.specialMeals.map((s, i) => {
                      const spMeal = getMealById(s.specialMealId) || findMealByName(s.specialMealName);
                      const spName = spMeal ? spMeal.name : (s.specialMealName || s.specialMealId || 'Special');
                      const spCost = spMeal ? Number(spMeal.cost_per_person || 0) : (Number(s.unitCost || 0));
                      return (
                        <div key={i} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-purple-100 shadow-sm border-l-4 border-purple-300">
                          <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-purple-50">
                            {spMeal && (spMeal.image_url || spMeal.image) ? (
                              <img src={spMeal.image_url || spMeal.image} alt={spMeal.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-purple-100 flex items-center justify-center text-xs text-purple-700">Img</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{spName}</div>
                                <div className="text-xs text-muted-foreground mt-1 truncate">{(s.specialSideMealIds && s.specialSideMealIds.length > 0) ? renderMealNames(s.specialSideMealIds) : ''}{(s.specialDessertIds && s.specialDessertIds.length > 0) ? ((s.specialSideMealIds && s.specialSideMealIds.length > 0) ? ' • ' : '') + renderMealNames(s.specialDessertIds) : ''}</div>
                                <div className="text-xs text-muted-foreground mt-2">Reason: {s.reason || '—'}</div>
                                <div className="mt-2">{(s.specialSideMealIds && s.specialSideMealIds.length > 0) ? renderMealChips(s.specialSideMealIds) : null}</div>
                                <div className="mt-2">{(s.specialDessertIds && s.specialDessertIds.length > 0) ? renderMealChips(s.specialDessertIds) : null}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">{s.residentCount || 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">served</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No special meals recorded.</div>
                )}
              </div>


                  {/* Cost breakdown section (tabular layout) */}
                  <div className="mt-6 rounded-lg border p-3 bg-white/50">
                    <div className="text-sm font-semibold mb-3">Cost Breakdown</div>
                    {(() => {
                      const breakdown = computeCostBreakdown();
                      return (
                        <div className="text-sm">
                          <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-slate-700 mb-2 bg-slate-50/80 rounded-md p-2">
                            <div>Item</div>
                            <div className="text-right">Unit Cost</div>
                            <div className="text-right">Qty Served</div>
                            <div className="text-right">Subtotal</div>
                            <div className="text-right">Notes</div>
                          </div>

                          {/* Main meal row */}
                          <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-slate-50/40 rounded-md transition-colors">
                            <div className="font-semibold text-indigo-700">
                              Main: {breakdown.main.meal ? breakdown.main.meal.name : (initialStatus?.newMainMeal || initialStatus?.mainName || '—')}
                            </div>
                            <div className="text-right">£{Number(breakdown.main.base || 0).toFixed(2)}</div>
                            <div className="text-right font-semibold">{breakdown.main.qty}</div>
                            <div className="text-right font-semibold">£{Number(breakdown.main.base * breakdown.main.qty || 0).toFixed(2)}</div>
                            <div className="text-right text-xs text-muted-foreground">Main residents</div>
                          </div>

                          {/* Individual side meals */}
                          {breakdown.main.sideCostBreakdown && Object.keys(breakdown.main.sideCostBreakdown).length > 0 && (
                            <>
                              {Object.entries(breakdown.main.sideCostBreakdown).map(([sideId, sideInfo]) => {
                                const sideMeal = getMealById(sideId);
                                return (
                                  <div key={sideId} className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-50 hover:bg-blue-50/30 rounded-md transition-colors">
                                    <div className="font-medium text-blue-700 pl-4">
                                      Side: {sideMeal?.name || 'Side Meal'}
                                    </div>
                                    <div className="text-right">£{Number(sideInfo.cost || 0).toFixed(2)}</div>
                                    <div className="text-right font-semibold">{sideInfo.count}</div>
                                    <div className="text-right font-semibold">£{Number(sideInfo.subtotal || 0).toFixed(2)}</div>
                                    <div className="text-right text-xs text-muted-foreground">of {breakdown.main.qty}</div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Individual desserts */}
                          {breakdown.main.dessertCostBreakdown && Object.keys(breakdown.main.dessertCostBreakdown).length > 0 && (
                            <>
                              {Object.entries(breakdown.main.dessertCostBreakdown).map(([dessertId, dessertInfo]) => {
                                const dessertMeal = getMealById(dessertId);
                                return (
                                  <div key={dessertId} className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-50 hover:bg-pink-50/30 rounded-md transition-colors">
                                    <div className="font-medium text-pink-700 pl-4">
                                      Dessert: {dessertMeal?.name || 'Dessert'}
                                    </div>
                                    <div className="text-right">£{Number(dessertInfo.cost || 0).toFixed(2)}</div>
                                    <div className="text-right font-semibold">{dessertInfo.count}</div>
                                    <div className="text-right font-semibold">£{Number(dessertInfo.subtotal || 0).toFixed(2)}</div>
                                    <div className="text-right text-xs text-muted-foreground">of {breakdown.main.qty}</div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Main subtotal */}
                          <div className="grid grid-cols-5 gap-2 py-2 border-t border-slate-200 bg-indigo-50/40 rounded-md font-semibold">
                            <div className="col-span-3 text-right">Main Meal Total:</div>
                            <div className="text-right">£{Number(breakdown.main.subtotal || 0).toFixed(2)}</div>
                            <div></div>
                          </div>

                          {/* Alternates rows */}
                          {(breakdown.alternateLines || []).map((l, i) => (
                            <div key={`alt-${i}`} className="mt-2">
                              <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-amber-50/30 rounded-md transition-colors">
                                <div className="font-semibold text-amber-700">
                                  Alternate: {l.name}
                                </div>
                                <div className="text-right">£{Number(l.unit || 0).toFixed(2)}</div>
                                <div className="text-right font-semibold">{l.qty}</div>
                                <div className="text-right font-semibold">£{Number(l.subtotal || 0).toFixed(2)}</div>
                                <div className="text-right text-xs text-muted-foreground">Alternative residents</div>
                              </div>
                            </div>
                          ))}

                          {/* Special rows */}
                          {(breakdown.specialLines || []).map((l, i) => (
                            <div key={`spec-${i}`} className="mt-2">
                              <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-emerald-50/30 rounded-md transition-colors">
                                <div className="font-semibold text-emerald-700">
                                  Special: {l.name}
                                </div>
                                <div className="text-right">£{Number(l.unit || 0).toFixed(2)}</div>
                                <div className="text-right font-semibold">{l.qty}</div>
                                <div className="text-right font-semibold">£{Number(l.subtotal || 0).toFixed(2)}</div>
                                <div className="text-right text-xs text-muted-foreground">Special diet residents</div>
                              </div>
                            </div>
                          ))}

                          <div className="mt-4 pt-3 border-t-2 border-slate-300 grid grid-cols-5 gap-2 text-base font-bold">
                            <div className="col-span-3 text-right">GRAND TOTAL:</div>
                            <div className="text-right text-indigo-700">£{Number(breakdown.totals.grandTotal || 0).toFixed(2)}</div>
                            <div></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
              <div className="mt-4 text-xs text-muted-foreground">
                <div><span className="font-semibold">Confirmed by:</span> {initialStatus?.confirmedByName || '—'}</div>
                <div><span className="font-semibold">Confirmed at:</span> {initialStatus?.confirmedAt ? new Date(initialStatus.confirmedAt).toLocaleString('en-GB') : '—'}</div>
                {initialStatus?.editedAt && (<div><span className="font-semibold">Edited at:</span> {new Date(initialStatus.editedAt).toLocaleString('en-GB')}</div>)}
                {initialStatus?.editReason && (<div><span className="font-semibold">Edit reason:</span> {initialStatus.editReason}</div>)}
              </div>
            </div>
          )}

          {/* Change main meal for everyone */}
          {!readOnly && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">Change Main Meal for Everyone</div>
              {!readOnly && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={changedForAll} onChange={e => setChangedForAll(e.target.checked)} /> Enable
                </label>
              )}
            </div>
            {changedForAll && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                <div className="relative overflow-visible">
                  <label className="block text-xs font-bold mb-1">New Main Meal</label>
                  <Select
                    options={[{ value: '', label: 'No Change' }, ...mainMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))]}
                    value={newMainMealId || ''}
                    onChange={setNewMainMealId}
                    searchable
                    clearable
                    disabled={readOnly}
                  />
                </div>
                <div className="relative overflow-visible">
                  <label className="block text-xs font-bold mb-1">New Side Meals (optional)</label>
                  <Select
                    multiple
                    options={sideMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                    value={newSideMealIds || []}
                    onChange={setNewSideMealIds}
                    searchable
                    clearable
                    disabled={readOnly}
                  />
                </div>
                <div className="relative overflow-visible">
                  <label className="block text-xs font-bold mb-1">Desserts (optional)</label>
                  <Select
                    multiple
                    options={dessertMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                    value={newDessertIds || []}
                    onChange={setNewDessertIds}
                    searchable
                    clearable
                    disabled={readOnly}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold mb-1">Reason for Change</label>
                  <textarea rows={2} value={changeReason} disabled={readOnly} onChange={e => setChangeReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" placeholder="Why was the meal changed?" />
                </div>
              </div>
            )}
          </div>
          )}

          {/* Alternate meals for specific residents */}
          {!readOnly && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 relative z-20">
            <div className="flex items-center justify-between">
              <div className="font-bold">Alternate Meals for Residents</div>
              {!readOnly && (
                <Button size="sm" onClick={addAlternate} iconName="Plus" iconPosition="left">Add Alternate</Button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {alternates.length === 0 && (
                <div className="text-sm text-muted-foreground">No alternate meals recorded.</div>
              )}
              {alternates.map((row, idx) => {
                const mealInfo = getMealInfo(row.alternateMealId);
                const sidePrice = (row.alternateSideMealIds || []).reduce((sum, id) => {
                  const m = meals.find(x => x.id === id);
                  return sum + (m ? Number(m.cost_per_person || 0) : 0);
                }, 0);
                const dessertPrice = (row.alternateDessertIds || []).reduce((sum, id) => {
                  const m = meals.find(x => x.id === id);
                  return sum + (m ? Number(m.cost_per_person || 0) : 0);
                }, 0);
                const totalAltPrice = Number(row.residentCount || 0) * (Number(mealInfo.price || 0) + sidePrice + dessertPrice);
                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg relative z-30">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Count of Residents</label>
                      <input type="number" min="0" value={row.residentCount || ''} disabled={readOnly} onChange={e => updateAlternate(idx, { residentCount: e.target.value })} className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" placeholder="0" />
                    </div>
                    <div className="md:col-span-3 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Alternate Main Meal</label>
                      <Select
                        options={[{ value: '', label: 'Select meal' }, ...mainMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))]}
                        value={row.alternateMealId || ''}
                        onChange={(v) => updateAlternate(idx, { alternateMealId: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-3 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Alternate Side Meals (optional)</label>
                      <Select
                        multiple
                        options={sideMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                        value={row.alternateSideMealIds || []}
                        onChange={(v) => updateAlternate(idx, { alternateSideMealIds: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-2 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Desserts (optional)</label>
                      <Select
                        multiple
                        options={dessertMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                        value={row.alternateDessertIds || []}
                        onChange={(v) => updateAlternate(idx, { alternateDessertIds: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Reason</label>
                      <input type="text" value={row.reason} disabled={readOnly} onChange={e => updateAlternate(idx, { reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" placeholder="Reason" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Cost</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">£{totalAltPrice.toFixed(2)}</div>
                    </div>
                    {!readOnly && (
                      <div className="md:col-span-1 flex justify-end">
                        <button className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" onClick={() => removeAlternate(idx)} type="button">
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Special meals for residents */}
          {!readOnly && (
          <div className="rounded-xl border border-purple-200 dark:border-purple-700 p-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="font-bold text-purple-700 dark:text-purple-300">Special Meals for Residents</div>
              {!readOnly && (
                <Button size="sm" onClick={addSpecialMeal} iconName="Plus" iconPosition="left">Add Special Meal</Button>
              )}
            </div>
            <div className="mt-3 space-y-3">
              {specialMeals.length === 0 && (
                <div className="text-sm text-muted-foreground">No special meals recorded.</div>
              )}
              {specialMeals.map((row, idx) => {
                const mealInfo = getMealInfo(row.specialMealId);
                const sidePrice = (row.specialSideMealIds || []).reduce((sum, id) => {
                  const m = meals.find(x => x.id === id);
                  return sum + (m ? Number(m.cost_per_person || 0) : 0);
                }, 0);
                const dessertPrice = (row.specialDessertIds || []).reduce((sum, id) => {
                  const m = meals.find(x => x.id === id);
                  return sum + (m ? Number(m.cost_per_person || 0) : 0);
                }, 0);
                const totalSpecialPrice = Number(row.residentCount || 0) * (Number(mealInfo.price || 0) + sidePrice + dessertPrice);
                return (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg relative z-10">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Count of Residents</label>
                      <input type="number" min="0" value={row.residentCount || ''} disabled={readOnly} onChange={e => updateSpecialMeal(idx, { residentCount: e.target.value })} className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" placeholder="0" />
                    </div>
                    <div className="md:col-span-3 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Special Main Meal</label>
                      <Select
                        options={[{ value: '', label: 'Select meal' }, ...mainMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))]}
                        value={row.specialMealId || ''}
                        onChange={(v) => updateSpecialMeal(idx, { specialMealId: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-3 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Special Side Meals (optional)</label>
                      <Select
                        multiple
                        options={sideMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                        value={row.specialSideMealIds || []}
                        onChange={(v) => updateSpecialMeal(idx, { specialSideMealIds: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-2 relative overflow-visible">
                      <label className="block text-xs font-bold mb-1">Desserts (optional)</label>
                      <Select
                        multiple
                        options={dessertMeals.map(m => ({ value: m.id, label: `${m.name} - £${Number(m.cost_per_person || 0).toFixed(2)}` }))}
                        value={row.specialDessertIds || []}
                        onChange={(v) => updateSpecialMeal(idx, { specialDessertIds: v })}
                        searchable
                        clearable
                        disabled={readOnly}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold mb-1">Reason</label>
                      <input type="text" value={row.reason} disabled={readOnly} onChange={e => updateSpecialMeal(idx, { reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" placeholder="Reason" />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Cost</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">£{totalSpecialPrice.toFixed(2)}</div>
                    </div>
                    {!readOnly && (
                      <div className="md:col-span-1 flex justify-end">
                        <button className="px-3 py-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" onClick={() => removeSpecialMeal(idx)} type="button">
                          <Icon name="Trash2" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* Edit Reason */}
        {!readOnly && initialStatus?.confirmedBy && (!initialStatus?.editedAt || isSecondEdit) && (
          <div className="p-6 border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
              <Icon name="AlertTriangle" size={16} />
              {isSecondEdit ? 'Override Edit - Reason Required' : 'Editing Confirmation (One-Time Only)'}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-3">
              {isSecondEdit 
                ? 'This is a one-time admin-approved override. Please explain why this edit is necessary.' 
                : 'You can edit this confirmation only once, and only on the same day. Please provide a reason for the edit.'}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-amber-700 dark:text-amber-300">Edit Reason *</label>
              <textarea
                rows={2}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-700 text-foreground"
                placeholder={isSecondEdit ? "Why is this override edit necessary?" : "Why are you editing this confirmation?"}
                required
              />
            </div>
          </div>
        )}

        {/* Block messages */}
        {!readOnly && initialStatus?.editedAt && !isSecondEdit && (
          <div className="p-6 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <div className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <Icon name="Lock" size={16} />
              Cannot Edit
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-2">
              This confirmation has already been edited once and cannot be modified again. Contact admin if further changes are needed.
            </div>
          </div>
        )}

        {/* Override edit message */}
        {!readOnly && isSecondEdit && (
          <div className="p-6 border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Icon name="ShieldAlert" size={16} />
              Override Edit - Admin Approved
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              You are using a one-time admin-approved override permission to edit this record again. This can only be done once.
            </div>
          </div>
        )}

        {!readOnly && initialStatus?.confirmedBy && !initialStatus?.editedAt && !isSecondEdit && date !== new Date().toISOString().slice(0, 10) && userRole === 'staff' && (
          <div className="p-6 border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <div className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
              <Icon name="Calendar" size={16} />
              Cannot Edit Past Records
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-2">
              Staff can only edit confirmations on the same day they were created. Contact your manager for assistance.
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex-1">
            {!readOnly && disableReason && !canSave && (
              <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <Icon name="AlertCircle" size={14} />
                <span>{disableReason}</span>
              </div>
            )}
            {!readOnly && isSecondEdit && editReason.trim() && canSave && (
              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Icon name="Edit" size={14} />
                <span>Override edit mode - changes will be logged</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {!readOnly && (
              <div title={disableReason && !canSave ? disableReason : ''}>
                <Button onClick={handleSave} disabled={!canSave} iconName="Save" iconPosition="left">
                  {initialStatus?.confirmedBy ? 'Update Status' : 'Save Status'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeliveryModal;
