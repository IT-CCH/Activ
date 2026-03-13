import React, { useState, useEffect, useMemo } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import IngredientCalculator from './IngredientCalculator';
import ConfirmDeliveryModal from './ConfirmDeliveryModal';
import { getStatus, saveStatus } from '../../../services/deliveryService';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import supabase from '../../../services/supabaseClient';

const TodayMenuWidget = ({ careHomes, onViewDetails, initialCareHomeId, isLoading = false, userRole, staffCareHomeId }) => {
  const navigate = useNavigate();
  const { user, displayName, isCareHomeManager, isAdmin, careHomeId: authCareHomeId, role: authRole } = useAuth();
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(initialCareHomeId || careHomes?.[0]?.id);

  // Keep selection in sync when a preferred initial ID is provided
  useEffect(() => {
    if (initialCareHomeId) setSelectedCareHomeId(initialCareHomeId);
  }, [initialCareHomeId]);

  // If no selection yet and care homes load asynchronously, default to first available
  useEffect(() => {
    if ((!selectedCareHomeId || !careHomes?.some(ch => ch.id === selectedCareHomeId)) && careHomes?.length > 0) {
      setSelectedCareHomeId(initialCareHomeId || careHomes[0].id);
    }
  }, [careHomes, initialCareHomeId, selectedCareHomeId]);

  // Maintain a map of careHomeId -> todayMeals so we can lazy-load schedules for homes
  const [careHomeMealsMap, setCareHomeMealsMap] = useState(() => {
    const m = {};
    (careHomes || []).forEach(ch => { m[ch.id] = ch.todayMeals || []; });
    return m;
  });

  useEffect(() => {
    // update map when careHomes prop changes
    setCareHomeMealsMap(prev => {
      const next = { ...prev };
      (careHomes || []).forEach(ch => {
        if (!next[ch.id]) next[ch.id] = ch.todayMeals || [];
      });
      return next;
    });
  }, [careHomes]);

  const selectedCareHome = {
    id: selectedCareHomeId,
    name: careHomes?.find(ch => ch.id === selectedCareHomeId)?.name || '' ,
    todayMeals: careHomeMealsMap[selectedCareHomeId] || []
  };
  const today = new Date().toLocaleDateString('en-CA');

  const [statusByMealType, setStatusByMealType] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState(null);

  const mealOrderRank = (type) => {
    const order = { breakfast: 1, lunch: 2, supper: 3, snack: 4 };
    return order[(type || '').toLowerCase()] ?? 99;
  };

  const sortedTodayMeals = useMemo(() => {
    return [...(selectedCareHome?.todayMeals || [])]
      .filter(m => m?.type?.toLowerCase() !== 'dinner')
      .sort((a, b) => mealOrderRank(a?.type) - mealOrderRank(b?.type));
  }, [selectedCareHome]);

  // Lazy-load today's meals for a care home when selected if not already loaded
  useEffect(() => {
    const fetchForCareHome = async (chId) => {
      try {
        if (!chId) return;
        // If we already have meals (non-empty), skip
        const existing = careHomeMealsMap[chId];
        if (existing && existing.length > 0) return;

        const todayIso = new Date().toISOString().split('T')[0];
        const mealTypes = ['Breakfast', 'Lunch', 'Supper'];
        const slotKinds = ['main', 'side', 'dessert'];

        const todayMeals = [];
        for (const mealType of mealTypes) {
          for (const slotKind of slotKinds) {
            try {
              const { data: scheduledMeal, error } = await supabase.rpc('get_scheduled_meal', {
                p_care_home_id: chId,
                p_date: todayIso,
                p_meal_type: mealType,
                p_slot_kind: slotKind
              });
              if (error || !scheduledMeal || scheduledMeal.length === 0) continue;

              if (slotKind === 'main') {
                const mealId = scheduledMeal[0].meal_id;
                const { data: mealDetails, error: mealErr } = await supabase.from('meals').select('*').eq('id', mealId).single();
                if (!mealErr && mealDetails) {
                  todayMeals.push({ ...mealDetails, type: mealType, sides: [], dessert: null });
                }
              }

              if (slotKind === 'side') {
                const existingMeal = todayMeals.find(m => m.type === mealType);
                if (!existingMeal) continue;
                for (const row of scheduledMeal) {
                  const mealId = row.meal_id;
                  const { data: mealDetails, error: mealErr } = await supabase.from('meals').select('*').eq('id', mealId).single();
                  if (!mealErr && mealDetails) {
                    existingMeal.sides = existingMeal.sides || [];
                    existingMeal.sides.push(mealDetails);
                  }
                }
              }

              if (slotKind === 'dessert') {
                const existingMeal = todayMeals.find(m => m.type === mealType);
                if (!existingMeal) continue;
                const mealId = scheduledMeal[0].meal_id;
                const { data: mealDetails, error: mealErr } = await supabase.from('meals').select('*').eq('id', mealId).single();
                if (!mealErr && mealDetails) {
                  existingMeal.dessert = mealDetails;
                }
              }
            } catch (e) {
              console.warn('Failed to fetch scheduled slot', e);
            }
          }
        }

        setCareHomeMealsMap(prev => ({ ...prev, [chId]: todayMeals }));
      } catch (e) {
        console.error('Error fetching today meals for care home', chId, e);
      }
    };

    fetchForCareHome(selectedCareHomeId);
  }, [selectedCareHomeId, careHomeMealsMap]);

  const printTodayMenu = () => {
    if (!selectedCareHome) return;

    const mealsForPrint = sortedTodayMeals.map((meal) => {
      const status = statusByMealType?.[meal?.type];
      const mealsById = status?.mealsById || {};
      const overriddenMain = status?.changedForAll && status?.newMainMealId ? mealsById[status.newMainMealId] : null;
      const overriddenSides = status?.changedForAll && (status?.newSideMealIds && status.newSideMealIds.length > 0)
        ? status.newSideMealIds.map(id => mealsById[id]).filter(Boolean)
        : (status?.changedForAll && status?.newSideMealId ? [mealsById[status.newSideMealId]].filter(Boolean) : []);
      const overriddenDesserts = status?.changedForAll && (status?.newDessertIds && status.newDessertIds.length > 0)
        ? status.newDessertIds.map(id => mealsById[id]).filter(Boolean)
        : (status?.changedForAll && status?.newDessertMealId ? [mealsById[status.newDessertMealId]].filter(Boolean) : []);

      const displayMain = overriddenMain ? {
        name: overriddenMain.name,
        description: overriddenMain.description || '',
        image: overriddenMain.image_url || meal?.image,
        allergens: overriddenMain.allergens || [],
      } : {
        name: meal?.name,
        description: meal?.description || '',
        image: meal?.image,
        allergens: meal?.allergens || [],
      };

      // support multiple sides (meal.sides) and optional dessert
      const mealSides = (overriddenSides && overriddenSides.length > 0)
        ? overriddenSides.map(s => ({ name: s.name }))
        : (meal?.sides || (meal?.sideMeal ? [{ name: meal.sideMeal.name }] : []));
      const displaySideNames = mealSides.length > 0 ? mealSides.map(s => s.name) : [];
      const mealDesserts = (overriddenDesserts && overriddenDesserts.length > 0)
        ? overriddenDesserts.map(d => ({ name: d.name }))
        : (meal?.dessert ? [{ name: meal.dessert.name }] : []);

      const wasOverridden = !!(overriddenMain || (overriddenSides && overriddenSides.length > 0) || (overriddenDesserts && overriddenDesserts.length > 0));
      const altCount = (status?.alternates || []).reduce((s, a) => s + Number(a.residentCount || 0), 0);
      const specialCount = (status?.specialMeals || []).reduce((s, a) => s + Number(a.residentCount || 0), 0);

      return {
        type: meal?.type,
        mainName: displayMain.name,
        sideNames: displaySideNames,
        dessertName: (mealDesserts && mealDesserts.length > 0) ? mealDesserts.map(d => d.name).join(', ') : '',
        description: displayMain.description,
        image: displayMain.image,
        allergens: displayMain.allergens || [],
        overridden: wasOverridden,
        originalMain: meal?.name,
        originalSide: (meal?.sides || (meal?.sideMeal ? [meal.sideMeal] : [])).map(s => s.name).join(', '),
        altCount,
        specialCount,
      };
    });

    const todayLabel = new Date()?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const styles = `
      @media print {
        @page { size: A4; margin: 12mm; }
        body { -webkit-print-color-adjust: exact; }
      }
      body { font-family: 'Source Sans Pro', 'Segoe UI', sans-serif; background: #f5f7fb; color: #0f172a; margin: 0; padding: 0; }
      .page { max-width: 960px; margin: 0 auto; padding: 24px 24px 40px; }
      .hero { text-align: center; margin-bottom: 24px; }
      .title { font-family: 'Playfair Display', 'Georgia', serif; font-size: 30px; margin: 0; letter-spacing: 0.5px; }
      .subtitle { margin: 6px 0 0; color: #475569; font-size: 14px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; min-height: 240px; display: flex; flex-direction: column; }
      .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
      .badge-type { background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; }
      .badge-change { background: #fff7ed; color: #c05621; border: 1px solid #fbd38d; }
      .badge-pill { background: #e0f2fe; color: #0369a1; }
      .name { font-size: 18px; font-weight: 800; margin: 8px 0 4px; color: #0f172a; }
      .side { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; }
      .desc { font-size: 13px; color: #475569; line-height: 1.4; margin: 0 0 10px; }
      .allergens { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
      .tag { padding: 4px 8px; border-radius: 10px; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 700; }
      .footer { margin-top: 12px; font-size: 11px; color: #475569; }
      .hero-bar { margin-top: 10px; display: inline-flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 12px; background: #e0f2fe; color: #0f172a; font-weight: 700; }
      .img { width: 100%; height: 140px; object-fit: cover; border-radius: 12px; border: 1px solid #e2e8f0; background: #f1f5f9; }
    `;

    const mealCards = mealsForPrint.map((m) => {
      const allergenHtml = (m.allergens || []).map((a) => {
        const name = typeof a === 'string' ? a : (a?.name || 'Allergen');
        return `<span class="tag">${name}</span>`;
      }).join('') || '<span class="tag" style="background:#f8fafc;color:#334155;">No allergens listed</span>';
      const altBadge = m.altCount > 0 ? `<span class="badge badge-pill">Alternates: ${m.altCount}</span>` : '';
      const spBadge = m.specialCount > 0 ? `<span class="badge badge-pill" style="background:#f3e8ff;color:#6b21a8;">Special: ${m.specialCount}</span>` : '';
      const changedBadge = m.overridden ? `<span class="badge badge-change">Changed</span>` : '';
      const sideLine = (m.sideNames && m.sideNames.length > 0) ? `<div class="side">Side: ${(m.sideNames || []).join(', ')}</div>` : '';
      const dessertLine = m.dessertName ? `<div class="side">Dessert: ${m.dessertName}</div>` : '';
      const imageBlock = m.image ? `<img class="img" src="${m.image}" alt="${m.mainName}" />` : '';
      const original = m.overridden ? `<div class="footer">Originally: ${m.originalMain}${m.originalSide ? ` + ${m.originalSide}` : ''}</div>` : '';
      return `
        <div class="card">
          ${imageBlock}
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;"> 
            <span class="badge badge-type">${m.type || 'Meal'}</span>
            ${changedBadge}
            ${altBadge}
            ${spBadge}
          </div>
          <div class="name">${m.mainName}</div>
          ${sideLine}
          ${dessertLine}
          <p class="desc">${m.description || ' '}</p>
          <div class="allergens">${allergenHtml}</div>
          ${original}
        </div>`;
    }).join('');

    const todayDate = new Date().toISOString().slice(0, 10);
    const filename = `${selectedCareHome?.name || 'Menu'} - ${todayDate}`;
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${filename}</title>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
          <style>${styles}</style>
        </head>
        <body>
          <div class="page">
            <div class="hero">
              <h1 class="title">Today's Menu</h1>
              <div class="subtitle">${todayLabel} • ${selectedCareHome?.name || ''}</div>
              <div class="hero-bar">Freshly prepared for our residents</div>
            </div>
            <div class="grid">
              ${mealCards}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const refreshStatuses = async () => {
    if (!selectedCareHome) return;
    const map = {};
    const meals = selectedCareHome?.todayMeals || [];
    for (const m of meals) {
      try {
        const mealKey = (m?.type || '').trim();
        const st = await getStatus(selectedCareHome.id, today, mealKey);
        if (st) map[mealKey] = st;
      } catch (e) { console.error('Failed to load status', e); }
    }
    setStatusByMealType(map);
  };

  useEffect(() => { refreshStatuses(); }, [selectedCareHomeId, careHomes, today]);

  const openConfirm = async (meal) => {
    const st = await getStatus(selectedCareHome.id, today, meal?.type);
    
    // Pass scheduled meal info (sides and desserts) to the modal
    const scheduledInfo = {
      scheduledMainId: meal?.id,
      scheduledMainName: meal?.name,
      scheduledSides: meal?.sides || (meal?.sideMeal ? [meal.sideMeal] : []),
      scheduledDesserts: meal?.dessert ? [meal.dessert] : []
    };
    
    setModalContext({ 
      careHomeId: selectedCareHome.id, 
      careHomeName: selectedCareHome.name, 
      date: today, 
      mealType: meal?.type, 
      initialStatus: st || null,
      scheduledInfo
    });
    setModalOpen(true);
  };

  const openViewStatus = async (meal) => {
    const st = await getStatus(selectedCareHome.id, today, meal?.type);
    setModalContext({ careHomeId: selectedCareHome.id, careHomeName: selectedCareHome.name, date: today, mealType: meal?.type, initialStatus: st || null, readOnly: true });
    setModalOpen(true);
  };

  const handleSaveStatus = async (payload) => {
    const res = await saveStatus(payload);
    if (!res?.ok) return alert(res?.error || 'Could not save delivery status.');
    setModalOpen(false);
    await refreshStatuses();
  };

  const getMealIcon = (mealType) => {
    const icons = { breakfast: 'Coffee', lunch: 'Utensils', dinner: 'UtensilsCrossed', supper: 'Sunset', snack: 'Cookie' };
    return icons?.[mealType?.toLowerCase()] || 'Utensils';
  };

  const getAllergenColor = (severity) => {
    const colors = { critical: 'bg-error text-error-foreground', caution: 'bg-warning text-warning-foreground', safe: 'bg-success text-success-foreground' };
    return colors?.[severity] || 'bg-muted text-muted-foreground';
  };

  const getMealBadgeClass = (mealType) => {
    const key = mealType?.toLowerCase();
    const styles = {
      breakfast: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm',
      lunch: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm',
      dinner: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm',
      supper: 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm',
      snack: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm',
    };
    return styles[key] || 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-sm';
  };

  const handleViewCalendar = () => {
    const calendarSection = document.getElementById('weekly-menu-calendar-section');
    if (calendarSection) {
      calendarSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-elevation-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="CalendarCheck" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Today's Menu</h2>
            <p className="text-sm text-muted-foreground">{new Date()?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" iconName="Printer" iconPosition="left" onClick={printTodayMenu}>Print Today's Menu</Button>
          <Button variant="outline" size="sm" iconName="Calendar" iconPosition="left" onClick={handleViewCalendar}>View Calendar</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {careHomes?.map((careHome) => (
          <button key={careHome.id} onClick={() => setSelectedCareHomeId(careHome.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-all ${selectedCareHomeId === careHome.id ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}>
            <div className="flex items-center gap-2"><Icon name="Building2" size={16} />{careHome.name}</div>
          </button>
        ))}
      </div>

      {/* Meals for Selected Care Home */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-6">
            <Skeleton className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-52 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-52 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-52 bg-slate-200 dark:bg-slate-700 rounded" />
            </Skeleton>
          </div>
        ) : sortedTodayMeals.length > 0 ? (
          sortedTodayMeals.map((meal) => {
            const status = statusByMealType?.[meal?.type];
            const mealsById = status?.mealsById || {};
            const overriddenMain = status?.changedForAll && status?.newMainMealId ? mealsById[status.newMainMealId] : null;
            const overriddenSides = status?.changedForAll && (status?.newSideMealIds && status.newSideMealIds.length > 0)
              ? status.newSideMealIds.map(id => mealsById[id]).filter(Boolean)
              : (status?.changedForAll && status?.newSideMealId ? [mealsById[status.newSideMealId]].filter(Boolean) : []);
            const overriddenDesserts = status?.changedForAll && (status?.newDessertIds && status.newDessertIds.length > 0)
              ? status.newDessertIds.map(id => mealsById[id]).filter(Boolean)
              : (status?.changedForAll && status?.newDessertMealId ? [mealsById[status.newDessertMealId]].filter(Boolean) : []);

            const displayMain = overriddenMain ? {
              id: overriddenMain.id,
              name: overriddenMain.name,
              type: meal?.type,
              description: overriddenMain.description || '',
              image: overriddenMain.image_url || meal?.image,
              imageAlt: overriddenMain.name,
              allergens: overriddenMain.allergens || [],
              costPerServing: overriddenMain.cost_per_person || 0,
              ingredients: overriddenMain.ingredients || meal?.ingredients || [],
            } : meal;

            // Build an array of side objects (support meal.sides or legacy meal.sideMeal)
            const displaySides = (overriddenSides && overriddenSides.length > 0) ? overriddenSides.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description || '',
              image_url: s.image_url || s.image || meal?.sideMeal?.image || '',
              costPerServing: s.cost_per_person || s.costPerServing || 0,
              cost_per_person: s.cost_per_person || s.costPerServing || 0,
              ingredients: s.ingredients || meal?.sideMeal?.ingredients || [],
              allergens: s.allergens || [],
              nutritional_info: s.nutritional_info || {},
            })) : (meal?.sides ? meal.sides.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description || '',
              image_url: s.image_url || s.image || '',
              costPerServing: s.cost_per_person || s.costPerServing || 0,
              cost_per_person: s.cost_per_person || s.costPerServing || 0,
              ingredients: s.ingredients || [],
              allergens: s.allergens || [],
              nutritional_info: s.nutritional_info || {},
            })) : (meal?.sideMeal ? [{
              id: meal.sideMeal.id,
              name: meal.sideMeal.name,
              description: meal.sideMeal.description || '',
              image_url: meal.sideMeal.image_url || meal.sideMeal.image || '',
              costPerServing: meal.sideMeal.cost_per_person || meal.sideMeal.costPerServing || 0,
              cost_per_person: meal.sideMeal.cost_per_person || meal.sideMeal.costPerServing || 0,
              ingredients: meal.sideMeal.ingredients || [],
              allergens: meal.sideMeal.allergens || [],
              nutritional_info: meal.sideMeal.nutritional_info || {},
            }] : []));

            // Build dessert list and aggregate into a displayDessert object (name joined, cost summed)
            const displayDessertList = (overriddenDesserts && overriddenDesserts.length > 0)
              ? overriddenDesserts.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description || '',
                image_url: d.image_url || d.image || '',
                costPerServing: d.cost_per_person || d.costPerServing || 0,
                cost_per_person: d.cost_per_person || d.costPerServing || 0,
                ingredients: d.ingredients || [],
                allergens: d.allergens || [],
              })) : (meal?.dessert ? [{
                id: meal.dessert.id,
                name: meal.dessert.name,
                description: meal.dessert.description || '',
                image_url: meal.dessert.image_url || meal.dessert.image || '',
                costPerServing: meal.dessert.cost_per_person || meal.dessert.costPerServing || 0,
                cost_per_person: meal.dessert.cost_per_person || meal.dessert.costPerServing || 0,
                ingredients: meal.dessert.ingredients || [],
                allergens: meal.dessert.allergens || [],
              }] : []);

            const dessertUnitCost = displayDessertList.reduce((s, d) => s + (d.costPerServing || 0), 0);
            const displayDessert = displayDessertList.length > 0 ? {
              id: displayDessertList[0].id,
              name: displayDessertList.map(d => d.name).join(', '),
              description: displayDessertList.map(d => d.description).filter(Boolean).join(' / '),
              image_url: displayDessertList[0].image_url,
              costPerServing: dessertUnitCost,
              cost_per_person: dessertUnitCost,
              ingredients: displayDessertList.flatMap(d => d.ingredients || []),
              allergens: displayDessertList.flatMap(d => d.allergens || []),
            } : null;

            const wasOverridden = !!(overriddenMain || (overriddenSides && overriddenSides.length > 0) || (overriddenDesserts && overriddenDesserts.length > 0));
            const altCount = (status?.alternates || []).reduce((s, a) => s + Number(a.residentCount || 0), 0);
            const specialCount = (status?.specialMeals || []).reduce((s, a) => s + Number(a.residentCount || 0), 0);
            const totalServed = Number(status?.servedCount || 0) + altCount + specialCount;

            const sidesUnitCost = displaySides.reduce((s, x) => s + (x?.costPerServing || 0), 0);
            const mainUnitCost = (displayMain?.costPerServing || 0) + sidesUnitCost + dessertUnitCost;
            const mainTotalCost = mainUnitCost * Number(status?.servedCount || 0);
            const alternateLines = (status?.alternates || []).map((a) => {
              const altMeal = mealsById[a.alternateMealId];
              const altSide = mealsById[a.alternateSideMealId];
              const unit = (altMeal?.cost_per_person || 0) + (altSide?.cost_per_person || 0);
              const count = Number(a.residentCount || 0);
              return {
                label: altMeal?.name || 'Alternate meal',
                sideLabel: altSide?.name,
                count,
                unit,
                total: unit * count,
              };
            });
            const specialLines = (status?.specialMeals || []).map((s) => {
              const spMeal = mealsById[s.specialMealId];
              const spSide = mealsById[s.specialSideMealId];
              const unit = (spMeal?.cost_per_person || 0) + (spSide?.cost_per_person || 0);
              const count = Number(s.residentCount || 0);
              return {
                label: spMeal?.name || 'Special meal',
                sideLabel: spSide?.name,
                count,
                unit,
                total: unit * count,
              };
            });
            const alternatesTotalCost = alternateLines.reduce((s, l) => s + l.total, 0);
            const specialTotalCost = specialLines.reduce((s, l) => s + l.total, 0);
            const grandTotalCost = mainTotalCost + alternatesTotalCost + specialTotalCost;

            return (
              <div key={meal?.id} className={`bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-xl p-5 border-2 transition-all duration-200 ${wasOverridden ? 'border-orange-400 ring-1 ring-orange-200 dark:border-orange-500 dark:ring-orange-800' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-xl'}`}>
                <div className="flex gap-5 items-center">
                  <div className="w-40 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700 shadow-md ring-2 ring-slate-300 dark:ring-slate-600">
                    <div className="w-full">
                      <div className="w-full h-36 overflow-hidden">
                        {displayMain?.image ? (
                          <Image src={displayMain.image} alt={displayMain?.imageAlt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><Icon name="UtensilsCrossed" size={44} /></div>
                        )}
                      </div>

                      <div className="p-2 bg-white/60 dark:bg-slate-800/30">
                        {/* Sides thumbnails row */}
                        {(displaySides || []).length > 0 && (
                          <div className="flex gap-2 mb-2">
                            {(displaySides || []).map((s, idx) => (
                              <div key={`side-img-${idx}`} className="flex-1 h-14 rounded overflow-hidden bg-slate-100 border">
                                {(s?.image_url || s?.image) ? (
                                  <Image src={s.image_url || s.image} alt={s.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Side</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dessert thumbnails row */}
                        {displayDessert && (
                          <div className="flex gap-2">
                            <div className="flex-1 h-14 rounded overflow-hidden bg-slate-100 border">
                              {(displayDessert?.image_url || displayDessert?.image) ? (
                                <Image src={displayDessert.image_url || displayDessert.image} alt={displayDessert.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Dessert</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Icon name={getMealIcon(meal?.type)} size={18} className="text-primary" />
                        <h3 className="text-lg font-bold text-foreground">{displayMain?.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full border border-white/20 ${getMealBadgeClass(meal?.type)}`}>{meal?.type === 'Supper' ? 'Supper' : meal?.type}</span>
                        {wasOverridden && (
                          <div className="relative group inline-block">
                            <span className="text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-full bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 flex items-center gap-1.5 shadow-sm">
                              <Icon name="AlertCircle" size={12} /> Changed
                            </span>
                            <div className="hidden group-hover:block absolute top-full right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg p-3 z-20">
                              <div className="text-xs font-semibold text-foreground mb-1">Change Summary</div>
                              <div className="text-[11px] text-muted-foreground space-y-1">
                                <div className="flex items-start gap-2">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-bold">New</span>
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground">{displayMain?.name}</div>
                                    {displaySides.length > 0 && (
                                      <div className="text-[11px]">+ Side: {displaySides.map(s => s.name).join(', ')}</div>
                                    )}
                                    {displayDessert && (
                                      <div className="text-[11px]">+ Dessert: {displayDessert.name}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[10px] font-bold">Original</span>
                                  <div className="flex-1">
                                    <div className="font-medium text-foreground">{meal?.name}</div>
                                    {meal?.sides ? <div className="text-[11px]">+ Side: {(meal.sides || []).map(s => s.name).join(', ')}</div> : (meal?.sideMeal?.name ? <div className="text-[11px]">+ Side: {meal.sideMeal.name}</div> : null)}
                                    {meal?.dessert?.name && <div className="text-[11px]">+ Dessert: {meal.dessert.name}</div>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {altCount > 0 && (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 shadow-sm">
                            <Icon name="Layers" size={12} /> Alternates: {altCount}
                          </span>
                        )}
                        {specialCount > 0 && (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 shadow-sm">
                            <Icon name="Sparkles" size={12} /> Special: {specialCount}
                          </span>
                        )}
                        {status?.delivered ? (
                          <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Confirmed • {status?.servedCount || 0}</span>
                        ) : (
                          <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Not Confirmed</span>
                        )}
                      </div>
                    </div>

                    {/* Totals line */}
                    {(status || altCount > 0 || specialCount > 0) && (
                      <div className="mb-2 text-[12px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Icon name="Users" size={12} /> Main: {Number(status?.servedCount || 0)}</span>
                        <span className="inline-flex items-center gap-1"><Icon name="Layers" size={12} /> Alternates: {altCount}</span>
                        <span className="inline-flex items-center gap-1"><Icon name="Sparkles" size={12} /> Special: {specialCount}</span>
                        <span className="inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">Total: {totalServed}</span>
                      </div>
                    )}

                    {displayMain?.description && (<p className="text-sm text-muted-foreground mb-3 line-clamp-2">{displayMain.description}</p>)}

                    {displaySides.length > 0 && (
                      <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-400 rounded">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Sides:</p>
                        <div className="mt-2 space-y-1">
                          {displaySides.map((ds, idx) => (
                            <p key={`side-${idx}`} className="text-xs flex items-center justify-between">
                              <span className="flex items-center gap-2"><Icon name="Plus" size={12} className="inline" /> {ds.name}</span>
                              {typeof ds.costPerServing === 'number' && ds.costPerServing > 0 && (<span className="text-[11px] font-bold text-blue-800 dark:text-blue-200">£{ds.costPerServing.toFixed(2)}</span>)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {displayDessert && (
                      <div className="mb-3 p-2 bg-pink-50 dark:bg-pink-950/20 border-l-4 border-pink-400 rounded">
                        <p className="text-xs font-semibold text-pink-700 dark:text-pink-300 flex items-center justify-between gap-2">
                          <span><Icon name="IceCream" size={12} className="inline mr-1" /> Dessert: {displayDessert.name}</span>
                          {typeof displayDessert.costPerServing === 'number' && displayDessert.costPerServing > 0 && (
                            <span className="text-[11px] font-bold text-pink-800 dark:text-pink-200">£{displayDessert.costPerServing.toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {wasOverridden && (
                      <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 rounded">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                          <Icon name="History" size={12} /> Originally: {meal?.name}
                          {meal?.sides ? (<span className="ml-2 text-[11px] font-medium text-orange-800 dark:text-orange-200">+ Side: {(meal.sides || []).map(s => s.name).join(', ')}</span>) : (meal?.sideMeal?.name ? (<span className="ml-2 text-[11px] font-medium text-orange-800 dark:text-orange-200">+ Side: {meal.sideMeal.name}</span>) : null)}
                          {meal?.dessert?.name && <span className="ml-2 text-[11px] font-medium text-orange-800 dark:text-orange-200">+ Dessert: {meal.dessert.name}</span>}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {displayMain?.allergens?.length > 0 ? (
                        displayMain.allergens.map((allergen, index) => (
                          <span key={index} className={`text-xs font-medium px-2.5 py-1 rounded-full ${getAllergenColor(allergen?.severity)}`}>{allergen?.name}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400 italic">No allergens listed</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between flex-wrap">
                      <div className="flex items-center gap-4 text-sm min-w-0">
                        {(displayMain?.costPerServing > 0 || displaySides.some(s => s.costPerServing > 0) || (displayDessert?.costPerServing > 0)) && (
                          <div className="flex items-center gap-2">
                            {displayMain?.costPerServing > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">£{displayMain.costPerServing.toFixed(2)}</span>
                            )}
                            {displaySides.map((ds, idx) => ds?.costPerServing > 0 && (
                              <span key={`side-cost-${idx}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold">+ £{ds.costPerServing.toFixed(2)}</span>
                            ))}
                            {displayDessert && displayDessert?.costPerServing > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 font-bold">+ £{displayDessert.costPerServing.toFixed(2)}</span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold">
                              = £{(mainUnitCost).toFixed(2)}
                              <span className="ml-1 text-xs font-medium text-muted-foreground">per serving</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 min-w-max">
                        <Button variant="ghost" size="sm" iconName="Eye" iconPosition="left" onClick={() => onViewDetails(displayMain?.id, null, displaySides, displayDessert)} className="hover:bg-primary/10">View Details</Button>
                        {/* Cost breakdown moved into View Status modal; removed duplicate control here */}
                        {/* Only show Confirm/View Status if user belongs to the same care home */}
                        {(() => {
                          const sourceRole = String(userRole || authRole || '').toLowerCase();
                          const isStaffLike = sourceRole.includes('staff');
                          const isManagerLike = isCareHomeManager || sourceRole.includes('manager') || sourceRole.includes('care_home_manager') || sourceRole.includes('care home manager');
                          const sameHome = Boolean(staffCareHomeId === selectedCareHomeId || authCareHomeId === selectedCareHomeId);
                          const canConfirm = (isStaffLike || isManagerLike) && sameHome;

                          return (
                            <>
                              {canConfirm && (
                                <Button size="sm" iconName="CheckCircle2" iconPosition="left" onClick={() => openConfirm(meal)} disabled={!!status?.confirmedBy}>
                                  {status?.confirmedBy ? 'Confirmed' : 'Confirm Delivery'}
                                </Button>
                              )}

                              {canConfirm && status?.confirmedBy && (
                                <Button variant="outline" size="sm" iconName="ClipboardList" iconPosition="left" onClick={() => openViewStatus(meal)}>View Status</Button>
                              )}

                              {isAdmin && (
                                <Button variant="outline" size="sm" iconName="ClipboardList" iconPosition="left" onClick={() => openViewStatus(meal)}>View Status</Button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <IngredientCalculator meal={displayMain} sides={displaySides} dessert={displayDessert} />
                      {/* Cost breakdown UI removed from meal card (now available in View Status modal) */}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground"><Icon name="AlertCircle" size={32} className="mx-auto mb-2 opacity-50" /><p>No meals scheduled for {selectedCareHome?.name} today</p></div>
        )}
      </div>

      <ConfirmDeliveryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        careHomeId={modalContext?.careHomeId}
        careHomeName={modalContext?.careHomeName}
        date={modalContext?.date}
        mealType={modalContext?.mealType}
        initialStatus={modalContext?.initialStatus}
        scheduledInfo={modalContext?.scheduledInfo}
        readOnly={modalContext?.readOnly}
        onSave={handleSaveStatus}
        userId={user?.id}
        userName={displayName}
      />
    </div>
  );
};

export default TodayMenuWidget;