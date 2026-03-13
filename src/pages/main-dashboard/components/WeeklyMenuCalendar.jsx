import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { getMealScheduleForDateRange, listDeliveryStatuses } from '../../../services/deliveryService';
import Skeleton from '../../../components/ui/Skeleton';

// Helper: robust ingredient parser (handles arrays, JSON strings, and JSON-stringified items)
const parseIngredients = (ingredientField) => {
  if (!ingredientField) return [];
  let items = [];
  if (Array.isArray(ingredientField)) items = ingredientField.slice();
  else if (typeof ingredientField === 'string') {
    const trimmed = ingredientField.trim();
    // Try JSON parse first
    try {
      const p = JSON.parse(trimmed);
      if (Array.isArray(p)) items = p;
      else items = [p];
    } catch (e) {
      // Not a top-level JSON array; split by newline/commas
      items = trimmed.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    }
  } else if (typeof ingredientField === 'object') items = [ingredientField];

  // Normalize: if an item is a JSON string, parse it
  const normalized = items.map(it => {
    if (typeof it === 'string') {
      const t = it.trim();
      if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
        try { const p = JSON.parse(t); return p; } catch { /* fallthrough */ }
      }
      return t;
    }
    return it;
  }).flat();

  return normalized.map(it => {
    if (typeof it === 'string') return it;
    if (!it || typeof it !== 'object') return String(it);
    return {
      name: it.name || it.label || JSON.stringify(it),
      amount: it.amount ?? it.quantity ?? it.qty ?? null,
      unit: it.unit || it.u || null,
    };
  });
};

const WeeklyMenuCalendar = ({ careHomes = [], initialCareHomeId, isLoading = false, isAdmin = false }) => {
  const [viewMode, setViewMode] = useState('week'); // 'day' | 'week' | 'month'
  const [selectedCareHome, setSelectedCareHome] = useState(() => {
    if (!isAdmin && initialCareHomeId) return initialCareHomeId;
    return 'all';
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredCell, setHoveredCell] = useState(null);
  const [showTodayFeedback, setShowTodayFeedback] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('Lunch');
  const [mealData, setMealData] = useState([]); // Real meal schedule data
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [selectedMealDetail, setSelectedMealDetail] = useState(null); // Track which meal to show details for

  // Horizontal scroll + swipe hint for monthly All Homes view
  const monthScrollRef = useRef(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  React.useEffect(() => {
    if (initialCareHomeId) {
      setSelectedCareHome(initialCareHomeId);
    }
  }, [initialCareHomeId]);

  // Staff should never see the "All Homes" aggregate
  React.useEffect(() => {
    if (!isAdmin) {
      const fallbackId = initialCareHomeId || careHomes?.[0]?.id || null;
      if (fallbackId && selectedCareHome === 'all') {
        setSelectedCareHome(fallbackId);
      }
    }
  }, [isAdmin, careHomes, initialCareHomeId, selectedCareHome]);

  // Fetch real meal data for current view period
  useEffect(() => {
    const fetchMealData = async () => {
      if (careHomes.length === 0) {
        setMealData([]);
        return;
      }

      setLoadingMeals(true);
      try {
        let startDate = new Date(currentDate);
        let endDate = new Date(currentDate);

        if (viewMode === 'week') {
          // Get week dates
          const day = currentDate.getDay();
          const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(currentDate);
          startDate.setDate(diff);
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6);
        } else if (viewMode === 'month') {
          // Get month dates
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        }

        // Fetch for selected care home(s)
        const careHomeIdsToFetch = selectedCareHome === 'all'
          ? careHomes.map(ch => ch.id)
          : [selectedCareHome];

        const today = new Date().toISOString().split('T')[0];
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // For past dates: fetch confirmed delivery records from meal_delivery_status
        // For today and future: fetch scheduled meals from meal cycles
        let pastData = [];
        let futureData = [];

        // If viewing period includes past dates, fetch confirmed deliveries
        if (startStr <= today) {
          const pastEndStr = endStr <= today ? endStr : today;
          try {
            const result = await listDeliveryStatuses({
              careHomeId: selectedCareHome === 'all' ? null : selectedCareHome,
              startDate: startStr,
              endDate: pastEndStr,
              page: 1,
              pageSize: 1000,
              delivered: null,
              mealType: 'All'
            });
            
            // Collect all meal IDs from delivery records to fetch full details
            const allMealIds = new Set();
            (result.rows || []).forEach(record => {
              if (record.new_main_meal_id) allMealIds.add(record.new_main_meal_id);
              if (record.new_side_meal_id) allMealIds.add(record.new_side_meal_id);
              if (record.new_dessert_meal_id) allMealIds.add(record.new_dessert_meal_id);
              if (Array.isArray(record.newSideMealIds)) {
                record.newSideMealIds.forEach(id => allMealIds.add(id));
              }
              if (Array.isArray(record.new_side_meal_ids)) {
                record.new_side_meal_ids.forEach(id => allMealIds.add(id));
              }
              if (Array.isArray(record.newDessertIds)) {
                record.newDessertIds.forEach(id => allMealIds.add(id));
              }
              if (Array.isArray(record.new_dessert_ids)) {
                record.new_dessert_ids.forEach(id => allMealIds.add(id));
              }
            });

            // Fetch full meal details from database
            let mealsById = {};
            if (allMealIds.size > 0) {
              const { default: supabase } = await import('../../../services/supabaseClient');
              const { data: mealsData, error: mealsError } = await supabase
                .from('meals')
                .select('id, name, type, cost_per_person, image_url, description, allergens, ingredients')
                .in('id', Array.from(allMealIds));
              
              if (!mealsError && mealsData) {
                mealsById = mealsData.reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
              }
            }
            
            // Convert delivery status records to meal schedule format with slot_kind and full meal details
            (result.rows || []).filter(r => r.date <= today).forEach(record => {
              // Add main meal
              const mainMealId = record.new_main_meal_id;
              const mainMealData = mealsById[mainMealId] || {
                id: mainMealId,
                name: record.main_meal_name || 'Unknown',
                cost_per_person: 0,
                image_url: null,
                description: null,
                ingredients: null,
                allergens: null
              };
              
              if (mainMealId || record.main_meal_name) {
                pastData.push({
                  id: `${record.id}-main`,
                  care_home_id: record.care_home_id,
                  date: record.date,
                  meal_type: record.meal_type,
                  slot_kind: 'main',
                  meal: mainMealData,
                  is_confirmed: !!record.confirmed_at,
                  delivered: record.delivered,
                  served_count: record.served_count || record.total_served || 0
                });
              }

              // Add side meals if present
              const sideIds = record.newSideMealIds || record.new_side_meal_ids || [];
              if (Array.isArray(sideIds)) {
                sideIds.forEach((sideId, idx) => {
                  const sideMealData = mealsById[sideId] || {
                    id: sideId,
                    name: 'Side',
                    cost_per_person: 0
                  };
                  pastData.push({
                    id: `${record.id}-side-${idx}`,
                    care_home_id: record.care_home_id,
                    date: record.date,
                    meal_type: record.meal_type,
                    slot_kind: 'side',
                    meal: sideMealData
                  });
                });
              } else if (record.new_side_meal_id) {
                const sideMealData = mealsById[record.new_side_meal_id] || {
                  id: record.new_side_meal_id,
                  name: record.side_meal_name || 'Side',
                  cost_per_person: 0
                };
                pastData.push({
                  id: `${record.id}-side`,
                  care_home_id: record.care_home_id,
                  date: record.date,
                  meal_type: record.meal_type,
                  slot_kind: 'side',
                  meal: sideMealData
                });
              }

              // Add desserts if present
              const dessertIds = record.newDessertIds || record.new_dessert_ids || [];
              if (Array.isArray(dessertIds) && dessertIds.length > 0) {
                dessertIds.forEach((dessertId, idx) => {
                  const dessertMealData = mealsById[dessertId] || {
                    id: dessertId,
                    name: 'Dessert',
                    cost_per_person: 0
                  };
                  pastData.push({
                    id: `${record.id}-dessert-${idx}`,
                    care_home_id: record.care_home_id,
                    date: record.date,
                    meal_type: record.meal_type,
                    slot_kind: 'dessert',
                    meal: dessertMealData
                  });
                });
              } else if (record.new_dessert_meal_id) {
                const dessertMealData = mealsById[record.new_dessert_meal_id] || {
                  id: record.new_dessert_meal_id,
                  name: 'Dessert',
                  cost_per_person: 0
                };
                pastData.push({
                  id: `${record.id}-dessert`,
                  care_home_id: record.care_home_id,
                  date: record.date,
                  meal_type: record.meal_type,
                  slot_kind: 'dessert',
                  meal: dessertMealData
                });
              }
            });
          } catch (err) {
            console.error('Error fetching past delivery records:', err);
          }
        }

        // If viewing period includes today or future, fetch scheduled meals
        if (endStr >= today) {
          const futureStartStr = startStr >= today ? startStr : today;
          const futureStart = new Date(futureStartStr);
          const futureEnd = new Date(endStr);
          futureData = await getMealScheduleForDateRange(careHomeIdsToFetch, futureStart, futureEnd);
        }

        // Combine past confirmed records with future scheduled meals
        // Use a Map with composite key but don't deduplicate by it - we need separate entries for main/side/dessert
        const allMeals = [...pastData, ...futureData];
        
        setMealData(allMeals);
      } catch (error) {
        console.error('Error fetching meal data:', error);
        setMealData([]);
      } finally {
        setLoadingMeals(false);
      }
    };

    fetchMealData();
  }, [viewMode, currentDate, selectedCareHome, careHomes]);

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

  // Meal type configurations with colors and icons
  // Order is controlled by mealOrder; snack placed before dinner with earlier time
  const mealConfig = {
    Breakfast: { icon: '🍳', color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/20', textColor: 'text-orange-700 dark:text-orange-300', time: '8:00 AM', label: 'Breakfast' },
    Lunch: { icon: '🥗', color: 'from-green-500 to-green-600', bgColor: 'bg-green-50 dark:bg-green-950/20', textColor: 'text-green-700 dark:text-green-300', time: '01:00 PM', label: 'Lunch' },
    Supper: { icon: '🍪', color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/20', textColor: 'text-purple-700 dark:text-purple-300', time: '06:00 PM', label: 'Supper' }
  };
  const mealOrder = ['Breakfast', 'Lunch', 'Supper'];

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
    const dates = [];

    // Add leading days from previous month
    const firstDayOfWeek = firstDay.getDay();
    const leadingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    for (let i = leadingDays; i > 0; i--) {
      const date = new Date(year, month, 1 - i);
      dates.push({ date, isCurrentMonth: false });
    }

    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add trailing days from next month
    const remainingDays = 42 - dates.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      dates.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return dates;
  };

  const weekDates = viewMode === 'week' ? getWeekDates(currentDate) : [];
  const monthDates = viewMode === 'month' ? getMonthDates(currentDate) : [];
  const monthCellMinHeight = isAdmin ? 'min-h-[160px]' : 'min-h-[130px]';
  const monthTableMinWidth = isAdmin ? 'min-w-[1400px]' : 'min-w-[1100px]';
  const homeColWidth = isAdmin ? 'minmax(210px, 260px)' : 'minmax(180px, 220px)';
  const dayColWidth = isAdmin ? 'minmax(105px, 1fr)' : 'minmax(85px, 1fr)';

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setShowTodayFeedback(true);
    setTimeout(() => setShowTodayFeedback(false), 2000);
  };

  const getMealForDate = (date, mealType, careHomeId = null) => {
    // Find meal data for the given date, meal type, and care home
    const dateStr = date.toISOString().split('T')[0];
    // Find main, all side meals and dessert for this date/meal/carehome
    const mainMeal = mealData.find(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'main' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    const sideMeals = mealData.filter(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'side' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    const dessertMeal = mealData.find(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'dessert' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    if (!mainMeal && sideMeals.length === 0 && !dessertMeal) return '—';

    const mainName = mainMeal?.meal?.name || 'No meal';
    const sideNames = sideMeals.map(s => s.meal?.name).filter(Boolean).join(' + ');
    const dessertName = dessertMeal?.meal?.name;

    let result = mainName;
    if (sideNames) result += ` & ${sideNames}`;
    if (dessertName) result += ` + ${dessertName}`;
    return result;
  };

  // Helper function to get meal details for Daily view
  const getMealDetails = (date, mealType, careHomeId = null) => {
    const dateStr = date.toISOString().split('T')[0];
    const mainMeal = mealData.find(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'main' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    const sideMeals = mealData.filter(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'side' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    const dessertMeal = mealData.find(m => 
      m.date === dateStr && 
      m.meal_type === mealType &&
      m.slot_kind === 'dessert' &&
      (!careHomeId || m.care_home_id === careHomeId)
    );

    // Use override attached to the schedule (may include arrays for side/dessert)
    const override = mainMeal?.override || (sideMeals[0] && sideMeals[0].override) || null;
    const scheduledMain = mainMeal?.meal || null;
    const overrideMain = override?.override_new_main_meal || null;
    const effectiveMain = override?.changed_for_all && overrideMain ? overrideMain : scheduledMain;
    const mainChanged = !!(override?.changed_for_all && override?.new_main_meal_id && override?.new_main_meal_id !== mainMeal?.meal_id);

    // Sides: prefer override arrays if present
    const effectiveSides = (override?.changed_for_all && override?.override_new_side_meals && override.override_new_side_meals.length > 0)
      ? override.override_new_side_meals
      : (sideMeals || []).map(s => s.meal).filter(Boolean);

    // Desserts: prefer override arrays; aggregate into a single object with joined name and summed cost
    const scheduledDessert = dessertMeal?.meal || null;
    const overrideDesserts = (override?.changed_for_all && override?.override_new_desserts && override.override_new_desserts.length > 0)
      ? override.override_new_desserts
      : (scheduledDessert ? [scheduledDessert] : []);
    const dessertAggregate = overrideDesserts.length > 0 ? {
      name: overrideDesserts.map(d => d.name).join(' + '),
      description: overrideDesserts.map(d => d.description).filter(Boolean).join(' / '),
      image_url: overrideDesserts[0].image_url,
      cost_per_person: overrideDesserts.reduce((s, d) => s + (d.cost_per_person || d.costPerServing || 0), 0),
      ingredients: overrideDesserts.flatMap(d => d.ingredients || []),
      allergens: overrideDesserts.flatMap(d => d.allergens || []),
    } : null;

    return {
      main: effectiveMain,
      sides: effectiveSides,
      dessert: dessertAggregate,
      mainChanged,
      mainChangeFrom: scheduledMain?.name || null,
      mainChangeTo: overrideMain?.name || null,
      mainChangeReason: override?.change_reason || override?.edit_reason || override?.second_edit_reason || null,
    };
  };

  // Render helper to show full main + side on multiple lines, no truncation
  const renderMealForDate = (date, mealType, careHomeId = null) => {
    const { main, sides, dessert } = getMealDetails(date, mealType, careHomeId);
    if (!main && (!sides || sides.length === 0) && !dessert) return <span>—</span>;
    return (
      <div className="whitespace-normal break-normal leading-snug">
        <div className="font-semibold flex items-start gap-2">
          <span>{main?.name || 'No meal'}</span>
        </div>
        {sides && sides.length > 0 ? (
          <div className="text-[12px] opacity-90">+ Side{(sides.length>1)?'s':''}: {sides.map(s=>s.name).filter(Boolean).join(' + ')}</div>
        ) : null}
        {dessert?.name ? (
          <div className="text-[12px] opacity-90">+ Dessert: {dessert.name}</div>
        ) : null}
      </div>
    );
  };

  // Detailed render: includes side availability and side description if present
  const renderMealForDateDetailed = (date, mealType, careHomeId = null) => {
    const { main, sides, dessert, mainChanged, mainChangeFrom, mainChangeTo, mainChangeReason } = getMealDetails(date, mealType, careHomeId);
    if (!main && (!sides || sides.length === 0) && !dessert) return <span>—</span>;
    return (
      <div className="whitespace-normal break-normal leading-snug">
        <div className="font-semibold flex items-start gap-2">
          <span>{main?.name || 'No meal'}</span>
          {mainChanged && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
              title={`Changed main meal: ${mainChangeFrom || 'N/A'} → ${mainChangeTo || 'Updated meal'}${mainChangeReason ? `\nReason: ${mainChangeReason}` : ''}`}
            >
              Changed
            </span>
          )}
        </div>
        {sides && sides.length > 0 ? (
          <>
            {sides.map((s, idx) => (
              <div key={`side-${idx}`} className="text-[12px] opacity-90">+ Side{(sides.length>1)?` ${idx+1}`:''}: {s.name}</div>
            ))}
            {sides.map((s, idx) => s?.description ? (
              <div key={`side-desc-${idx}`} className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{s.description}</div>
            ) : null)}
          </>
        ) : (
          <div className="text-[11px] italic text-slate-500 dark:text-slate-400">No side available</div>
        )}
        {dessert?.name ? (
          <div className="mt-2 text-[12px] opacity-90">+ Dessert: {dessert.name}</div>
        ) : null}
      </div>
    );
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (dates) => {
    if (dates.length === 0) return '';
    const start = dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const end = dates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const formatDayTitle = (date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const filteredCareHomes = selectedCareHome === 'all' 
    ? careHomes 
    : careHomes.filter(ch => ch.id === selectedCareHome);

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-3xl shadow-2xl p-8 relative">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Icon name="CalendarDays" size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                {viewMode === 'day' ? 'Daily Menu' : viewMode === 'week' ? 'Weekly Menu' : 'Monthly Menu'}
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300 font-medium mt-1">
                {viewMode === 'day' ? formatDayTitle(currentDate) : viewMode === 'week' ? formatWeekRange(weekDates) : formatMonthYear(currentDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Care Home Selector - Modern Pill Design */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {isAdmin && (
                <button
                  onClick={() => setSelectedCareHome('all')}
                  className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                    selectedCareHome === 'all'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  🏥 All Homes
                </button>
              )}
              {careHomes.map((ch, idx) => {
                const colors = getCareHomeColors(idx);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedCareHome(ch.id)}
                    className={`px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                      selectedCareHome === ch.id
                        ? `bg-gradient-to-r ${colors.accent} text-white shadow-lg scale-105`
                        : `${colors.badge} border-2 ${colors.border} hover:shadow-md`
                    }`}
                  >
                    {ch.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            {/* View Toggle: Day / Week / Month */}
            <div className="flex gap-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full p-1.5 shadow-md">
              <button
                onClick={() => setViewMode('day')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-900 shadow-lg text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                🗓️ Daily
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-900 shadow-lg text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📅 Weekly
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-900 shadow-lg text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📆 Monthly
              </button>
            </div>

            {/* Navigation */}
            <div className="flex gap-1 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full p-1.5 shadow-md">
              <button
                onClick={() => viewMode === 'day' ? navigateDay(-1) : viewMode === 'week' ? navigateWeek(-1) : navigateMonth(-1)}
                className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md"
              >
                <Icon name="ChevronLeft" size={20} />
              </button>
              <button
                onClick={goToToday}
                className={`px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all duration-300 whitespace-nowrap ${
                  showTodayFeedback
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl scale-110'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-105'
                }`}
                title={viewMode === 'day' ? 'Jump to today' : viewMode === 'week' ? 'Jump to this week' : 'Jump to this month'}
              >
                {showTodayFeedback ? '✓ Today' : viewMode === 'day' ? '📅 Today' : viewMode === 'week' ? '📅 This Week' : '📅 This Month'}
              </button>
              <button
                onClick={() => viewMode === 'day' ? navigateDay(1) : viewMode === 'week' ? navigateWeek(1) : navigateMonth(1)}
                className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-900 transition-all text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md"
              >
                <Icon name="ChevronRight" size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day View */}
      {!isLoading && viewMode === 'day' && (
        <div className="space-y-6">
          {/* Single Care Home: Summary and detailed 2x2 cards */}
          {selectedCareHome !== 'all' && filteredCareHomes.map((careHome) => (
            <div key={careHome.id} className="space-y-6">
              {/* Summary Glance */}
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Menu at a Glance</h3>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{formatDayTitle(currentDate)}</div>
                </div>
                <div className="grid grid-cols-4 gap-3 p-6">
                  {mealOrder.map((mealType) => {
                    const cfg = mealConfig[mealType];
                    const detail = getMealDetails(currentDate, mealType, careHome.id);
                    const changed = detail.mainChanged;
                    const tooltip = changed
                      ? `Changed main meal: ${detail.mainChangeFrom || 'N/A'} → ${detail.mainChangeTo || 'Updated meal'}${detail.mainChangeReason ? `\nReason: ${detail.mainChangeReason}` : ''}`
                      : '';
                    return (
                      <div
                        key={mealType}
                        className={`relative rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center ${cfg.bgColor} ${changed ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600' : ''}`}
                        onMouseEnter={e => {
                          if (changed) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTooltip({
                              key: `${careHome.id}-${mealType}-day`,
                              text: tooltip,
                              x: rect.left + rect.width / 2,
                              y: rect.top + 8 // 8px below top
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          if (changed) setHoveredTooltip(null);
                        }}
                      >
                        {hoveredTooltip?.key === `${careHome.id}-${mealType}-day` && hoveredTooltip?.text && (
                          <div
                            style={{
                              zIndex: 100,
                              position: 'fixed',
                              left: hoveredTooltip.x,
                              top: hoveredTooltip.y,
                              transform: 'translate(-50%, 0)',
                              pointerEvents: 'none',
                              transition: 'opacity 0.15s',
                              opacity: 1
                            }}
                            className="bg-slate-900 text-white text-[13px] px-4 py-2 rounded-xl shadow-2xl border border-slate-700 w-64 animate-fade-in"
                          >
                            <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-slate-900"></div>
                            {hoveredTooltip.text.split('\n').map((line, idx) => (
                              <div key={idx} className="leading-snug whitespace-pre-line">{line}</div>
                            ))}
                          </div>
                        )}
                        <div
                          className={`flex flex-col items-center cursor-pointer`}
                          onClick={() => {
                            setSelectedMealDetail({
                              main: detail.main,
                              sides: detail.sides || [],
                              dessert: detail.dessert || null,
                              mainChanged: detail.mainChanged,
                              mainChangeFrom: detail.mainChangeFrom,
                              mainChangeTo: detail.mainChangeTo,
                              mainChangeReason: detail.mainChangeReason,
                              date: currentDate,
                              mealType,
                              careHomeName: careHome.name
                            });
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`View details for ${detail.main?.name || 'meal'}`}
                        >
                          {detail.main?.image_url && (
                            <img
                              src={detail.main.image_url}
                              alt={detail.main.name}
                              className="w-full h-24 object-cover rounded-lg mb-2"
                            />
                          )}
                          <div className={`text-sm font-bold ${cfg.textColor} flex items-center justify-center gap-1`}>
                            <span className="text-base">{cfg.icon}</span>
                            {cfg.label}
                            {changed && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold align-middle">Changed</span>
                            )}
                          </div>
                          <div className={`mt-2 text-xs font-semibold ${cfg.textColor} whitespace-normal break-normal text-left`}>
                            {renderMealForDate(currentDate, mealType, careHome.id)}
                          </div>
                        </div>
                        {changed && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">Changed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Meal Cards (2x2) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mealOrder.map((mealType) => {
                  const cfg = mealConfig[mealType];
                  const mealDetails = getMealDetails(currentDate, mealType, careHome.id);
                  const mainMeal = mealDetails.main;
                  
                  return (
                    <div key={mealType} className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                      {/* Header */}
                      <div className={`px-6 py-4 bg-gradient-to-r ${cfg.color} text-white font-bold flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cfg.icon}</span>
                          {cfg.label}
                        </div>
                        <span className="text-xs">{cfg.time}</span>
                      </div>

                      {/* Content Container */}
                      <div className="flex flex-col md:flex-row">
                        {/* Image Section - Main and Side */}
                        <div className="flex md:flex-col gap-2 w-full md:w-40 flex-shrink-0">
                          {mainMeal?.image_url && (
                            <div className="flex-1 h-40 md:h-auto overflow-hidden bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-none">
                              <img 
                                src={mainMeal.image_url} 
                                alt={mainMeal.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {(mealDetails?.sides && mealDetails.sides.length > 0 && mealDetails.sides[0]?.image_url) && (
                            <div className="flex-1 h-40 md:h-auto overflow-hidden bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-none">
                              <img 
                                src={mealDetails.sides[0].image_url} 
                                alt={mealDetails.sides[0].name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          {mealDetails?.dessert && mealDetails.dessert.image_url && (
                            <div className="flex-1 h-20 md:h-auto overflow-hidden bg-slate-200 dark:bg-slate-700 rounded-lg md:rounded-none">
                              <img
                                src={mealDetails.dessert.image_url}
                                alt={mealDetails.dessert.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>

                        {/* Text Section */}
                        <div className="p-6 flex-1 flex flex-col">
                          <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg">
                            {mealDetails.main?.name || 'No meal'}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                            {mainMeal?.description || 'No description available.'}
                          </p>
                          {mealDetails?.sides && mealDetails.sides.length > 0 ? (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                              Side{mealDetails.sides.length>1 ? 's' : ''}: {mealDetails.sides.map(s => s.name).join(' + ')}{mealDetails.sides[0]?.description && mealDetails.sides[0].description !== mealDetails.sides[0].name ? ` — ${mealDetails.sides[0].description}` : ''}
                            </p>
                          ) : (
                            <p className="text-xs italic text-slate-500 dark:text-slate-400 mt-2">No side available</p>
                          )}
                          {mealDetails?.dessert && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Dessert: {mealDetails.dessert.name}</p>
                          )}
                          {(mainMeal?.cost_per_person || (mealDetails?.sides && mealDetails.sides.reduce((acc,s)=>acc + (s?.cost_per_person||0),0)) || (mealDetails?.dessert?.cost_per_person)) && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                              Cost per serving: ${((mainMeal?.cost_per_person || 0) + (mealDetails?.sides ? mealDetails.sides.reduce((acc,s)=>acc + (s?.cost_per_person||0),0) : 0) + (mealDetails?.dessert?.cost_per_person || 0)).toFixed(2)}
                            </p>
                          )}
                          
                          {/* View Details Button */}
                          {mainMeal && (
                            <button
                              onClick={() => setSelectedMealDetail({ main: mainMeal, sides: mealDetails?.sides || [], dessert: mealDetails?.dessert || null })}
                              className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-200 self-start"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* All Homes: vertical sections by meal type */}
          {isAdmin && selectedCareHome === 'all' && (
            <div className="space-y-8">
              {mealOrder.map((mealType) => {
                const cfg = mealConfig[mealType];
                return (
                  <div key={mealType} className="rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl">
                    <div className={`px-6 py-4 bg-gradient-to-r ${cfg.color} text-white font-bold flex items-center gap-2`}>
                      <span className="text-xl">{cfg.icon}</span>
                      {cfg.label} - {cfg.time}
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredCareHomes.map((careHome) => (
                        <div
                          key={careHome.id}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0 cursor-pointer hover:shadow-lg transition-all flex flex-col overflow-hidden"
                          onClick={() => {
                            const d = getMealDetails(currentDate, mealType, careHome.id);
                            setSelectedMealDetail({
                              main: d.main,
                              sides: d.sides || [],
                              dessert: d.dessert || null,
                              mainChanged: d.mainChanged,
                              mainChangeFrom: d.mainChangeFrom,
                              mainChangeTo: d.mainChangeTo,
                              mainChangeReason: d.mainChangeReason,
                              date: currentDate,
                              mealType,
                              careHomeName: careHome.name
                            });
                          }}
                        >
                          {/* Images section */}
                          <div className="flex gap-0 w-full">
                            {(() => {
                              const d = getMealDetails(currentDate, mealType, careHome.id);
                              return d.main?.image_url ? (
                                <img
                                  src={d.main.image_url}
                                  alt={d.main.name}
                                  className="w-1/2 h-28 object-cover rounded-none border-r border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-1/2 h-28 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">No main image</div>
                              );
                            })()}
                            {(() => {
                              const d = getMealDetails(currentDate, mealType, careHome.id);
                              const firstSide = d.sides && d.sides.length > 0 ? d.sides[0] : null;
                              return firstSide?.image_url ? (
                                <img
                                  src={firstSide.image_url}
                                  alt={firstSide.name}
                                  className="w-1/2 h-28 object-cover rounded-none"
                                />
                              ) : (
                                <div className="w-1/2 h-28 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-400">No side image</div>
                              );
                            })()}
                          </div>
                          {/* Info section */}
                          <div className="p-4 flex flex-col gap-2 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base font-bold text-slate-900 dark:text-white">{careHome.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.textColor} bg-slate-100 dark:bg-slate-700 font-semibold`}>{cfg.label}</span>
                            </div>
                            <div className={`text-sm font-semibold ${cfg.textColor} mb-1`}>{renderMealForDateDetailed(currentDate, mealType, careHome.id)}</div>
                            {(() => {
                              const d = getMealDetails(currentDate, mealType, careHome.id);
                              const desc = d.main?.description || (d.sides && d.sides[0]?.description) || '';
                              return (
                                <div className="text-xs text-slate-600 dark:text-slate-400">
                                  {desc || 'No description available.'}
                                </div>
                              );
                            })()}
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
      {isLoading ? (
        <div className="py-6">
          <Skeleton className="space-y-4">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
              <div className="space-y-2">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
              <div className="space-y-2">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
              <div className="space-y-2">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              </div>
            </div>
          </Skeleton>
        </div>
      ) : viewMode === 'week' && (
        <div className="space-y-8">
          {/* Single Care Home weekly table(s) */}
          {selectedCareHome !== 'all' && filteredCareHomes.map((careHome, chIdx) => {
            const colors = getCareHomeColors(chIdx);
            return (
              <div key={careHome.id} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{careHome.name}</h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    {/* Header row */}
                    <div className="grid grid-cols-8">
                      {/* Sticky left header */}
                      <div className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shadow-lg px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
                        MEAL TIME
                      </div>
                      {weekDates.map((date, idx) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isWeekend = [6,0].includes(date.getDay());
                        return (
                          <div key={idx} className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-center ${
                            isToday ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : isWeekend ? 'bg-indigo-50 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-200'
                          }`}>
                            <div>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                            <div className="text-xs opacity-80">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Meal rows */}
                    {mealOrder.map((mealType, rIdx) => {
                      const config = mealConfig[mealType];
                      return (
                        <div key={mealType} className="grid grid-cols-8 border-t border-slate-200 dark:border-slate-700">
                          {/* Sticky left meal label */}
                          <div className="sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                            <div className={`px-4 py-3 flex items-center gap-2 font-bold text-sm text-white rounded-r ${`bg-gradient-to-r ${config.color}`}`}>
                              <span className="text-base">{config.icon}</span>
                              <span>{config.label}</span>
                              <span className="ml-auto text-[11px] opacity-90">{config.time}</span>
                            </div>
                          </div>
                          {weekDates.map((date, cIdx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isWeekend = [6,0].includes(date.getDay());
                            const cellKey = `${careHome.id}-${date.toISOString()}-${mealType}`;
                            const isHovered = hoveredCell === cellKey;
                            const detail = getMealDetails(date, mealType, careHome.id);
                            const changed = detail.mainChanged;
                            return (
                              <div
                                key={cIdx}
                                onMouseEnter={() => setHoveredCell(cellKey)}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={() => {
                                  const detail = getMealDetails(date, mealType, careHome.id);
                                  setSelectedMealDetail({
                                    main: detail.main,
                                    sides: detail.sides || [],
                                    dessert: detail.dessert || null,
                                    mainChanged: detail.mainChanged,
                                    mainChangeFrom: detail.mainChangeFrom,
                                    mainChangeTo: detail.mainChangeTo,
                                    mainChangeReason: detail.mainChangeReason,
                                    date,
                                    mealType,
                                    careHomeName: careHome.name
                                  });
                                }}
                                className={`relative px-6 py-5 border-l border-slate-200 dark:border-slate-700 text-base font-semibold whitespace-normal break-normal leading-snug transition-all cursor-pointer ${
                                  isToday
                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                    : changed
                                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-400 dark:border-amber-600'
                                      : isWeekend
                                        ? 'bg-indigo-50 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300'
                                        : 'text-slate-800 dark:text-slate-200'
                                } ${isHovered ? 'shadow-lg scale-105 z-10' : ''}`}
                              >
                                <div className="relative flex items-center">
                                  <div className="w-full pr-12">
                                    {renderMealForDate(date, mealType, careHome.id)}
                                  </div>
                                  {changed && !isToday && (
                                    <span className="absolute -top-3 -right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-md">Changed</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* All Homes comparison - separate tables per meal */}
          {isAdmin && selectedCareHome === 'all' && (
            <div className="space-y-10">
              {mealOrder.map((mealType) => {
                const config = mealConfig[mealType];
                return (
                  <div key={mealType} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    {/* Table header */}
                    <div className={`px-6 py-4 bg-gradient-to-r ${config.color} text-white font-bold text-lg flex items-center gap-2`}>
                      <span className="text-xl">{config.icon}</span>
                      {config.label} – {config.time}
                    </div>
                    <div className="overflow-x-auto">
                      <div className="min-w-[900px]">
                        {/* Day headers row */}
                        <div className="grid grid-cols-8">
                          <div className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 shadow-lg px-4 py-3 font-extrabold text-slate-700 dark:text-slate-200 uppercase text-xs tracking-wider">
                            CARE HOME
                          </div>
                          {weekDates.map((date, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isWeekend = [6,0].includes(date.getDay());
                            return (
                              <div key={idx} className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-center ${
                                isToday ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' : isWeekend ? 'bg-indigo-50 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300' : 'text-slate-700 dark:text-slate-200'
                              }`}>
                                <div>{date.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                                <div className="text-xs opacity-80">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Home rows */}
                        {filteredCareHomes.map((careHome, chIdx) => (
                          <div key={careHome.id} className="grid grid-cols-8 border-t border-slate-200 dark:border-slate-700">
                            <div className="sticky left-0 z-10 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg px-6 py-4 font-bold text-base text-slate-800 dark:text-slate-200">
                              {careHome.name}
                            </div>
                            {weekDates.map((date, cIdx) => {
                              const isToday = date.toDateString() === new Date().toDateString();
                              const isWeekend = [6,0].includes(date.getDay());
                              const cellKey = `all-${careHome.id}-${date.toISOString()}-${mealType}`;
                              const isHovered = hoveredCell === cellKey;
                              const detail = getMealDetails(date, mealType, careHome.id);
                              const changed = detail.mainChanged;
                              const tooltip = changed
                                ? `Changed main meal: ${detail.mainChangeFrom || 'N/A'} → ${detail.mainChangeTo || 'Updated meal'}${detail.mainChangeReason ? `\nReason: ${detail.mainChangeReason}` : ''}`
                                : '';
                              return (
                                <div
                                  key={cIdx}
                                  onMouseEnter={() => {
                                    setHoveredCell(cellKey);
                                    if (tooltip) setHoveredTooltip({ key: cellKey, text: tooltip });
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredCell(null);
                                    setHoveredTooltip(null);
                                  }}
                                  onClick={() => {
                                    setSelectedMealDetail({
                                      main: detail.main,
                                      sides: detail.sides || [],
                                      dessert: detail.dessert || null,
                                      mainChanged: detail.mainChanged,
                                      mainChangeFrom: detail.mainChangeFrom,
                                      mainChangeTo: detail.mainChangeTo,
                                      mainChangeReason: detail.mainChangeReason,
                                      date,
                                      mealType,
                                      careHomeName: careHome.name
                                    });
                                  }}
                                  className={`relative px-6 py-5 border-l border-slate-200 dark:border-slate-700 text-base font-semibold whitespace-normal break-normal leading-snug transition-all cursor-pointer ${
                                    isToday
                                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                      : changed
                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-400 dark:border-amber-600'
                                        : isWeekend
                                          ? 'bg-indigo-50 dark:bg-indigo-950/20 text-slate-700 dark:text-slate-300'
                                          : 'text-slate-800 dark:text-slate-200'
                                  } ${isHovered ? 'shadow-lg scale-105 z-10' : ''}`}
                                >
                                  {hoveredTooltip?.key === cellKey && hoveredTooltip?.text && (
                                    <div className="pointer-events-none absolute -top-2 right-2 z-20 bg-slate-900 text-white text-[12px] px-3 py-2 rounded-lg shadow-xl border border-slate-700 w-60">
                                      {hoveredTooltip.text.split('\n').map((line, idx) => (
                                        <div key={idx} className="leading-snug">{line}</div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {renderMealForDate(date, mealType, careHome.id)}
                                  </div>
                                  {changed && !isToday && (
                                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">Changed</span>
                                  )}
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
        <div className="w-full">
          {/* Meal Type Selector */}
          <div className="flex flex-wrap gap-2 mb-4">
            {mealOrder.map((mt) => {
              const cfg = mealConfig[mt];
              const active = selectedMealType === mt;
              return (
                <button
                  key={mt}
                  onClick={() => setSelectedMealType(mt)}
                  className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                    active ? `text-white bg-gradient-to-r ${cfg.color}` : `${cfg.badge} border-2 border-slate-300 dark:border-slate-600`
                  }`}
                >
                  <span className="mr-1">{cfg.icon}</span>{cfg.label}
                </button>
              );
            })}
          </div>

          {/* Single Care Home: Calendar grid shows ONE meal type */}
          {selectedCareHome !== 'all' && (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-3 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="py-4 px-2 text-center font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-xl">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3">
                {monthDates.map(({ date, isCurrentMonth }, idx) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  const cfg = mealConfig[selectedMealType];
                  const detail = getMealDetails(date, selectedMealType, selectedCareHome !== 'all' ? selectedCareHome : null);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedMealDetail({
                          main: detail.main,
                          sides: detail.sides || [],
                          dessert: detail.dessert || null,
                          mainChanged: detail.mainChanged,
                          mainChangeFrom: detail.mainChangeFrom,
                          mainChangeTo: detail.mainChangeTo,
                          mainChangeReason: detail.mainChangeReason,
                          date,
                          mealType: selectedMealType,
                          careHomeName: selectedCareHome !== 'all' ? (careHomes.find(ch => ch.id === selectedCareHome)?.name || '') : ''
                        });
                      }}
                      className={`cursor-pointer rounded-2xl border transition-all duration-200 hover:shadow-lg overflow-hidden ${monthCellMinHeight} flex flex-col ${
                        isCurrentMonth
                          ? isToday
                            ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-2xl ring-2 ring-indigo-300 dark:ring-indigo-600'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 hover:shadow-lg'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                      }`}
                    >
                      {/* Date Header */}
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

                      {/* Selected Meal Type only */}
                      {isCurrentMonth && (
                        <div className={`flex-1 p-3 ${cfg.bgColor} ${cfg.textColor} flex flex-col`}>
                          <div className="flex items-start gap-2 text-sm leading-snug break-normal whitespace-normal">
                            <span className="text-base shrink-0">{cfg.icon}</span>
                            <div className="flex-1">
                              {renderMealForDateDetailed(date, selectedMealType, selectedCareHome !== 'all' ? selectedCareHome : null)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* All Homes: Monthly card-based layout (ONE meal type) */}
          {isAdmin && selectedCareHome === 'all' && (
            (() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cfg = mealConfig[selectedMealType];
              
              // Group dates by weeks for better organization
              const weeks = [];
              let currentWeek = [];
              for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                currentWeek.push(date);
                if (date.getDay() === 0 || d === daysInMonth) {
                  weeks.push([...currentWeek]);
                  currentWeek = [];
                }
              }

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className={`px-6 py-4 bg-gradient-to-r ${cfg.color} text-white font-bold text-lg flex items-center gap-3`}>
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <div className="text-xl font-extrabold">{cfg.label}</div>
                        <div className="text-sm opacity-90">{formatMonthYear(currentDate)} - All Care Homes</div>
                      </div>
                    </div>
                  </div>

                  {/* Week-by-week cards */}
                  <div
                    ref={monthScrollRef}
                    onScroll={handleMonthScroll}
                    className="space-y-6"
                  >
                    {/* Swipe hint overlay */}
                    {showSwipeHint && (
                      <div className="fixed top-24 right-8 z-50">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-full px-4 py-2 shadow-lg flex items-center gap-2 animate-bounce">
                          <span>Scroll down to see all weeks</span>
                          <span>↓</span>
                        </div>
                      </div>
                    )}

                    {weeks.map((weekDates, weekIdx) => {
                      const weekStart = weekDates[0];
                      const weekEnd = weekDates[weekDates.length - 1];
                      const weekLabel = `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

                      return (
                        <div key={weekIdx} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
                          {/* Week header */}
                          <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 px-6 py-3 border-b border-slate-300 dark:border-slate-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon name="Calendar" size={18} className="text-slate-700 dark:text-slate-300" />
                                <span className="font-bold text-slate-800 dark:text-slate-200">Week {weekIdx + 1}</span>
                                <span className="text-sm text-slate-600 dark:text-slate-400">({weekLabel})</span>
                              </div>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{weekDates.length} days</span>
                            </div>
                          </div>

                          {/* Care homes rows */}
                          <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredCareHomes.map((careHome, chIdx) => {
                              const colors = getCareHomeColors(chIdx);
                              return (
                                <div key={careHome.id} className="p-5">
                                  {/* Care home name badge */}
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors.accent}`}></div>
                                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">{careHome.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${colors.badge} font-medium`}>
                                      {careHome.location || 'Care Home'}
                                    </span>
                                  </div>

                                  {/* Days grid for this care home */}
                                  <div className="grid grid-cols-7 gap-3">
                                    {weekDates.map((date) => {
                                      const isToday = date.toDateString() === new Date().toDateString();
                                      const isWeekend = [6, 0].includes(date.getDay());
                                      const dayOfWeek = date.toLocaleDateString('en-GB', { weekday: 'short' });
                                      const dayNum = date.getDate();
                                      const cellKey = `month-all-${careHome.id}-${dayNum}-${selectedMealType}`;
                                      const isHovered = hoveredCell === cellKey;
                                      const detail = getMealDetails(date, selectedMealType, careHome.id);
                                      const changed = detail.mainChanged;

                                      const tooltip = changed
                                        ? `Changed main meal: ${detail.mainChangeFrom || 'N/A'} → ${detail.mainChangeTo || 'Updated meal'}${detail.mainChangeReason ? `\nReason: ${detail.mainChangeReason}` : ''}`
                                        : '';

                                      return (
                                        <div
                                          key={date.toISOString()}
                                          onMouseEnter={() => {
                                            setHoveredCell(cellKey);
                                            if (tooltip) setHoveredTooltip({ key: cellKey, text: tooltip });
                                          }}
                                          onMouseLeave={() => {
                                            setHoveredCell(null);
                                            setHoveredTooltip(null);
                                          }}
                                          onClick={() => {
                                            setSelectedMealDetail({
                                              main: detail.main,
                                              sides: detail.sides || [],
                                              dessert: detail.dessert || null,
                                              mainChanged: detail.mainChanged,
                                              mainChangeFrom: detail.mainChangeFrom,
                                              mainChangeTo: detail.mainChangeTo,
                                              mainChangeReason: detail.mainChangeReason,
                                              date,
                                              mealType: selectedMealType,
                                              careHomeName: careHome.name
                                            });
                                          }}
                                          className={`relative rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer ${
                                            isToday
                                              ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 shadow-lg ring-2 ring-indigo-300 dark:ring-indigo-600'
                                              : changed
                                                ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/30 shadow-md'
                                                : isWeekend
                                                  ? `border-slate-300 dark:border-slate-600 ${colors.bg}`
                                                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'
                                        } ${isHovered ? 'shadow-xl scale-105 -translate-y-1 z-10' : ''}`}
                                        >
                                          {hoveredTooltip?.key === cellKey && hoveredTooltip?.text && (
                                            <div className="pointer-events-none absolute -top-2 right-2 z-20 bg-slate-900 text-white text-[11px] px-3 py-2 rounded-lg shadow-xl border border-slate-700 w-56">
                                              {hoveredTooltip.text.split('\n').map((line, idx) => (
                                                <div key={idx} className="leading-snug">{line}</div>
                                              ))}
                                            </div>
                                          )}
                                          {/* Date badge */}
                                          <div className={`flex items-center justify-between mb-2 pb-2 border-b ${
                                            isToday 
                                              ? 'border-indigo-300 dark:border-indigo-600' 
                                              : changed
                                                ? 'border-amber-300 dark:border-amber-600'
                                                : 'border-slate-200 dark:border-slate-700'
                                          }`}>
                                            <div className="flex flex-col">
                                              <span className={`text-xs font-bold uppercase tracking-wide ${
                                                isToday ? 'text-indigo-600 dark:text-indigo-400' : changed ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                                              }`}>
                                                {dayOfWeek}
                                              </span>
                                              <span className={`text-xl font-extrabold ${
                                                isToday ? 'text-indigo-700 dark:text-indigo-300' : changed ? 'text-amber-800 dark:text-amber-200' : 'text-slate-700 dark:text-slate-200'
                                              }`}>
                                                {dayNum}
                                              </span>
                                            </div>
                                            {isToday && (
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                                TODAY
                                              </span>
                                            )}
                                            {changed && !isToday && (
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                                Changed
                                              </span>
                                            )}
                                          </div>

                                          {/* Meal content */}
                                          <div className="min-h-[60px]">
                                            <div className={`flex items-start gap-1.5 text-xs leading-tight ${
                                              isToday ? 'text-indigo-900 dark:text-indigo-100' : changed ? 'text-amber-900 dark:text-amber-100' : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                              <span className="text-base shrink-0">{cfg.icon}</span>
                                              <div className="flex-1 font-medium break-normal">
                                                {renderMealForDate(date, selectedMealType, careHome.id)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Meal Details Modal */}
      {selectedMealDetail && (() => {
        console.log('🔍 selectedMealDetail:', selectedMealDetail);
        console.log('🔍 selectedMealDetail.main:', selectedMealDetail.main);
        console.log('🔍 selectedMealDetail.main?.meal:', selectedMealDetail.main?.meal);
        
        const mainMeal = selectedMealDetail.main?.meal || selectedMealDetail.main || selectedMealDetail.meal || selectedMealDetail;
        console.log('🔍 Final mainMeal:', mainMeal);
        
        const sides = selectedMealDetail.sides || [];
        const dessert = selectedMealDetail.dessert || null;
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[9999] p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mt-16">
              {/* Header with Close Button */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🍽️</span>
                  <div>
                    <h2 className="text-2xl font-bold">{mainMeal.name}</h2>
                    <p className="text-indigo-100 text-sm mt-1">{mainMeal.type || 'Meal'}</p>
                    {sides && sides.length > 0 && (
                      <p className="text-indigo-200 text-xs mt-1">+ Side{(sides.length>1)?'s':''}: {sides.map(s => s.name).filter(Boolean).join(' + ')}</p>
                    )}
                    {dessert && (
                      <p className="text-indigo-200 text-xs mt-1">+ Dessert: {dessert.name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMealDetail(null)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Images - Main and Side */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mainMeal.image_url && (
                    <div className="rounded-2xl overflow-hidden h-80 bg-slate-200 dark:bg-slate-700">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-2 bg-slate-100 dark:bg-slate-800">Main Meal</div>
                      <img 
                        src={mainMeal.image_url} 
                        alt={mainMeal.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {sides && sides.length > 0 && (
                    <div className="rounded-2xl overflow-hidden h-80 bg-slate-200 dark:bg-slate-700">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-2 bg-slate-100 dark:bg-slate-800">Side Meal{(sides.length>1)?'s':''}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                        {sides.map((s, idx) => (
                          <div key={idx} className="overflow-hidden">
                            {s.image_url ? (
                              <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-400">No image</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {dessert && (
                    <div className="rounded-2xl overflow-hidden h-40 bg-slate-200 dark:bg-slate-700">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 px-3 py-2 bg-slate-100 dark:bg-slate-800">Dessert</div>
                      {dessert.image_url ? (
                        <img src={dessert.image_url} alt={dessert.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-400">No image</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Main Meal Details */}
                <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span>🍽️</span> Main Meal
                  </h3>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">{mainMeal.name}</p>
                  {mainMeal.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {mainMeal.description}
                      </p>
                    </div>
                  )}
                  {mainMeal.cost_per_person && (
                    <div className="mb-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300">Cost per Serving: <span className="font-bold text-green-600 dark:text-green-400">£{mainMeal.cost_per_person.toFixed(2)}</span></p>
                    </div>
                  )}
                  {mainMeal.ingredients && (
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ingredients</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(() => {
                          const ingredientsList = parseIngredients(mainMeal.ingredients);
                          return ingredientsList.map((ing, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0"></span>
                              <span className="text-sm">
                                {typeof ing === 'string' ? ing : ing.name ? `${ing.name}${ing.amount ? ` (${ing.amount}${ing.unit ? ' ' + ing.unit : ''})` : ''}` : 'Ingredient'}
                              </span>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  {mainMeal.allergens && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Allergens</h4>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          let allergensList = [];
                          if (typeof mainMeal.allergens === 'string') {
                            try {
                              const parsed = JSON.parse(mainMeal.allergens);
                              if (Array.isArray(parsed)) {
                                allergensList = parsed;
                              } else {
                                allergensList = mainMeal.allergens.split(',').map(a => ({ name: a.trim() }));
                              }
                            } catch {
                              allergensList = mainMeal.allergens.split(',').map(a => ({ name: a.trim() }));
                            }
                          } else if (Array.isArray(mainMeal.allergens)) {
                            allergensList = mainMeal.allergens;
                          }
                          return allergensList.length > 0 
                            ? allergensList.map((allergen, idx) => (
                                <span key={idx} className="px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                                  {typeof allergen === 'string' ? allergen : allergen.name || 'Allergen'}
                                </span>
                              ))
                            : <p className="text-slate-600 dark:text-slate-400 text-sm">No known allergens</p>;
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Side Meal Details (support multiple) */}
                {sides && sides.length > 0 && (
                  <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span>🥗</span> Side Meal{(sides.length>1)?'s':''}
                    </h3>
                    {sides.map((sideMeal, sidx) => (
                      <div key={sidx} className="mb-6">
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{sideMeal.name}</p>
                        {sideMeal.description && (
                          <div className="mb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</h4>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {sideMeal.description}
                            </p>
                          </div>
                        )}
                        {sideMeal.cost_per_person && (
                          <div className="mb-2">
                            <p className="text-sm text-slate-700 dark:text-slate-300">Cost per Serving: <span className="font-bold text-green-600 dark:text-green-400">£{sideMeal.cost_per_person.toFixed(2)}</span></p>
                          </div>
                        )}
                        {sideMeal.ingredients && (
                          <div className="mb-2">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ingredients</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(() => {
                                      const ingredientsList = parseIngredients(sideMeal.ingredients);
                                      return ingredientsList.map((ing, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                          <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></span>
                                          <span className="text-sm">
                                            {typeof ing === 'string' ? ing : ing.name ? `${ing.name}${ing.amount ? ` (${ing.amount}${ing.unit ? ' ' + ing.unit : ''})` : ''}` : 'Ingredient'}
                                          </span>
                                        </div>
                                      ));
                                    })()}
                            </div>
                          </div>
                        )}
                        {sideMeal.allergens && (
                          <div>
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Allergens</h4>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                let allergensList = [];
                                if (typeof sideMeal.allergens === 'string') {
                                  try {
                                    const parsed = JSON.parse(sideMeal.allergens);
                                    if (Array.isArray(parsed)) {
                                      allergensList = parsed;
                                    } else {
                                      allergensList = sideMeal.allergens.split(',').map(a => ({ name: a.trim() }));
                                    }
                                  } catch {
                                    allergensList = sideMeal.allergens.split(',').map(a => ({ name: a.trim() }));
                                  }
                                } else if (Array.isArray(sideMeal.allergens)) {
                                  allergensList = sideMeal.allergens;
                                }
                                return allergensList.length > 0 
                                  ? allergensList.map((allergen, idx) => (
                                      <span key={idx} className="px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                                        {typeof allergen === 'string' ? allergen : allergen.name || 'Allergen'}
                                      </span>
                                    ))
                                  : <p className="text-slate-600 dark:text-slate-400 text-sm">No known allergens</p>;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Dessert Details */}
                {dessert && (
                  <div className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span>🍨</span> Dessert
                    </h3>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">{dessert.name}</p>
                    {dessert.description && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</h4>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {dessert.description}
                        </p>
                      </div>
                    )}
                    {dessert.cost_per_person && (
                      <div className="mb-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">Cost per Serving: <span className="font-bold text-green-600 dark:text-green-400">£{dessert.cost_per_person.toFixed(2)}</span></p>
                      </div>
                    )}
                    {dessert.ingredients && (
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ingredients</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(() => {
                            const ingredientsList = parseIngredients(dessert.ingredients);
                            return ingredientsList.map((ing, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></span>
                                <span className="text-sm">
                                  {typeof ing === 'string' ? ing : ing.name ? `${ing.name}${ing.amount ? ` (${ing.amount}${ing.unit ? ' ' + ing.unit : ''})` : ''}` : 'Ingredient'}
                                </span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                    {dessert.allergens && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Allergens</h4>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            let allergensList = [];
                            if (typeof dessert.allergens === 'string') {
                              try {
                                const parsed = JSON.parse(dessert.allergens);
                                if (Array.isArray(parsed)) {
                                  allergensList = parsed;
                                } else {
                                  allergensList = dessert.allergens.split(',').map(a => ({ name: a.trim() }));
                                }
                              } catch {
                                allergensList = dessert.allergens.split(',').map(a => ({ name: a.trim() }));
                              }
                            } else if (Array.isArray(dessert.allergens)) {
                              allergensList = dessert.allergens;
                            }
                            return allergensList.length > 0 
                              ? allergensList.map((allergen, idx) => (
                                  <span key={idx} className="px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-full text-sm font-semibold">
                                    {typeof allergen === 'string' ? allergen : allergen.name || 'Allergen'}
                                  </span>
                                ))
                              : <p className="text-slate-600 dark:text-slate-400 text-sm">No known allergens</p>;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedMealDetail(null)}
                className="w-full mt-8 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-bold hover:shadow-lg transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default WeeklyMenuCalendar;
