import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import supabase from '../../../services/supabaseClient';

const MenuManagementPanel = ({ careHomes, currentCareHome, onCareHomeChange, onMenuSave, userRole, careHomeName, availableMeals = [], isLoadingMeals = false }) => {
  const [draggedMeal, setDraggedMeal] = useState(null);
  const [draggingId, setDraggingId] = useState(null); // Track which card is being dragged for visual feedback
  const [schedule, setSchedule] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoadingCycle, setIsLoadingCycle] = useState(false);
  const [currentCycleId, setCurrentCycleId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [cycleLength, setCycleLength] = useState(3); // Default to 3 weeks
  const [customCycleLength, setCustomCycleLength] = useState('');
  const [weekOffset, setWeekOffset] = useState(0); // Which week to start from (0 = Week 1, 1 = Week 2, etc.)
  const [showCycleOptions, setShowCycleOptions] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState(null); // Track which slot is selected
  const [dropError, setDropError] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [viewMeal, setViewMeal] = useState(null);
  const [editMode, setEditMode] = useState('edit'); // 'edit' or 'new'
  const [showModeSelector, setShowModeSelector] = useState(false);

  // Track original cycle metadata to avoid unnecessary updates
  const originalStartDateRef = useRef(startDate);
  const originalCycleLengthRef = useRef(cycleLength);
  const originalWeekOffsetRef = useRef(weekOffset);

  const getCareHomeName = (id) => {
    if (id === null || id === undefined) return null;
    return careHomes.find((home) => String(home.id) === String(id))?.name || null;
  };

  const mealTypesSchedule = ['Breakfast', 'Lunch', 'Supper'];
  const mealTypesPanel = ['Breakfast', 'Lunch', 'Supper', 'Desserts', 'Side', 'Special', 'Festive'];

  const typeMeta = {
    Breakfast: { icon: '🍳', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300' },
    Lunch: { icon: '🥗', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300' },
    // Dinner removed
    Supper: { icon: '🫖', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300' },
    Desserts: { icon: '🍰', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300' },
    Side: { icon: '🥔', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300' },
    Special: { icon: '🎉', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300' },
    Festive: { icon: '🎊', bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300' },
    Other: { icon: '🍴', bg: 'bg-slate-100 dark:bg-slate-900/30', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300' },
  };

  const getTypeMeta = (type) => typeMeta[type] || typeMeta.Other;
  
  // Calculate weeks array based on selected cycle length
  const getWeeksArray = () => {
    if (customCycleLength) {
      const parsed = parseInt(customCycleLength, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return Array.from({ length: parsed }, (_, i) => i + 1);
      }
    }
    return Array.from({ length: cycleLength }, (_, i) => i + 1);
  };
  
  const weeks = getWeeksArray();

  // Group real meals by type and filter by search
  const mealsByType = mealTypesPanel.reduce((acc, type) => {
    const lowerSearch = searchQuery.toLowerCase();
    acc[type] = availableMeals
      .filter(meal => (meal.type || 'Other') === type)
      .filter(meal => meal.name?.toLowerCase().includes(lowerSearch));
    return acc;
  }, {});

  const handleDragStart = (meal, e) => {
    const meta = getTypeMeta(meal.type || 'Other');
    const mealWithIcon = { ...meal, icon: meta.icon };
    setDraggedMeal(mealWithIcon);
    setDraggingId(meal.id);
    
    // Create a custom drag image
    const dragImage = document.createElement('div');
    dragImage.style.position = 'absolute';
    dragImage.style.pointerEvents = 'none';
    dragImage.style.left = '-9999px';
    dragImage.innerHTML = `
      <div style="
        background: linear-gradient(145deg, rgba(99,102,241,0.95), rgba(147,51,234,0.95));
        color: white;
        padding: 14px 18px;
        border-radius: 14px;
        box-shadow: 0 12px 30px rgba(79,70,229,0.35);
        display: flex;
        align-items: center;
        gap: 10px;
        white-space: nowrap;
        font-weight: 700;
        letter-spacing: 0.01em;
      ">
        <span style="font-size: 18px;">${mealWithIcon.icon}</span>
        <span>${mealWithIcon.name}</span>
        <span style="font-size: 11px; padding: 4px 8px; border-radius: 999px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.2);">${meal.type || 'Meal'}</span>
      </div>
    `;
    document.body.appendChild(dragImage);
    
    // Use the custom image for drag
    const img = dragImage.querySelector('div');
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // Clean up after drag starts
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getSlotKey = (week, dayIndex, mealType) => `w${week}-d${dayIndex}-${mealType}`;

  const handleDrop = (week, dayIndex, mealType, slotKind = 'main') => {
    if (!draggedMeal) return;

    const key = getSlotKey(week, dayIndex, mealType);
    setSchedule(prev => {
      const existing = prev[key] || { main: null, sides: [], dessert: null };
      // Sides
      if (slotKind === 'side') {
        if (draggedMeal.type !== 'Side') {
          setDropError('Only Side meals can be placed in the Side slot');
          setTimeout(() => setDropError(''), 2000);
          return prev;
        }
        // Prevent duplicate sides
        if (existing.sides.some(m => m.id === draggedMeal.id)) {
          setDropError('This side is already added');
          setTimeout(() => setDropError(''), 2000);
          return prev;
        }
        return {
          ...prev,
          [key]: { ...existing, sides: [...existing.sides, draggedMeal] }
        };
      }
      // Dessert
      if (slotKind === 'dessert') {
        if (draggedMeal.type !== 'Desserts') {
          setDropError('Only Desserts can be placed in the Dessert slot');
          setTimeout(() => setDropError(''), 2000);
          return prev;
        }
        return {
          ...prev,
          [key]: { ...existing, dessert: draggedMeal }
        };
      }
      // Main
      if (draggedMeal.type === 'Side' || draggedMeal.type === 'Desserts') {
        setDropError(`${draggedMeal.type} cannot be placed in the Main slot`);
        setTimeout(() => setDropError(''), 2000);
        return prev;
      }
      if (draggedMeal.type !== mealType) {
        setDropError(`Cannot place ${draggedMeal.type} into a ${mealType} slot`);
        setTimeout(() => setDropError(''), 2000);
        return prev;
      }
      return {
        ...prev,
        [key]: { ...existing, main: draggedMeal }
      };
    });
    setDraggedMeal(null);
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggedMeal(null);
    setDraggingId(null);
  };

  const handleRemoveMeal = (week, dayIndex, mealType, slotKind = 'main', sideIndex = null) => {
    const key = getSlotKey(week, dayIndex, mealType);
    setSchedule(prev => {
      const updated = { ...prev };
      const entry = updated[key] || { main: null, sides: [], dessert: null };
      if (slotKind === 'side' && sideIndex !== null) {
        entry.sides = entry.sides.filter((_, idx) => idx !== sideIndex);
      } else if (slotKind === 'dessert') {
        entry.dessert = null;
      } else {
        entry[slotKind] = null;
      }
      // If all empty, remove key
      if (!entry.main && (!entry.sides || entry.sides.length === 0) && !entry.dessert) {
        delete updated[key];
      } else {
        updated[key] = entry;
      }
      return updated;
    });
  };

  const handleSaveMenu = async () => {
    setShowDatePicker(true);
  };

  // Load existing cycle when care home changes
  useEffect(() => {
    const loadExistingCycle = async () => {
      // Load cycle for any authenticated user; edits are gated by RLS/admin
      if (!currentCareHome) return;
      
      setIsLoadingCycle(true);
      try {
        // First, auto-deactivate any old cycles that should no longer be active
        // Get all active cycles for this care home
        const { data: allActiveCycles } = await supabase
          .from('meal_cycles')
          .select('id, start_date')
          .eq('care_home_id', currentCareHome)
          .eq('is_active', true)
          .order('start_date', { ascending: false });

        if (allActiveCycles && allActiveCycles.length > 1) {
          // Check if there are multiple active cycles where a newer one's start date has passed
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Find the newest cycle that should be active (start_date <= today)
          const newestActiveCycle = allActiveCycles.find(cycle => {
            const cycleStart = new Date(cycle.start_date);
            cycleStart.setHours(0, 0, 0, 0);
            return cycleStart <= today;
          });

          if (newestActiveCycle) {
            // Deactivate all older cycles (those that are not the newest active one)
            const cyclesToDeactivate = allActiveCycles.filter(cycle => 
              cycle.id !== newestActiveCycle.id && 
              new Date(cycle.start_date) < new Date(newestActiveCycle.start_date)
            );

            if (cyclesToDeactivate.length > 0) {
              const idsToDeactivate = cyclesToDeactivate.map(c => c.id);
              await supabase
                .from('meal_cycles')
                .update({ is_active: false })
                .in('id', idsToDeactivate);
            }
          }
        }

        // Now get all active cycles for this care home
        const { data: cyclesData, error: cycleError } = await supabase
          .from('meal_cycles')
          .select('*')
          .eq('care_home_id', currentCareHome)
          .eq('is_active', true)
          .order('start_date', { ascending: false });

        if (cycleError && cycleError.code !== 'PGRST116') {
          throw cycleError;
        }

        // Get the most recent cycle (highest start_date, whether today or future)
        const cycleData = cyclesData && cyclesData.length > 0 ? cyclesData[0] : null;

        if (!cycleData) {
          // No existing cycle
          setSchedule({});
          setCurrentCycleId(null);
          setCycleLength(3);
          setWeekOffset(0);
          setStartDate(new Date().toISOString().split('T')[0]);
          setIsLoadingCycle(false);
          return;
        }

        // Load the cycle
        setCurrentCycleId(cycleData.id);
        setCycleLength(cycleData.cycle_length_weeks);
        setWeekOffset(cycleData.week_offset || 0);
        setStartDate(cycleData.start_date);
        originalCycleLengthRef.current = cycleData.cycle_length_weeks;
        originalStartDateRef.current = cycleData.start_date;
        originalWeekOffsetRef.current = cycleData.week_offset || 0;

        // Load schedule entries for this cycle
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('meal_schedule')
          .select(`
            *,
            meals:meal_id (id, name, type, description, allergens, image_url, cost_per_person, care_home_id)
          `)
          .eq('meal_cycle_id', cycleData.id);

        if (scheduleError) throw scheduleError;

        // Convert to local schedule format
        const loadedSchedule = {};
        (scheduleData || []).forEach((entry) => {
          const meal = entry.meals;
          if (!meal) return;
          const meta = getTypeMeta(meal.type || 'Other');
          const mealWithIcon = { ...meal, icon: meta.icon };
          const key = getSlotKey(entry.week_number, entry.day_of_week, entry.meal_type);
          if (!loadedSchedule[key]) {
            loadedSchedule[key] = { main: null, sides: [], dessert: null };
          }
          if (entry.slot_kind === 'main') {
            loadedSchedule[key].main = mealWithIcon;
          } else if (entry.slot_kind === 'side') {
            loadedSchedule[key].sides.push(mealWithIcon);
          } else if (entry.slot_kind === 'dessert') {
            loadedSchedule[key].dessert = mealWithIcon;
          }
        });

        setSchedule(loadedSchedule);
      } catch (err) {
        console.error('Error loading meal cycle:', err);
      } finally {
        setIsLoadingCycle(false);
      }
    };

    loadExistingCycle();
  }, [currentCareHome, userRole]);

  const confirmSave = async () => {
    setIsSaving(true);
    setShowDatePicker(false);
    try {
      // Create or update meal cycle
      let cycleId = currentCycleId;
      let auditAction = null;
      
      if (cycleId && editMode === 'edit') {
        // When editing existing cycle, DO NOT change start_date or cycle_length
        // Only update the meal schedule entries (template)
        // This prevents the cycle from restarting
        auditAction = 'updated';
      } else {
        // Create new cycle
        const newStartDate = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        newStartDate.setHours(0, 0, 0, 0);

        // Only deactivate previous cycles if new cycle starts today or in the past
        // If new cycle starts in the future, old cycles remain active until new cycle date
        if (newStartDate <= today) {
          await supabase
            .from('meal_cycles')
            .update({ is_active: false })
            .eq('care_home_id', currentCareHome);
        }

        // Create new cycle
        const { data: newCycle, error: createError } = await supabase
          .from('meal_cycles')
          .insert({
            care_home_id: currentCareHome,
            cycle_name: `${cycleLength}-Week Cycle`,
            cycle_length_weeks: cycleLength,
            week_offset: weekOffset,
            start_date: startDate,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        cycleId = newCycle.id;
        setCurrentCycleId(cycleId);
        // Track original values to detect changes later
        originalStartDateRef.current = startDate;
        originalCycleLengthRef.current = cycleLength;
        originalWeekOffsetRef.current = weekOffset;
        auditAction = 'created';
        // Reset to edit mode after creating
        setEditMode('edit');
      }

      // Build desired schedule entries
      const scheduleEntries = [];
      Object.keys(schedule).forEach((key) => {
        // Parse key: w{week}-d{day}-{mealType}
        const match = key.match(/^w(\d+)-d(\d+)-(.+)$/);
        if (!match) return;

        const [, week, day, mealType] = match;
        const entry = schedule[key];

        if (entry.main) {
          scheduleEntries.push({
            meal_cycle_id: cycleId,
            meal_id: entry.main.id,
            week_number: parseInt(week, 10),
            day_of_week: parseInt(day, 10),
            meal_type: mealType,
            slot_kind: 'main',
          });
        }
        if (entry.sides && Array.isArray(entry.sides)) {
          entry.sides.forEach((sideMeal) => {
            scheduleEntries.push({
              meal_cycle_id: cycleId,
              meal_id: sideMeal.id,
              week_number: parseInt(week, 10),
              day_of_week: parseInt(day, 10),
              meal_type: mealType,
              slot_kind: 'side',
            });
          });
        }
        if (entry.dessert) {
          scheduleEntries.push({
            meal_cycle_id: cycleId,
            meal_id: entry.dessert.id,
            week_number: parseInt(week, 10),
            day_of_week: parseInt(day, 10),
            meal_type: mealType,
            slot_kind: 'dessert',
          });
        }
      });

      // Fetch existing schedule to compute deletes
      const { data: existingRows, error: fetchExistingError } = await supabase
        .from('meal_schedule')
        .select('id, week_number, day_of_week, meal_type, slot_kind, meal_id')
        .eq('meal_cycle_id', cycleId);

      if (fetchExistingError) throw fetchExistingError;

      const newKeys = new Set(
        scheduleEntries.map(r => `${r.week_number}-${r.day_of_week}-${r.meal_type}-${r.slot_kind}-${r.meal_id}`)
      );
      const toDeleteIds = (existingRows || [])
        .filter(r => !newKeys.has(`${r.week_number}-${r.day_of_week}-${r.meal_type}-${r.slot_kind}-${r.meal_id}`))
        .map(r => r.id);

      if (toDeleteIds.length > 0) {
        const { error: targetedDeleteError } = await supabase
          .from('meal_schedule')
          .delete()
          .in('id', toDeleteIds);
        if (targetedDeleteError) throw targetedDeleteError;
      }

      // Replace existing rows for this cycle with the desired rows.
      // Using delete + insert avoids RLS/update issues caused by ON CONFLICT DO UPDATE.
      // Delete all existing rows for this cycle (we already computed toDeleteIds earlier,
      // but to be robust remove any remaining rows for the cycle)
      const { error: deleteAllError } = await supabase
        .from('meal_schedule')
        .delete()
        .eq('meal_cycle_id', cycleId);
      if (deleteAllError) throw deleteAllError;

      if (scheduleEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('meal_schedule')
          .insert(scheduleEntries);
        if (insertError) throw insertError;
      }

      // If schedule rows were added/deleted, mark as an update for auditing
      if ((toDeleteIds && toDeleteIds.length > 0) || (scheduleEntries && scheduleEntries.length > 0)) {
        auditAction = auditAction || 'updated';
      }

      onMenuSave(schedule, currentCareHome, startDate, cycleId);
      // Insert a single summary audit log for this cycle change (best-effort)
      try {
        if (auditAction) {
          const { data: { user } = {} } = await supabase.auth.getUser();
          const actorName = (user && (user.user_metadata?.full_name || user.user_metadata?.name)) || (user && user.email) || 'Unknown User';
          await supabase.from('audit_logs').insert({
            care_home_id: currentCareHome,
            source_table: 'meal_cycles',
            entity_type: 'meal_cycle',
            entity_id: cycleId,
            action: auditAction === 'created' ? 'meal_cycle_created' : 'meal_cycle_updated',
            summary: `${actorName} ${auditAction === 'created' ? 'created' : 'updated'} ${cycleLength}-week meal cycle starting ${startDate}`,
            notes: `schedule_entries=${scheduleEntries.length}`,
            before_data: null,
            after_data: { cycle_length_weeks: cycleLength, start_date: startDate },
            actor_user_id: user?.id || null,
            actor_name: actorName,
            actor_role: user?.app_metadata?.role || user?.role || null,
            actor_care_home_id: user?.user_metadata?.care_home_id || currentCareHome || null,
            actor_org: null,
            changed_at: new Date().toISOString(),
          });
        }
      } catch (auditErr) {
        console.warn('Failed to insert audit summary for meal cycle change', auditErr);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving menu:', error);
      const msg = [error.message, error.details, error.hint].filter(Boolean).join('\n');
      alert(`Failed to save menu cycle.\n${msg || ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCycleLengthChange = (length) => {
    if (length === 'custom') {
      setIsCustomMode(true);
      setCustomCycleLength('');
    } else {
      setCycleLength(length);
      setShowCycleOptions(false);
      setCustomCycleLength('');
      setIsCustomMode(false);
      // Clear schedule when changing cycle to avoid inconsistencies
      setSchedule({});
    }
  };

  const handleCustomCycleSubmit = () => {
    const length = parseInt(customCycleLength, 10);
    if (length && length > 0 && length <= 52) {
      setCycleLength(length);
      setShowCycleOptions(false);
      setIsCustomMode(false);
      // Clear schedule when changing cycle to avoid inconsistencies
      setSchedule({});
    }
  };

  const handleSwapWeeks = (week1, week2) => {
    // Swap only in the schedule state (frontend only)
    const newSchedule = {};
    
    // Copy all existing schedule data
    Object.keys(schedule).forEach(key => {
      newSchedule[key] = { ...schedule[key] };
    });
    
    // Get all keys for both weeks
    const week1Keys = Object.keys(schedule).filter(k => k.startsWith(`w${week1}-`));
    const week2Keys = Object.keys(schedule).filter(k => k.startsWith(`w${week2}-`));

    // Clear the old positions in newSchedule
    week1Keys.forEach(key => delete newSchedule[key]);
    week2Keys.forEach(key => delete newSchedule[key]);

    // Move week1 data to week2 positions
    week1Keys.forEach(key => {
      const newKey = key.replace(`w${week1}-`, `w${week2}-`);
      newSchedule[newKey] = { ...schedule[key] };
    });

    // Move week2 data to week1 positions
    week2Keys.forEach(key => {
      const newKey = key.replace(`w${week2}-`, `w${week1}-`);
      newSchedule[newKey] = { ...schedule[key] };
    });

    setSchedule(newSchedule);
    setSaveSuccess(false); // Reset save indicator since we've made changes
  };

  const handleMoveWeekUp = (week) => {
    if (week <= 1) return; // Can't move week 1 up
    handleSwapWeeks(week, week - 1);
  };

  const handleMoveWeekDown = (week) => {
    if (week >= cycleLength) return; // Can't move last week down
    handleSwapWeeks(week, week + 1);
  };

  const handleMealSlotClick = (week, dayIndex, mealType, slotKind = 'main') => {
    setSelectedMealSlot({ week, dayIndex, mealType, slotKind });
    setModalSearch('');
  };

  const handleSelectMealFromModal = (meal) => {
    if (!selectedMealSlot) return;

    const meta = getTypeMeta(meal.type || 'Other');
    const key = getSlotKey(selectedMealSlot.week, selectedMealSlot.dayIndex, selectedMealSlot.mealType);
    setSchedule(prev => {
      const existing = prev[key] || { main: null, sides: [], dessert: null };
      if (selectedMealSlot.slotKind === 'side') {
        if (meal.type !== 'Side') return prev;
        // Prevent duplicate sides
        if (existing.sides.some(m => m.id === meal.id)) return prev;
        return {
          ...prev,
          [key]: { ...existing, sides: [...existing.sides, { ...meal, icon: meta.icon }] }
        };
      } else if (selectedMealSlot.slotKind === 'dessert') {
        if (meal.type !== 'Desserts') return prev;
        return {
          ...prev,
          [key]: { ...existing, dessert: { ...meal, icon: meta.icon } }
        };
      } else {
        if (meal.type === 'Side' || meal.type === 'Desserts') return prev;
        if (meal.type !== selectedMealSlot.mealType) return prev;
        return {
          ...prev,
          [key]: { ...existing, main: { ...meal, icon: meta.icon } }
        };
      }
    });
    setSelectedMealSlot(null);
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getScheduledMeal = (week, dayIndex, mealType) => {
    const key = getSlotKey(week, dayIndex, mealType);
    const entry = schedule[key];
    if (!entry) return { main: null, sides: [], dessert: null };
    return {
      main: entry.main || null,
      sides: entry.sides || [],
      dessert: entry.dessert || null,
    };
  };

  return (
    <div className="space-y-4">
      {dropError && (
        <div className="fixed top-16 inset-x-0 flex justify-center z-[120] pointer-events-none">
          <div className="pointer-events-auto rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold shadow-lg shadow-red-200/60 animate-[fade-in_150ms_ease-out,slide-down_150ms_ease-out]">
            {dropError}
          </div>
        </div>
      )}

      {/* Care Home and Cycle Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Care Home Selector or Display */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          {userRole === 'admin' ? (
            <>
              <h3 className="w-full text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Icon name="Building2" size={20} />
                Select Care Home
              </h3>
              <div className="flex flex-wrap gap-2 w-full">
                {careHomes.map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => onCareHomeChange(ch.id)}
                    className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                      currentCareHome === ch.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {ch.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-full blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Icon name="Building2" size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your Facility</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{careHomeName}</h3>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Icon name="CalendarCheck" size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Setup meals for your residents
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Menu Cycle Selector */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon name="Calendar" size={20} />
            Menu Cycle
          </h3>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{cycleLength}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Week{cycleLength > 1 ? 's' : ''}</p>
              {currentCycleId && editMode === 'edit' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <Icon name="Lock" size={12} />
                  Locked when editing
                </p>
              )}
            </div>
            {(!currentCycleId || editMode === 'new') && (
              <button
                onClick={() => setShowCycleOptions(!showCycleOptions)}
                className="px-4 py-2.5 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-all flex items-center gap-2"
              >
                <Icon name="Edit" size={16} />
                Change
              </button>
            )}
          </div>

          {showCycleOptions && (
            <div className="mt-4 pt-4 border-t-2 border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(length => (
                  <button
                    key={length}
                    onClick={() => handleCycleLengthChange(length)}
                    className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                      cycleLength === length
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {length}w
                  </button>
                ))}
                <button
                  onClick={() => handleCycleLengthChange('custom')}
                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${
                    isCustomMode
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomMode && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    placeholder="Weeks (1-52)"
                    value={customCycleLength}
                    onChange={(e) => setCustomCycleLength(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                  />
                  <button
                    onClick={handleCustomCycleSubmit}
                    disabled={!customCycleLength}
                    className="px-3 py-2 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white transition-all"
                  >
                    <Icon name="Check" size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mode Selector - Edit Existing or Create New */}
      {currentCycleId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Icon name={editMode === 'edit' ? 'Edit' : 'Plus'} size={20} />
                {editMode === 'edit' ? 'Editing Current Menu Cycle' : 'Creating New Menu Cycle'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {editMode === 'edit' 
                  ? 'Update meals in the cycle template - the schedule continues without restarting'
                  : 'Create a new cycle without affecting current schedules'}
              </p>
            </div>
            <button
              onClick={() => {
                if (editMode === 'new') {
                  // Going back to edit mode - reload the current cycle
                  setEditMode('edit');
                  setSchedule({});
                  window.location.reload(); // Simple way to reload current cycle
                } else {
                  // Switch to new mode
                  setEditMode('new');
                  setSchedule({}); // Clear schedule for new cycle
                  setStartDate(new Date().toISOString().split('T')[0]); // Reset to today
                }
              }}
              className="px-4 py-2.5 rounded-lg font-bold bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white transition-all flex items-center gap-2 shadow-lg"
            >
              <Icon name={editMode === 'edit' ? 'Plus' : 'Edit'} size={16} />
              {editMode === 'edit' ? 'Create New Cycle' : 'Back to Edit Mode'}
            </button>
          </div>
        </div>
      )}

      {/* No Cycle Yet Message */}
      {!currentCycleId && !isLoadingCycle && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-2xl shadow-lg p-8 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Icon name="Calendar" size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Menu Cycle Yet</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Create your first menu cycle to get started</p>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            A menu cycle helps you plan meals for multiple weeks at once. You can drag and drop meals into the calendar below, then save your cycle.
          </p>
        </div>
      )}

      {/* Main Content - Meals and Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Side - Meal Options */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 h-full">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Icon name="UtensilsCrossed" size={20} />
              Available Meals
            </h3>

            {/* Search Input */}
            <div className="mb-4 relative">
              <input
                type="text"
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
              />
              <Icon name="Search" size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>
            <div className="space-y-4 max-h-[550px] overflow-y-auto">
              {isLoadingMeals && (
                <div className="text-sm text-slate-500 dark:text-slate-400">Loading meals…</div>
              )}

              {!isLoadingMeals && mealTypesPanel.map((mealType) => {
                const meta = getTypeMeta(mealType);
                const mealsForType = mealsByType[mealType] || [];

                return (
                  <div key={mealType} className={`rounded-xl border-2 ${meta.border} overflow-hidden`}>
                    {/* Category Header */}
                    <div className={`${meta.bg} px-4 py-3 border-b-2 ${meta.border}`}>
                      <h4 className={`font-bold text-sm ${meta.text} flex items-center gap-2`}>
                        <span className="text-lg">{meta.icon}</span>
                        {mealType} ({mealsForType.length})
                      </h4>
                    </div>

                    {/* Meals in this category */}
                    <div className="space-y-2 p-3">
                      {mealsForType.length > 0 ? (
                        mealsForType.map((meal) => {
                          const mealMeta = getTypeMeta(meal.type || 'Other');
                          return (
                            <div
                              key={meal.id}
                              draggable
                              onDragStart={(e) => handleDragStart(meal, e)}
                              onDragEnd={handleDragEnd}
                              className={`relative p-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 cursor-move transition-all hover:shadow-xl hover:scale-105 hover:border-indigo-400 dark:hover:border-indigo-500 ${mealMeta.bg.replace('100', '50')} group ${draggingId === meal.id ? 'ring-2 ring-indigo-400 shadow-2xl scale-[1.02] opacity-70' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg mt-0.5 group-hover:scale-125 transition-transform">{mealMeta.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{meal.name}</p>
                                  {meal.care_home_id === null ? (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-300">Global meal</p>
                                  ) : userRole === 'admin' ? (
                                    <p className="text-[11px] text-indigo-600 dark:text-indigo-300 truncate">{getCareHomeName(meal.care_home_id) || 'Care home meal'}</p>
                                  ) : (
                                    <p className="text-[11px] text-indigo-600 dark:text-indigo-300">Custom meal</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewMeal(meal);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/40"
                                  >
                                    <Icon name="Eye" size={12} />
                                    View
                                  </button>
                                  <Icon name="GripHorizontal" size={14} className="text-slate-500 dark:text-slate-400" />
                                </div>
                              </div>

                              {/* Hover tooltip for full meal name */}
                              <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 group-hover:-translate-y-[110%] transition-all duration-150">
                                <div className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs shadow-lg whitespace-nowrap max-w-[220px] truncate border border-slate-700">
                                  {meal.name}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">No meals found</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3-Week Schedule Grid */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 overflow-x-auto max-h-[700px] overflow-y-auto lg:col-span-3">
          {isLoadingCycle ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading meal cycle...</p>
              </div>
            </div>
          ) : (
            weeks.map(week => (
            <div key={week} className="mb-8">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-indigo-200 dark:border-indigo-800">
                <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  Week {week}
                </h4>
                <div className="flex items-center gap-2">
                  {week > 1 && (
                    <button
                      onClick={() => handleMoveWeekUp(week)}
                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                      title="Move week up"
                    >
                      <Icon name="ArrowUp" size={18} />
                    </button>
                  )}
                  {week < cycleLength && (
                    <button
                      onClick={() => handleMoveWeekDown(week)}
                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                      title="Move week down"
                    >
                      <Icon name="ArrowDown" size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {mealTypesSchedule.map(mealType => (
                  <div key={`${week}-${mealType}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase w-24">{mealType}</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {dayNames.map((day, dayIndex) => {
                        const slot = getScheduledMeal(week, dayIndex, mealType);
                        const renderSlot = (label, slotKind) => {
                          const meal = slot[slotKind];
                          return (
                            <div
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(week, dayIndex, mealType, slotKind)}
                              onClick={() => !meal && handleMealSlotClick(week, dayIndex, mealType, slotKind)}
                              className={`w-full p-2 rounded-lg border-2 border-dashed transition-all min-h-[90px] flex flex-col items-center justify-center text-center ${
                                meal
                                  ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20'
                                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/20 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer'
                              }`}
                            >
                              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-500 mb-1">{label}</p>
                              {meal ? (
                                <div className="flex flex-col items-center gap-2 w-full">
                                  <span className="text-lg">{meal.icon}</span>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{meal.name}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMeal(week, dayIndex, mealType, slotKind);
                                    }}
                                    className="mt-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                    title="Remove meal"
                                  >
                                    <Icon name="X" size={14} />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500 dark:text-slate-500">Click or drag to add</p>
                              )}
                            </div>
                          );
                        };
                        const isTodayLabel = day.slice(0, 3);
                        return (
                          <div
                            key={`${week}-${dayIndex}-${mealType}`}
                            className="p-2 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex flex-col gap-2"
                          >
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{isTodayLabel}</p>
                            {renderSlot('Main', 'main')}
                            {/* Multiple Sides */}
                            {slot.sides.map((sideMeal, idx) => (
                              <div key={sideMeal.id} className="w-full flex flex-col items-center mt-1">
                                <div className="flex flex-col items-center gap-2 w-full border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                                  <span className="text-lg">{sideMeal.icon}</span>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{sideMeal.name}</p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMeal(week, dayIndex, mealType, 'side', idx);
                                    }}
                                    className="mt-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                    title="Remove side"
                                  >
                                    <Icon name="X" size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {/* Add Side button */}
                            <div className="w-full mt-1">
                              <button
                                type="button"
                                onClick={() => handleMealSlotClick(week, dayIndex, mealType, 'side')}
                                className="w-full text-[11px] text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg py-1 mt-1 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                              >
                                + Add Side
                              </button>
                            </div>
                            {/* Dessert slot for Lunch and Supper only */}
                            {(mealType === 'Lunch' || mealType === 'Supper') && (
                              <div className="w-full mt-1">
                                {slot.dessert ? (
                                  <div className="flex flex-col items-center gap-2 w-full border-2 border-pink-300 dark:border-pink-700 bg-pink-50 dark:bg-pink-900/20 rounded-lg p-2">
                                    <span className="text-lg">{slot.dessert.icon}</span>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2">{slot.dessert.name}</p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMeal(week, dayIndex, mealType, 'dessert');
                                      }}
                                      className="mt-1 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                                      title="Remove dessert"
                                    >
                                      <Icon name="X" size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleMealSlotClick(week, dayIndex, mealType, 'dessert')}
                                    className="w-full text-[11px] text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700 rounded-lg py-1 mt-1 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                                  >
                                    + Add Dessert
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Save / Reset */}
      <div className="flex gap-3">
        <button
          onClick={handleSaveMenu}
          disabled={isSaving}
          className={`flex-1 px-6 py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
            isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : saveSuccess
                ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg'
          }`}
        >
          <Icon name={saveSuccess ? 'Check' : 'Save'} size={20} />
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : editMode === 'new' ? `Create ${cycleLength}-Week Menu` : `Update Meal Template`}
        </button>
        
        <button
          onClick={() => setSchedule({})}
          className="px-6 py-3 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
        >
          <Icon name="RotateCcw" size={20} />
          Reset
        </button>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Icon name="Calendar" size={24} />
              {editMode === 'new' ? 'New Menu Start Date' : 'Confirm Changes'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {editMode === 'new' 
                ? 'When should this new menu cycle begin?' 
                : 'Save your meal template changes? The cycle will continue without restarting.'}
            </p>
            {editMode === 'new' && (
              <>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <Icon name="Info" size={14} />
                    This will create a new cycle without affecting current meal schedules
                  </p>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Start from Week Number
                  </label>
                  <select
                    value={weekOffset}
                    onChange={(e) => setWeekOffset(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                  >
                    {Array.from({ length: cycleLength }, (_, i) => (
                      <option key={i} value={i}>
                        Week {i + 1}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Choose which week of the cycle to start from this week
                  </p>
                </div>
                
                {/* Week Schedule Preview */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Icon name="CalendarDays" size={14} />
                    Cycle Schedule Preview
                  </p>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {(() => {
                      const start = new Date(startDate);
                      const previews = [];
                      for (let i = 0; i < Math.min(cycleLength * 2, 6); i++) {
                        const weekStart = new Date(start);
                        weekStart.setDate(weekStart.getDate() + (i * 7));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        const weekNum = ((weekOffset + i) % cycleLength) + 1;
                        previews.push(
                          <div key={i} className={i < cycleLength ? 'font-medium' : ''}>
                            Week {weekNum}: {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        );
                      }
                      return previews;
                    })()}
                  </div>
                </div>
              </>
            )}
            {editMode === 'edit' && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2 mb-2">
                  <Icon name="CheckCircle" size={16} />
                  <span className="font-semibold">Cycle continues normally</span>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  • Start date: {new Date(originalStartDateRef.current).toLocaleDateString()}<br />
                  • Cycle length: {originalCycleLengthRef.current} week{originalCycleLengthRef.current > 1 ? 's' : ''}<br />
                  • Only meal assignments will be updated
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Icon name="Check" size={18} />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Selection Modal */}
      {selectedMealSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">{getTypeMeta(selectedMealSlot.mealType).icon}</span>
                Select {selectedMealSlot.slotKind === 'side' ? 'Side' : 'Main'} for {selectedMealSlot.mealType}
              </h3>
              <button
                onClick={() => setSelectedMealSlot(null)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Icon name="X" size={20} className="text-slate-700 dark:text-slate-300" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {dayNames[selectedMealSlot.dayIndex]} - Week {selectedMealSlot.week}
            </p>
            <div className="mb-4 relative">
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder={`Search ${selectedMealSlot.mealType}...`}
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
              />
              <Icon name="Search" size={18} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            </div>

            <div className="space-y-2">
              {(() => {
                let meals = [];
                if (selectedMealSlot.slotKind === 'side') {
                  meals = mealsByType['Side'] || [];
                } else if (selectedMealSlot.slotKind === 'dessert') {
                  meals = mealsByType['Desserts'] || [];
                } else {
                  meals = mealsByType[selectedMealSlot.mealType] || [];
                }
                return meals
                  .filter(meal => meal.name.toLowerCase().includes(modalSearch.toLowerCase()))
                  .map(meal => {
                    const meta = getTypeMeta(meal.type || 'Other');
                    return (
                      <button
                        key={meal.id}
                        onClick={() => handleSelectMealFromModal(meal)}
                        className={`w-full p-4 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-left transition-all hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 ${meta.bg}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl">{meta.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 dark:text-white">{meal.name}</p>
                            <div className="flex items-center gap-3">
                              <p className="text-xs text-slate-600 dark:text-slate-400">{meal.type}</p>
                              {meal.care_home_id === null ? (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-300">Global meal</p>
                              ) : userRole === 'admin' ? (
                                <p className="text-[11px] text-indigo-600 dark:text-indigo-300 truncate">{getCareHomeName(meal.care_home_id) || 'Care home meal'}</p>
                              ) : (
                                <p className="text-[11px] text-indigo-600 dark:text-indigo-300">Custom meal</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  });
              })()}
              {(() => {
                let meals = [];
                if (selectedMealSlot.slotKind === 'side') {
                  meals = mealsByType['Side'] || [];
                } else if (selectedMealSlot.slotKind === 'dessert') {
                  meals = mealsByType['Desserts'] || [];
                } else {
                  meals = mealsByType[selectedMealSlot.mealType] || [];
                }
                return meals.filter(meal => meal.name.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                  <p className="text-center py-6 text-slate-500 dark:text-slate-400">
                    No {selectedMealSlot.slotKind === 'side' ? 'Side' : selectedMealSlot.slotKind === 'dessert' ? 'Dessert' : selectedMealSlot.mealType} meals available
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {viewMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" onClick={() => setViewMeal(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52 bg-slate-100 dark:bg-slate-900 overflow-hidden">
              {viewMeal.image ? (
                <img src={viewMeal.image} alt={viewMeal.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">{getTypeMeta(viewMeal.type || 'Other').icon}</div>
              )}
              <button
                onClick={() => setViewMeal(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 shadow hover:bg-white"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="text-lg">{getTypeMeta(viewMeal.type || 'Other').icon}</span>
                    {viewMeal.type || 'Meal'}
                    {viewMeal.care_home_id === null && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Global meal</span>
                    )}
                    {viewMeal.care_home_id !== null && userRole === 'admin' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {getCareHomeName(viewMeal.care_home_id) || 'Care home meal'}
                      </span>
                    )}
                    {viewMeal.care_home_id !== null && userRole !== 'admin' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Custom meal</span>
                    )}
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewMeal.name}</h3>
                  {viewMeal.description && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">{viewMeal.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">£{Number(viewMeal.costPerServing || 0).toFixed(2)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">per serving</p>
                </div>
              </div>

              {viewMeal.allergens && viewMeal.allergens.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
                    <Icon name="AlertTriangle" size={14} className="text-red-500" />
                    Allergens
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {viewMeal.allergens.map((allergen, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setViewMeal(null)}
                  className="px-4 py-2 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementPanel;
