import supabase from './supabaseClient';

// Local fallback keys
const keyFor = (careHomeId, date, mealType) => `mds:${careHomeId}:${date}:${mealType}`;

// Grant override permission for a specific delivery status
export async function grantEditOverride(careHomeId, date, mealType, adminPassword, reason) {
  try {
    // Verify admin password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated' };
    
    // Re-authenticate to verify password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: adminPassword,
    });
    
    if (authError) return { ok: false, error: 'Invalid password' };
    
    const adminDisplayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Unknown Admin';
    const actorCareHomeId = user.user_metadata?.care_home_id || null;
    const nowIso = new Date().toISOString();
    
    // Update the delivery status record to grant override
    const { data, error } = await supabase
      .from('meal_delivery_status')
      .update({
        allow_second_edit: true,
        second_edit_allowed_by: user.id,
        second_edit_allowed_by_name: adminDisplayName,
        second_edit_allowed_at: nowIso,
        second_edit_allowed_reason: reason,
      })
      .eq('care_home_id', careHomeId)
      .eq('date', date)
      .eq('meal_type', mealType)
      .select()
      .single();
    
    if (error) return { ok: false, error: error.message };

    // Fire-and-forget audit log entry
    try {
      await supabase.from('audit_logs').insert({
        care_home_id: careHomeId,
        source_table: 'meal_delivery_status',
        entity_type: 'meal_delivery_status',
        entity_id: careHomeId, // composite key; store care home id as reference
        action: 'override_granted',
        summary: 'Admin granted second-edit override',
        notes: `date=${date}, meal=${mealType}, reason=${reason || ''}`,
        before_data: null,
        after_data: { allow_second_edit: true, date, mealType },
        actor_user_id: user.id,
        actor_name: adminDisplayName,
        actor_role: user.app_metadata?.role || user.role || 'admin',
        actor_care_home_id: actorCareHomeId,
        actor_org: null,
        changed_at: nowIso,
      });
    } catch (auditErr) {
      console.warn('Failed to insert audit log for override grant', auditErr);
    }

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message || 'Failed to grant override' };
  }
}

// RPC helper: get scheduled meal id for a given date/type/slot
async function getScheduledMealId(careHomeId, date, mealType, slotKind = 'main') {
  try {
    const { data, error } = await supabase.rpc('get_scheduled_meal', {
      p_care_home_id: careHomeId,
      p_date: date,
      p_meal_type: mealType,
      p_slot_kind: slotKind,
    });
    if (error) return null;
    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.meal_id || null;
    }
  } catch (_) {}
  return null;
}

async function getMealsByIds(ids) {
  if (!ids || ids.length === 0) return {};
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase
    .from('meals')
    .select('id, name, type, cost_per_person, image_url, description, allergens, ingredients')
    .in('id', unique);
  if (error) return {};
  return (data || []).reduce((acc, m) => { acc[m.id] = m; return acc; }, {});
}

// Fetch all scheduled meal ids for a slot (may return multiple rows for 'side' etc.)
async function getScheduledMealIds(careHomeId, date, mealType, slotKind = 'main') {
  try {
    const { data, error } = await supabase.rpc('get_scheduled_meal', {
      p_care_home_id: careHomeId,
      p_date: date,
      p_meal_type: mealType,
      p_slot_kind: slotKind,
    });
    if (error) return [];
    if (!data) return [];
    if (Array.isArray(data)) return data.map(d => d.meal_id).filter(Boolean);
    // single row
    return [data.meal_id].filter(Boolean);
  } catch (_) {
    return [];
  }
}

// Fetch meal schedule data for a date range and care home(s) - OPTIMIZED VERSION
export async function getMealScheduleForDateRange(careHomeIds, startDate, endDate) {
  try {
    if (!careHomeIds || careHomeIds.length === 0) return [];
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Step 1: Fetch active meal cycles for the care homes
    const { data: cycles, error: cyclesError } = await supabase
      .from('meal_cycles')
      .select('id, care_home_id, cycle_name, cycle_length_weeks, start_date, end_date, is_active')
      .in('care_home_id', careHomeIds)
      .eq('is_active', true);
    
    if (cyclesError) {
      console.error('meal_cycles fetch error:', cyclesError);
      return [];
    }
    
    const activeCycles = cycles || [];
    
    if (!activeCycles || activeCycles.length === 0) {
      console.warn('No active meal cycles found for care homes:', careHomeIds);
      return [];
    }
    
    // Step 2: Fetch ALL meal_schedule entries with meal details for these cycles (single batch query)
    const cycleIds = activeCycles.map(c => c.id);
    const { data: schedules, error: schedError } = await supabase
      .from('meal_schedule')
      .select('id, meal_cycle_id, meal_id, week_number, day_of_week, meal_type, slot_kind, meals(id, name, type, cost_per_person, image_url, description, ingredients, allergens)')
      .in('meal_cycle_id', cycleIds);
    
    if (schedError) {
      console.error('meal_schedule fetch error:', schedError);
      return [];
    }
    
    if (!schedules || schedules.length === 0) {
      console.warn('No meal schedules found for cycles:', cycleIds);
      return [];
    }
    
    // Step 3: Build cycle map for quick lookup
    const cycleMap = {};
    activeCycles.forEach(cycle => {
      cycleMap[cycle.id] = cycle;
    });
    
    // Step 4: Expand schedules to actual dates and filter by date range
    const enrichedSchedules = [];
    
    // Generate all dates in range
    const dateSet = new Set();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateSet.add(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // For each date in range, find matching meals from schedules
    dateSet.forEach(dateStr => {
      // Construct date in local time to avoid UTC day shifts
      const dateObj = new Date(`${dateStr}T00:00:00`);
      
      // Find cycles that are active for this date
      activeCycles.forEach(cycle => {
        const cycleStart = new Date(cycle.start_date);
        const daysSinceStart = Math.floor((dateObj - cycleStart) / (1000 * 60 * 60 * 24));
        
        // Only process if date is on or after cycle start
        if (daysSinceStart < 0) return;
        
        // Check if cycle is still active (if end_date is set)
        if (cycle.end_date) {
          const cycleEnd = new Date(cycle.end_date);
          if (dateObj > cycleEnd) return;
        }
        
        // Calculate which week and ISO day in the cycle (with repeating logic)
        const weekInCycle = Math.floor(daysSinceStart / 7) % cycle.cycle_length_weeks; // 0-indexed
        // ISO weekday: Monday=0 ... Sunday=6 (to match DB schema and RPC)
        const dayOfWeek = (dateObj.getDay() + 6) % 7;
        const weekNumber = weekInCycle + 1; // Convert to 1-indexed
        
        // Find matching schedules for this week and day
        schedules.forEach(schedule => {
          if (schedule.meal_cycle_id === cycle.id &&
              schedule.week_number === weekNumber &&
              schedule.day_of_week === dayOfWeek) {
            enrichedSchedules.push({
              id: schedule.id,
              meal_cycle_id: schedule.meal_cycle_id,
              care_home_id: cycle.care_home_id,
              date: dateStr,
              meal_type: schedule.meal_type,
              slot_kind: schedule.slot_kind,
              meal_id: schedule.meal_id,
              meal: schedule.meals || null,
            });
          }
        });
      });
    });
    
    // Step 5: Fetch delivery status overrides for the date range (single batch query)
    const { data: statuses, error: statusError } = await supabase
      .from('meal_delivery_status')
      .select('*')
      .in('care_home_id', careHomeIds)
      .gte('date', startDateStr)
      .lte('date', endDateStr);
    
    if (statusError) {
      console.error('meal_delivery_status fetch error:', statusError);
    }
    
    // Step 6: Build override map and prefetch override meal objects for new_main/new_side/new_dessert ids
    const statusMap = {};
    let overrideMainMealIds = [];
    let overrideSideMealIds = [];
    let overrideDessertMealIds = [];
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        const key = `${status.care_home_id}|${status.date}|${status.meal_type}`;
        statusMap[key] = status;
        if (status.changed_for_all && status.new_main_meal_id) {
          overrideMainMealIds.push(status.new_main_meal_id);
        }
        // new_side_meal_ids may be JSONB array or null
        if (status.changed_for_all && status.new_side_meal_ids && Array.isArray(status.new_side_meal_ids)) {
          overrideSideMealIds = overrideSideMealIds.concat(status.new_side_meal_ids.filter(Boolean));
        } else if (status.changed_for_all && status.new_side_meal_id) {
          overrideSideMealIds.push(status.new_side_meal_id);
        }
        if (status.changed_for_all && status.new_dessert_ids && Array.isArray(status.new_dessert_ids)) {
          overrideDessertMealIds = overrideDessertMealIds.concat(status.new_dessert_ids.filter(Boolean));
        } else if (status.changed_for_all && status.new_dessert_meal_id) {
          overrideDessertMealIds.push(status.new_dessert_meal_id);
        }
      }
    }

    // Fetch meal objects for overridden main/side/dessert ids
    const overrideMealIds = Array.from(new Set([...(overrideMainMealIds || []), ...(overrideSideMealIds || []), ...(overrideDessertMealIds || [])].filter(Boolean)));
    const overrideMealsById = await getMealsByIds(overrideMealIds);

    // Step 7: Apply overrides to enriched schedules
    const finalSchedules = enrichedSchedules.map(schedule => {
      const statusKey = `${schedule.care_home_id}|${schedule.date}|${schedule.meal_type}`;
      const override = statusMap[statusKey];
      
      return {
        ...schedule,
        override: override
          ? {
              ...override,
              override_new_main_meal: override.new_main_meal_id
                ? overrideMealsById[override.new_main_meal_id] || null
                : null,
              override_new_side_meals: (override.new_side_meal_ids && Array.isArray(override.new_side_meal_ids))
                ? override.new_side_meal_ids.map(id => overrideMealsById[id]).filter(Boolean)
                : (override.new_side_meal_id ? [overrideMealsById[override.new_side_meal_id]].filter(Boolean) : []),
              override_new_desserts: (override.new_dessert_ids && Array.isArray(override.new_dessert_ids))
                ? override.new_dessert_ids.map(id => overrideMealsById[id]).filter(Boolean)
                : (override.new_dessert_meal_id ? [overrideMealsById[override.new_dessert_meal_id]].filter(Boolean) : []),
            }
          : null,
      };
    });
    
    console.log('getMealScheduleForDateRange: fetched', cycles.length, 'cycles,', schedules.length, 'schedule entries, expanded to', finalSchedules.length, 'meals');
    return finalSchedules;
  } catch (err) {
    console.error('getMealScheduleForDateRange error:', err);
    return [];
  }
}

export async function getStatus(careHomeId, date, mealType) {
  try {
    // Get base status (no joins to avoid relationship errors if FKs not detected)
    const { data: status, error: statusError } = await supabase
      .from('meal_delivery_status')
      .select('*')
      .eq('care_home_id', careHomeId)
      .eq('date', date)
      .eq('meal_type', mealType)
      .maybeSingle();

    if (statusError) {
      console.error('meal_delivery_status fetch error', statusError);
    }

    if (status) {
      // Fetch alternates separately
      const { data: altRows, error: altError } = await supabase
        .from('meal_delivery_alternates')
        .select('*')
        .eq('care_home_id', careHomeId)
        .eq('date', date)
        .eq('meal_type', mealType);

      // Fetch special meals separately
      const { data: specialRows, error: specialError } = await supabase
        .from('meal_special_meals')
        .select('*')
        .eq('care_home_id', careHomeId)
        .eq('date', date)
        .eq('meal_type', mealType);

      if (altError) {
        console.error('meal_delivery_alternates fetch error', altError);
      }
      if (specialError) {
        console.error('meal_special_meals fetch error', specialError);
      }

      // Determine effective meals (main single id; side/dessert may be multiple)
      let mainMealId = status.changed_for_all && status.new_main_meal_id ? status.new_main_meal_id : null;
      // For sides/desserts prefer explicit arrays on status, else fall back to scheduled ids (may be multiple)
      const scheduledSideIds = await getScheduledMealIds(careHomeId, date, mealType, 'side');
      const scheduledDessertIds = await getScheduledMealIds(careHomeId, date, mealType, 'dessert');
      // Use array if available (changed_for_all OR if new_side_meal_ids exists with side_meal_counts), else fall back to single ID or scheduled
      const effectiveSideIds = (status.new_side_meal_ids && Array.isArray(status.new_side_meal_ids) && status.new_side_meal_ids.length > 0)
        ? status.new_side_meal_ids
        : (status.changed_for_all && status.new_side_meal_id ? [status.new_side_meal_id] : (status.new_side_meal_id ? [status.new_side_meal_id] : scheduledSideIds || []));
      const effectiveDessertIds = (status.new_dessert_ids && Array.isArray(status.new_dessert_ids) && status.new_dessert_ids.length > 0)
        ? status.new_dessert_ids
        : (status.changed_for_all && status.new_dessert_meal_id ? [status.new_dessert_meal_id] : (status.new_dessert_meal_id ? [status.new_dessert_meal_id] : scheduledDessertIds || []));
      // Main single fallback
      if (!mainMealId) mainMealId = await getScheduledMealId(careHomeId, date, mealType, 'main');

      // Collect all meal IDs including alternates, special meals, scheduled side/dessert ids
      const allMealIds = [mainMealId, ...(effectiveSideIds || []), ...(effectiveDessertIds || [])];
      (altRows || []).forEach(a => {
        if (a.alternate_meal_id) allMealIds.push(a.alternate_meal_id);
        if (a.alternate_side_meal_id) allMealIds.push(a.alternate_side_meal_id);
        if (a.alternate_dessert_id) allMealIds.push(a.alternate_dessert_id);
        if (a.alternate_side_meal_ids && Array.isArray(a.alternate_side_meal_ids)) allMealIds.push(...a.alternate_side_meal_ids.filter(Boolean));
        if (a.alternate_dessert_ids && Array.isArray(a.alternate_dessert_ids)) allMealIds.push(...a.alternate_dessert_ids.filter(Boolean));
      });
      (specialRows || []).forEach(s => {
        if (s.special_meal_id) allMealIds.push(s.special_meal_id);
        if (s.special_side_meal_id) allMealIds.push(s.special_side_meal_id);
        if (s.special_dessert_id) allMealIds.push(s.special_dessert_id);
        if (s.special_side_meal_ids && Array.isArray(s.special_side_meal_ids)) allMealIds.push(...s.special_side_meal_ids.filter(Boolean));
        if (s.special_dessert_ids && Array.isArray(s.special_dessert_ids)) allMealIds.push(...s.special_dessert_ids.filter(Boolean));
      });

      const mealsById = await getMealsByIds(allMealIds.filter(Boolean));

      const enriched = {
        ...status,
        alternates: altRows || [],
        specialMeals: specialRows || [],
        // Expose arrays so frontend can render multiple sides/desserts
        new_side_meal_ids: effectiveSideIds && effectiveSideIds.length > 0 ? effectiveSideIds : null,
        new_dessert_ids: effectiveDessertIds && effectiveDessertIds.length > 0 ? effectiveDessertIds : null,
        new_main_meal: mealsById[mainMealId]?.name || null,
        new_side_meal: (effectiveSideIds && effectiveSideIds[0]) ? mealsById[effectiveSideIds[0]]?.name || null : null,
        new_dessert_meal: (effectiveDessertIds && effectiveDessertIds[0]) ? mealsById[effectiveDessertIds[0]]?.name || null : null,
        mealsById,
      };
      
      console.log('[getStatus] Enriched response:');
      console.log('  effectiveSideIds:', effectiveSideIds);
      console.log('  effectiveDessertIds:', effectiveDessertIds);
      console.log('  enriched.new_side_meal_ids:', enriched.new_side_meal_ids);
      console.log('  enriched.mealsById keys:', Object.keys(enriched.mealsById));

      return normalizeStatus(enriched);
    }
  } catch (err) {
    console.error('getStatus error', err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(keyFor(careHomeId, date, mealType));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export async function saveStatus(payload) {
  const { careHomeId, date, mealType, userId, userDisplayName } = payload;
  // Best-effort Supabase upsert
  try {
      console.log('[deliveryService.saveStatus] Received payload:');
      console.log('  payload.sideMealCounts:', payload.sideMealCounts);
      console.log('  payload.newSideMealIds:', payload.newSideMealIds);
      console.log('  payload.dessertCounts:', payload.dessertCounts);
      console.log('  payload.newDessertIds:', payload.newDessertIds);
      
      const isSecondEdit = payload.isSecondEdit || false;
      const isEdit = !isSecondEdit && payload.editReason && payload.editReason.trim();
    const nowIso = new Date().toISOString();
    const base = {
      care_home_id: careHomeId,
      date,
      meal_type: mealType,
      delivered: !!payload.delivered,
      served_count: Number(payload.servedCount ?? 0),
      side_meal_counts: payload.sideMealCounts || null,
      dessert_counts: payload.dessertCounts || null,
      changed_for_all: !!payload.changedForAll,
      new_main_meal_id: payload.newMainMealId || null,
      // Backwards-compatible single-value fields
      new_side_meal_id: payload.newSideMealId || (payload.newSideMealIds && payload.newSideMealIds.length > 0 ? payload.newSideMealIds[0] : null),
      new_dessert_meal_id: payload.newDessertMealId || (payload.newDessertIds && payload.newDessertIds.length > 0 ? payload.newDessertIds[0] : null),
      // Full arrays (JSONB) for multiple selections
      new_side_meal_ids: payload.newSideMealIds || null,
      new_dessert_ids: payload.newDessertIds || null,
      change_reason: payload.changeReason || null,
      confirmed_by: userId || null,
      confirmed_by_name: userId ? userDisplayName || 'Unknown Staff' : null,
      confirmed_at: userId ? new Date().toISOString() : null,
        ...(isEdit ? {
          edited_at: nowIso,
          edit_reason: payload.editReason
        } : {}),
        ...(isSecondEdit ? {
          second_edited_at: nowIso,
          second_edited_by: userId || null,
          second_edited_by_name: userId ? userDisplayName || 'Unknown Staff' : null,
          second_edit_reason: payload.editReason,
          allow_second_edit: false, // Consume the override permission
        } : {})
    };
    
    console.log('[deliveryService.saveStatus] Base object to save:');
    console.log('  base.side_meal_counts:', base.side_meal_counts);
    console.log('  base.new_side_meal_ids:', base.new_side_meal_ids);
    console.log('  base.dessert_counts:', base.dessert_counts);
    console.log('  base.new_dessert_ids:', base.new_dessert_ids);

    // Compute costs to persist: main unit/subtotal, alternates and specials totals and per-row costs
    let augmentedAlternates = [];
    let augmentedSpecials = [];
    try {
      // gather all meal ids referenced in payload
      const allIds = new Set();
      if (base.new_main_meal_id) allIds.add(base.new_main_meal_id);
      (base.new_side_meal_ids || []).forEach(id => id && allIds.add(id));
      (base.new_dessert_ids || []).forEach(id => id && allIds.add(id));
      (payload.alternates || []).forEach(a => {
        if (a.alternateMealId) allIds.add(a.alternateMealId);
        if (a.alternateSideMealIds) a.alternateSideMealIds.forEach(id => id && allIds.add(id));
        if (a.alternateDessertIds) a.alternateDessertIds.forEach(id => id && allIds.add(id));
      });
      (payload.specialMeals || []).forEach(s => {
        if (s.specialMealId) allIds.add(s.specialMealId);
        if (s.specialSideMealIds) s.specialSideMealIds.forEach(id => id && allIds.add(id));
        if (s.specialDessertIds) s.specialDessertIds.forEach(id => id && allIds.add(id));
      });

      const mealsById = await getMealsByIds(Array.from(allIds));

      console.log('saveStatus mealsById:', mealsById);
      console.log('saveStatus base.new_main_meal_id:', base.new_main_meal_id);
      console.log('saveStatus base.new_side_meal_ids:', base.new_side_meal_ids);
      console.log('saveStatus base.new_dessert_ids:', base.new_dessert_ids);

      const mainBase = Number(mealsById[base.new_main_meal_id]?.cost_per_person || 0);
      const mainSidesTotal = (base.new_side_meal_ids || []).reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
      const mainDessertsTotal = (base.new_dessert_ids || []).reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
      
      // Calculate costs based on individual item counts if available
      let mainSubtotal = 0;
      const mainComponents = [];
      
      if (base.new_main_meal_id) {
        const mainCost = mainBase * Number(base.served_count || 0);
        mainSubtotal += mainCost;
        mainComponents.push({ 
          kind: 'main', 
          meal_id: base.new_main_meal_id, 
          unit_cost: mainBase,
          quantity: Number(base.served_count || 0),
          subtotal: mainCost
        });
      }
      
      // Add side meals with individual counts
      (base.new_side_meal_ids || []).forEach(id => {
        if (id) {
          const unitCost = Number(mealsById[id]?.cost_per_person || 0);
          const quantity = base.side_meal_counts ? (Number(base.side_meal_counts[id] || 0)) : Number(base.served_count || 0);
          const subtotal = unitCost * quantity;
          mainSubtotal += subtotal;
          mainComponents.push({ 
            kind: 'side', 
            meal_id: id, 
            unit_cost: unitCost,
            quantity: quantity,
            subtotal: subtotal
          });
        }
      });
      
      // Add desserts with individual counts
      (base.new_dessert_ids || []).forEach(id => {
        if (id) {
          const unitCost = Number(mealsById[id]?.cost_per_person || 0);
          const quantity = base.dessert_counts ? (Number(base.dessert_counts[id] || 0)) : Number(base.served_count || 0);
          const subtotal = unitCost * quantity;
          mainSubtotal += subtotal;
          mainComponents.push({ 
            kind: 'dessert', 
            meal_id: id, 
            unit_cost: unitCost,
            quantity: quantity,
            subtotal: subtotal
          });
        }
      });
      
      // Keep old unit cost for backward compatibility (weighted average or sum)
      const mainUnitCost = mainBase + mainSidesTotal + mainDessertsTotal;

      // Debug log cost computation
      console.log('saveStatus cost computation:', {
        mainBase,
        mainSidesTotal,
        mainDessertsTotal,
        mainUnitCost,
        served_count: base.served_count,
        side_meal_counts: base.side_meal_counts,
        dessert_counts: base.dessert_counts,
        mainSubtotal,
        mainComponents,
        new_side_meal_ids: base.new_side_meal_ids,
        new_dessert_ids: base.new_dessert_ids,
      });

      // Compute alternates rows with unit and subtotal
      const altRowsToInsert = (payload.alternates || []).filter(a => a.residentCount && a.alternateMealId).map(a => {
        const altBase = Number(mealsById[a.alternateMealId]?.cost_per_person || 0);
        const altSides = (a.alternateSideMealIds || []).reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
        const altDesserts = (a.alternateDessertIds || []).reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
        const unit = altBase + altSides + altDesserts;
        const qty = Number(a.residentCount || 0);
        const components = [];
        if (a.alternateMealId) components.push({ kind: 'main', meal_id: a.alternateMealId, unit_cost: altBase });
        (a.alternateSideMealIds || []).forEach(id => { if (id) components.push({ kind: 'side', meal_id: id, unit_cost: Number(mealsById[id]?.cost_per_person || 0) }); });
        (a.alternateDessertIds || []).forEach(id => { if (id) components.push({ kind: 'dessert', meal_id: id, unit_cost: Number(mealsById[id]?.cost_per_person || 0) }); });
        return { ...a, unit_cost: unit, subtotal: unit * qty, alt_base_unit_cost: altBase, alt_sides_unit_cost: altSides, alt_desserts_unit_cost: altDesserts, components };
      });

      const alternatesTotalCost = altRowsToInsert.reduce((s, r) => s + Number(r.subtotal || 0), 0);

      const specRowsToInsert = (payload.specialMeals || []).filter(s => s.residentCount && s.specialMealId).map(s => {
        const spBase = Number(mealsById[s.specialMealId]?.cost_per_person || 0);
        const spSides = (s.specialSideMealIds || []).reduce((sum, id) => sum + Number(mealsById[id]?.cost_per_person || 0), 0);
        const spDesserts = (s.specialDessertIds || []).reduce((sum, id) => sum + Number(mealsById[id]?.cost_per_person || 0), 0);
        const unit = spBase + spSides + spDesserts;
        const qty = Number(s.residentCount || 0);
        const components = [];
        if (s.specialMealId) components.push({ kind: 'main', meal_id: s.specialMealId, unit_cost: spBase });
        (s.specialSideMealIds || []).forEach(id => { if (id) components.push({ kind: 'side', meal_id: id, unit_cost: Number(mealsById[id]?.cost_per_person || 0) }); });
        (s.specialDessertIds || []).forEach(id => { if (id) components.push({ kind: 'dessert', meal_id: id, unit_cost: Number(mealsById[id]?.cost_per_person || 0) }); });
        return { ...s, unit_cost: unit, subtotal: unit * qty, sp_base_unit_cost: spBase, sp_sides_unit_cost: spSides, sp_desserts_unit_cost: spDesserts, components };
      });

      const specialsTotalCost = specRowsToInsert.reduce((s, r) => s + Number(r.subtotal || 0), 0);

      const grandTotal = mainSubtotal + alternatesTotalCost + specialsTotalCost;

      console.log('saveStatus final totals:', {
        mainSubtotal,
        alternatesTotalCost,
        specialsTotalCost,
        grandTotal,
        altRowsCount: altRowsToInsert.length,
        specRowsCount: specRowsToInsert.length,
      });

      // attach computed costs to base for upsert (DB migration should add these columns)
      base.main_unit_cost = mainUnitCost;
      base.main_subtotal = mainSubtotal;
      base.main_base_unit_cost = mainBase;
      base.main_sides_unit_cost = mainSidesTotal;
      base.main_desserts_unit_cost = mainDessertsTotal;
      base.main_components = mainComponents;
      base.alternates_total = alternatesTotalCost;
      base.specials_total = specialsTotalCost;
      base.grand_total = grandTotal;
      base.alternates_details = altRowsToInsert.map(r => ({
        resident_count: Number(r.residentCount || 0),
        unit_cost: r.unit_cost,
        subtotal: r.subtotal,
        components: r.components,
      }));
      base.specials_details = specRowsToInsert.map(r => ({
        resident_count: Number(r.residentCount || 0),
        unit_cost: r.unit_cost,
        subtotal: r.subtotal,
        components: r.components,
      }));

      // Store for later insert
      augmentedAlternates = altRowsToInsert.map(a => ({
        care_home_id: careHomeId,
        date,
        meal_type: mealType,
        resident_count: Number(a.residentCount || 0),
        alternate_meal_id: a.alternateMealId,
        alternate_side_meal_id: a.alternateSideMealId || (a.alternateSideMealIds && a.alternateSideMealIds[0]) || null,
        alternate_dessert_id: a.alternateDessertId || (a.alternateDessertIds && a.alternateDessertIds[0]) || null,
        alternate_side_meal_ids: a.alternateSideMealIds || null,
        alternate_dessert_ids: a.alternateDessertIds || null,
        reason: a.reason || null,
        unit_cost: a.unit_cost,
        subtotal: a.subtotal,
        alt_base_unit_cost: a.alt_base_unit_cost,
        alt_sides_unit_cost: a.alt_sides_unit_cost,
        alt_desserts_unit_cost: a.alt_desserts_unit_cost,
        components: a.components,
      }));

      augmentedSpecials = specRowsToInsert.map(s => ({
        care_home_id: careHomeId,
        date,
        meal_type: mealType,
        resident_count: Number(s.residentCount || 0),
        special_meal_id: s.specialMealId,
        special_side_meal_id: s.specialSideMealId || (s.specialSideMealIds && s.specialSideMealIds[0]) || null,
        special_dessert_id: s.specialDessertId || (s.specialDessertIds && s.specialDessertIds[0]) || null,
        special_side_meal_ids: s.specialSideMealIds || null,
        special_dessert_ids: s.specialDessertIds || null,
        reason: s.reason || null,
        unit_cost: s.unit_cost,
        subtotal: s.subtotal,
        sp_base_unit_cost: s.sp_base_unit_cost,
        sp_sides_unit_cost: s.sp_sides_unit_cost,
        sp_desserts_unit_cost: s.sp_desserts_unit_cost,
        components: s.components,
      }));

    } catch (costErr) {
      console.error('Failed to compute costs for saveStatus', costErr);
    }

    const { data: upserted, error } = await supabase
      .from('meal_delivery_status')
      .upsert(base, { onConflict: 'care_home_id,date,meal_type' })
      .select()
      .maybeSingle();

    if (!error && upserted) {
      // Fire-and-forget audit log for second-edit override usage
      if (isSecondEdit) {
        try {
          await supabase.from('audit_logs').insert({
            care_home_id: careHomeId,
            source_table: 'meal_delivery_status',
            entity_type: 'meal_delivery_status',
            entity_id: careHomeId,
            action: 'override_used',
            summary: 'Staff used admin-approved override to edit',
            notes: `date=${date}, meal=${mealType}, reason=${payload.editReason || ''}`,
            before_data: null,
            after_data: { second_edit_reason: payload.editReason, date, mealType },
            actor_user_id: userId || null,
            actor_name: userDisplayName || 'Unknown Staff',
            actor_role: 'staff',
            actor_care_home_id: careHomeId,
            actor_org: null,
            changed_at: nowIso,
          });
        } catch (auditErr) {
          console.warn('Failed to insert audit log for override usage', auditErr);
        }
      }

      // Replace alternates with count-based model
      if (Array.isArray(payload.alternates)) {
        const { error: delAltErr } = await supabase
          .from('meal_delivery_alternates')
          .delete()
          .eq('care_home_id', careHomeId)
          .eq('date', date)
          .eq('meal_type', mealType);
        if (delAltErr) return { ok: false, error: delAltErr.message };

        // Insert augmented alternates (with unit_cost/subtotal) if computed, otherwise fall back to original payload
        const altInsertRows = (typeof augmentedAlternates !== 'undefined' && augmentedAlternates.length > 0) ? augmentedAlternates : (payload.alternates || [])
          .filter(a => a.residentCount && a.alternateMealId)
          .map(a => ({
            care_home_id: careHomeId,
            date,
            meal_type: mealType,
            resident_count: Number(a.residentCount || 0),
            alternate_meal_id: a.alternateMealId,
            alternate_side_meal_id: a.alternateSideMealId || (a.alternateSideMealIds && a.alternateSideMealIds.length > 0 ? a.alternateSideMealIds[0] : null),
            alternate_dessert_id: a.alternateDessertId || (a.alternateDessertIds && a.alternateDessertIds.length > 0 ? a.alternateDessertIds[0] : null),
            alternate_side_meal_ids: a.alternateSideMealIds || null,
            alternate_dessert_ids: a.alternateDessertIds || null,
            reason: a.reason || null,
            unit_cost: a.unit_cost || null,
            subtotal: a.subtotal || null,
          }));
        if (altInsertRows.length > 0) {
          console.log('Inserting alternates:', altInsertRows);
          const { error: insAltErr } = await supabase.from('meal_delivery_alternates').insert(altInsertRows);
          if (insAltErr) {
            console.error('meal_delivery_alternates insert error:', insAltErr);
            return { ok: false, error: insAltErr.message };
          }
        }
      }

      // Handle special meals (new table)
      if (Array.isArray(payload.specialMeals)) {
        const { error: delSpecErr } = await supabase
          .from('meal_special_meals')
          .delete()
          .eq('care_home_id', careHomeId)
          .eq('date', date)
          .eq('meal_type', mealType);
        if (delSpecErr) return { ok: false, error: delSpecErr.message };

        const specInsertRows = (typeof augmentedSpecials !== 'undefined' && augmentedSpecials.length > 0) ? augmentedSpecials : (payload.specialMeals || [])
          .filter(s => s.residentCount && s.specialMealId)
          .map(s => ({
            care_home_id: careHomeId,
            date,
            meal_type: mealType,
            resident_count: Number(s.residentCount || 0),
            special_meal_id: s.specialMealId,
            special_side_meal_id: s.specialSideMealId || (s.specialSideMealIds && s.specialSideMealIds.length > 0 ? s.specialSideMealIds[0] : null),
            special_dessert_id: s.specialDessertId || (s.specialDessertIds && s.specialDessertIds.length > 0 ? s.specialDessertIds[0] : null),
            special_side_meal_ids: s.specialSideMealIds || null,
            special_dessert_ids: s.specialDessertIds || null,
            reason: s.reason || null,
            unit_cost: s.unit_cost || null,
            subtotal: s.subtotal || null,
          }));
        if (specInsertRows.length > 0) {
          console.log('Inserting specials:', specInsertRows);
          const { error: insSpecErr } = await supabase.from('meal_special_meals').insert(specInsertRows);
          if (insSpecErr) {
            console.error('meal_special_meals insert error:', insSpecErr);
            return { ok: false, error: insSpecErr.message };
          }
        }
      }

      return { ok: true, data: upserted };
    }
    if (error) return { ok: false, error: error.message };
  } catch (err) {
    return { ok: false, error: err?.message || 'Supabase error' };
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(keyFor(careHomeId, date, mealType), JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || 'Failed to save' };
  }
}

export async function listDeliveryStatuses({ startDate, endDate, careHomeId, mealType, delivered, page = 1, pageSize = 50 } = {}) {
  try {
    // Determine which care homes to fetch schedules for
    let careHomeIdsForSchedules = [];
    if (careHomeId) {
      careHomeIdsForSchedules = [careHomeId];
    } else {
      // Fetch all care homes if no specific one is selected (for admin/manager viewing all)
      try {
        const { data: allCareHomes } = await supabase
          .from('care_homes')
          .select('id');
        careHomeIdsForSchedules = (allCareHomes || []).map(ch => ch.id);
      } catch (_) {
        careHomeIdsForSchedules = [];
      }
    }

    // Step 1: Fetch all meal_schedule entries for the date range to identify all scheduled meals
    const allScheduledMeals = careHomeIdsForSchedules.length > 0
      ? await getMealScheduleForDateRange(
          careHomeIdsForSchedules,
          new Date(startDate),
          new Date(endDate)
        )
      : [];

    // Step 2: Fetch confirmed delivery statuses
    let query = supabase
      .from('meal_delivery_status')
      .select('*', { count: 'exact' });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (careHomeId) query = query.eq('care_home_id', careHomeId);
    if (mealType && mealType !== 'All') query = query.eq('meal_type', mealType);
    if (delivered === true) query = query.eq('delivered', true);
    if (delivered === false) query = query.eq('delivered', false);

    const { data: confirmedStatuses, error, count: confirmedCount } = await query
      .order('date', { ascending: false })
      .order('meal_type', { ascending: true });

    if (error) throw error;
    const confirmedRows = confirmedStatuses || [];

    // Step 3: Create a map of confirmed statuses for quick lookup
    const confirmedMap = {};
    confirmedRows.forEach(r => {
      const key = `${r.care_home_id}|${r.date}|${r.meal_type}`;
      confirmedMap[key] = r;
    });

    // Step 4: Build a unified list of confirmed + unconfirmed scheduled meals
    const allRows = [];
    const processedKeys = new Set();

    // Add all confirmed statuses
    confirmedRows.forEach(r => {
      const key = `${r.care_home_id}|${r.date}|${r.meal_type}`;
      processedKeys.add(key);
      allRows.push(r);
    });

    // Add unconfirmed scheduled meals (not yet confirmed)
    allScheduledMeals.forEach(schedule => {
      const key = `${schedule.care_home_id}|${schedule.date}|${schedule.meal_type}`;
      
      // Only add if not already confirmed AND not filtered out by mealType
      if (!processedKeys.has(key)) {
        if (mealType && mealType !== 'All' && schedule.meal_type !== mealType) {
          return;
        }
        
        // Create a pseudo-status entry for unconfirmed meals
        allRows.push({
          id: null, // no database record yet
          care_home_id: schedule.care_home_id,
          date: schedule.date,
          meal_type: schedule.meal_type,
          served_count: 0,
          delivered: false,
          changed_for_all: false,
          new_main_meal_id: null,
          new_side_meal_id: null,
          change_reason: null,
          confirmed_by: null,
          confirmed_by_name: null,
          confirmed_at: null,
          is_unconfirmed: true, // Flag to indicate this is a pending (unconfirmed) meal
        });
        processedKeys.add(key);
      }
    });

    // Step 5: Apply date filtering to combined list
    const filtered = allRows.filter(r => {
      const d = new Date(r.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return d >= start && d <= end;
    });

    // Step 6: Apply delivered filter
    let finalRows = filtered;
    if (delivered === true) {
      finalRows = finalRows.filter(r => r.delivered === true);
    } else if (delivered === false) {
      finalRows = finalRows.filter(r => r.delivered !== true);
    }

    // Step 7: Sort
    finalRows.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateB !== dateA) return dateB - dateA;
      return a.meal_type.localeCompare(b.meal_type);
    });

    // Step 8: Paginate
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedRows = finalRows.slice(from, to);

    // Step 9: Compute effective meal ids and enrich
    const withMealIds = await Promise.all(paginatedRows.map(async (r) => {
      let mainMealId = r.changed_for_all && r.new_main_meal_id ? r.new_main_meal_id : null;
      let sideMealId = r.changed_for_all && r.new_side_meal_id ? r.new_side_meal_id : null;
      if (!mainMealId) mainMealId = await getScheduledMealId(r.care_home_id, r.date, r.meal_type, 'main');
      if (!sideMealId) sideMealId = await getScheduledMealId(r.care_home_id, r.date, r.meal_type, 'side');
      return { ...r, _main_meal_id: mainMealId, _side_meal_id: sideMealId };
    }));

    const mealIds = withMealIds.flatMap(r => [r._main_meal_id, r._side_meal_id]).filter(Boolean);
    const mealsById = await getMealsByIds(mealIds);

    // Fetch alternates and special meals counts for total served calculation
    const enriched = await Promise.all(withMealIds.map(async (r) => {
      // Get alternates count
      const { data: alts } = await supabase
        .from('meal_delivery_alternates')
        .select('resident_count')
        .eq('care_home_id', r.care_home_id)
        .eq('date', r.date)
        .eq('meal_type', r.meal_type);
      
      // Get special meals count
      const { data: specials } = await supabase
        .from('meal_special_meals')
        .select('resident_count')
        .eq('care_home_id', r.care_home_id)
        .eq('date', r.date)
        .eq('meal_type', r.meal_type);
      
      const alternatesTotal = (alts || []).reduce((sum, a) => sum + (Number(a.resident_count) || 0), 0);
      const specialsTotal = (specials || []).reduce((sum, s) => sum + (Number(s.resident_count) || 0), 0);
      const totalServed = (Number(r.served_count) || 0) + alternatesTotal + specialsTotal;
      
      return {
        ...r,
        main_meal_name: r._main_meal_id ? (mealsById[r._main_meal_id]?.name || null) : null,
        side_meal_name: r._side_meal_id ? (mealsById[r._side_meal_id]?.name || null) : null,
        total_served: totalServed,
        alternates_count: alternatesTotal,
        specials_count: specialsTotal,
      };
    }));

    return { ok: true, rows: enriched, count: finalRows.length };
  } catch (err) {
    console.error('listDeliveryStatuses error', err);
    return { ok: false, error: err?.message || 'Failed to list statuses' };
  }
}

export async function listResidents(careHomeId) {
  try {
    const { data, error } = await supabase
      .from('residents')
      .select('id, name')
      .eq('care_home_id', careHomeId)
      .order('name');
    if (!error) return data || [];
  } catch (_) {}
  return [];
}

export async function listMeals() {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select('id, name, type, cost_per_person, image_url, description, allergens')
      .order('name');
    if (!error) return data || [];
  } catch (_) {}
  return [];
}

export async function listMealsByHomeAndGlobal(careHomeId) {
  try {
    // Get global meals (care_home_id is null) and care-home specific meals
    const { data, error } = await supabase
      .from('meals')
      .select('id, name, type, cost_per_person, image_url, description, allergens, care_home_id')
      .or(`care_home_id.is.null,care_home_id.eq.${careHomeId}`)
      .order('name');
    if (!error) return data || [];
  } catch (_) {}
  return [];
}

function normalizeStatus(row) {
  const parseIds = (v) => {
    if (!v && v !== 0) return null;
    if (Array.isArray(v)) return v.filter(Boolean);
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (_) {}
      if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
      return [v];
    }
    return null;
  };
  return {
    careHomeId: row.care_home_id,
    date: row.date,
    mealType: row.meal_type,
    delivered: !!row.delivered,
    servedCount: row.served_count ?? 0,
    changedForAll: !!row.changed_for_all,
    newMainMealId: row.new_main_meal_id || null,
    // Backwards-compatible single-value fields
    newSideMealId: row.new_side_meal_id || null,
    newDessertMealId: row.new_dessert_meal_id || null,
    // Array fields
    newSideMealIds: parseIds(row.new_side_meal_ids),
    newDessertIds: parseIds(row.new_dessert_ids),
    changeReason: row.change_reason || '',
    confirmedBy: row.confirmed_by || null,
    confirmedByName: row.confirmed_by_name || null,
    confirmedAt: row.confirmed_at || null,
      editedAt: row.edited_at || null,
      editReason: row.edit_reason || '',
      allowSecondEdit: row.allow_second_edit || false,
      secondEditAllowedBy: row.second_edit_allowed_by || null,
      secondEditAllowedByName: row.second_edit_allowed_by_name || null,
      secondEditAllowedAt: row.second_edit_allowed_at || null,
      secondEditAllowedReason: row.second_edit_allowed_reason || null,
      secondEditedBy: row.second_edited_by || null,
      secondEditedByName: row.second_edited_by_name || null,
      secondEditedAt: row.second_edited_at || null,
      secondEditReason: row.second_edit_reason || null,
    alternates: Array.isArray(row.alternates)
      ? row.alternates.map(a => ({
          residentCount: a.resident_count ?? 0,
          alternateMealId: a.alternate_meal_id,
          // Backwards-compatible single-value
          alternateSideMealId: a.alternate_side_meal_id || (Array.isArray(a.alternate_side_meal_ids) ? (a.alternate_side_meal_ids[0] || null) : null),
          alternateDessertId: a.alternate_dessert_id || (Array.isArray(a.alternate_dessert_ids) ? (a.alternate_dessert_ids[0] || null) : null),
          // Arrays (may be stringified JSON)
          alternateSideMealIds: parseIds(a.alternate_side_meal_ids) || (a.alternate_side_meal_id ? [a.alternate_side_meal_id] : []),
          alternateDessertIds: parseIds(a.alternate_dessert_ids) || (a.alternate_dessert_id ? [a.alternate_dessert_id] : []),
          reason: a.reason || '',
        }))
      : [],
    specialMeals: Array.isArray(row.specialMeals)
      ? row.specialMeals.map(s => ({
          residentCount: s.resident_count ?? 0,
          specialMealId: s.special_meal_id,
          specialSideMealId: s.special_side_meal_id || (Array.isArray(s.special_side_meal_ids) ? (s.special_side_meal_ids[0] || null) : null),
          specialDessertId: s.special_dessert_id || (Array.isArray(s.special_dessert_ids) ? (s.special_dessert_ids[0] || null) : null),
          specialSideMealIds: parseIds(s.special_side_meal_ids) || (s.special_side_meal_id ? [s.special_side_meal_id] : []),
          specialDessertIds: parseIds(s.special_dessert_ids) || (s.special_dessert_id ? [s.special_dessert_id] : []),
          reason: s.reason || '',
        }))
      : [],
    newMainMeal: row.new_main_meal || null,
    newSideMeal: row.new_side_meal || null,
    mealsById: row.mealsById || {},
    sideMealCounts: row.side_meal_counts || {},
    dessertCounts: row.dessert_counts || {},
  };
}
