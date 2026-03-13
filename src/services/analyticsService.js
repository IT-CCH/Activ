import supabase from './supabaseClient';

export async function getCareHomes() {
  try {
    const { data, error } = await supabase
      .from('care_homes')
      .select('id, name')
      .eq('status', 'Active')
      .order('name');
    if (error) return [];
    return data || [];
  } catch (_) {
    return [];
  }
}

// Helper to call get_scheduled_meal for a single (date, meal_type)
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
    .select('id, name, type, cost_per_person')
    .in('id', unique);
  if (error) return {};
  return (data || []).reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {});
}

async function getCareHomeStats(careHomeId) {
  if (!careHomeId) return { currentResidents: 0 };
  const { data, error } = await supabase
    .from('care_homes')
    .select('current_residents')
    .eq('id', careHomeId)
    .maybeSingle();
  if (error || !data) return { currentResidents: 0 };
  return { currentResidents: Number(data.current_residents || 0) };
}

export async function getCostAnalytics({ startDate, endDate, careHomeId = null }) {
  try {
    const costData = await buildCostData({ startDate, endDate, careHomeId });

    const { totalSpend, totalServed, spendingByDate, spendByMealType, topExpensesMap, sideSpendTotal, dessertSpendTotal, alternatesSpendTotal, specialsSpendTotal, costRows } = costData;

    const timeseries = Object.entries(spendingByDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, spending]) => ({ date, spending, budget: null }));

    const totalForBreakdown = Object.values(spendByMealType).reduce((a, b) => a + b, 0);
    const breakdown = Object.entries(spendByMealType).map(([name, value]) => ({
      name,
      value,
      percentage: totalForBreakdown > 0 ? Number(((value / totalForBreakdown) * 100).toFixed(1)) : 0,
    }));

    const topExpenses = Object.entries(topExpensesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mealId, amount]) => ({
        id: mealId,
        name: costData.mealsById[mealId]?.name || 'Unknown Meal',
        category: costData.mealsById[mealId]?.type || 'Unknown',
        amount,
        change: null,
      }));

    const { currentResidents } = await getCareHomeStats(careHomeId);
    const numDays = timeseries.length || 1;
    const costPerResidentDay = currentResidents > 0 ? totalSpend / (currentResidents * numDays) : 0;
    const avgCostPerMeal = totalServed > 0 ? totalSpend / totalServed : 0;

    const spendCategories = {
      Breakfast: spendByMealType['Breakfast'] || 0,
      Lunch: spendByMealType['Lunch'] || 0,
      Supper: spendByMealType['Supper'] || 0,
      Alternates: alternatesSpendTotal || 0,
      Specials: specialsSpendTotal || 0,
    };

    // Calculate meal type distribution with standard/alternate/special breakdown
    const mealTypes = ['Breakfast', 'Lunch', 'Supper'];
    const mealsServedByType = mealTypes.reduce((acc, type) => {
      acc[type] = { main: 0, alternates: 0, specials: 0, total: 0 };
      return acc;
    }, {});

    Object.values(costRows).forEach((row) => {
      const bucket = mealsServedByType[row.mealType];
      if (!bucket) return;
      bucket.main += Number(row.mainServed || 0);
      bucket.alternates += Number(row.alternatesServed || 0);
      bucket.specials += Number(row.specialsServed || 0);
    });

    Object.values(mealsServedByType).forEach((bucket) => {
      bucket.total = (bucket.main || 0) + (bucket.alternates || 0) + (bucket.specials || 0);
    });

    const mainServedCount = Object.values(mealsServedByType).reduce((sum, bucket) => sum + (bucket.main || 0), 0);
    const alternatesCount = Object.values(mealsServedByType).reduce((sum, bucket) => sum + (bucket.alternates || 0), 0);
    const specialsCount = Object.values(mealsServedByType).reduce((sum, bucket) => sum + (bucket.specials || 0), 0);

    // Cost metrics by meal type
    const costMetricsByType = {
      Breakfast: { spend: spendByMealType['Breakfast'] || 0, served: mealsServedByType.Breakfast?.total || 0, avg: 0 },
      Lunch: { spend: spendByMealType['Lunch'] || 0, served: mealsServedByType.Lunch?.total || 0, avg: 0 },
      Supper: { spend: spendByMealType['Supper'] || 0, served: mealsServedByType.Supper?.total || 0, avg: 0 },
    };
    Object.keys(costMetricsByType).forEach(type => {
      const metric = costMetricsByType[type];
      metric.avg = metric.served > 0 ? metric.spend / metric.served : 0;
    });

    // Efficiency metrics
    const totalServedCount = mainServedCount + alternatesCount + specialsCount;
    const alternatesPercentage = totalServedCount > 0 ? (alternatesCount / totalServedCount) * 100 : 0;
    const specialsPercentage = totalServedCount > 0 ? (specialsCount / totalServedCount) * 100 : 0;
    const standardMealsPercentage = totalServedCount > 0 ? (mainServedCount / totalServedCount) * 100 : 0;

    // Daily metrics
    const dailyMetrics = timeseries.map(day => {
      const dayRows = Object.values(costRows).filter(r => r.date === day.date);
      const dayServed = dayRows.reduce((sum, r) => sum + r.served, 0);
      const avgCostPerDay = dayServed > 0 ? day.spending / dayServed : 0;
      return { date: day.date, spend: day.spending, served: dayServed, avgCost: avgCostPerDay };
    });

    // Highest spending day
    const highestSpendingDay = dailyMetrics.length > 0 
      ? dailyMetrics.reduce((max, day) => day.spend > max.spend ? day : max)
      : { date: '', spend: 0, served: 0, avgCost: 0 };

    // Lowest spending day
    const lowestSpendingDay = dailyMetrics.filter(d => d.spend > 0).length > 0
      ? dailyMetrics.filter(d => d.spend > 0).reduce((min, day) => day.spend < min.spend ? day : min)
      : { date: '', spend: 0, served: 0, avgCost: 0 };

    return {
      ok: true,
      data: {
        totals: { totalSpend, totalServed, currentResidents },
        kpis: {
          totalSpend,
          avgCostPerMeal,
          costPerResidentDay,
          totalServed,
        },
        spendCategories,
        timeseries,
        breakdown,
        topExpenses,
        mealsServedByType,
        costMetricsByType,
        mealDistribution: {
          standard: standardMealsPercentage,
          alternates: alternatesPercentage,
          specials: specialsPercentage,
          standardCount: mainServedCount,
          alternatesCount,
          specialsCount,
        },
        dailyMetrics,
        highestSpendingDay,
        lowestSpendingDay,
        coverage: {
          currentResidents,
          avgDailyServed: totalServed / (numDays || 1),
          coveragePercentage: currentResidents > 0 ? (totalServed / (currentResidents * numDays)) * 100 : 0,
        },
      },
    };
  } catch (err) {
    console.error('getCostAnalytics error', err);
    return { ok: false, error: err?.message || 'Failed to compute analytics' };
  }
}

// New: Detailed cost breakdown across care homes and dates
export async function getCostBreakdown({ startDate, endDate, careHomeId = null }) {
  try {
    const costData = await buildCostData({ startDate, endDate, careHomeId });

    // Aggregate per day and care home
    const rows = Object.values(costData.costRows).map((row) => ({
      careHomeId: row.careHomeId,
      date: row.date,
      mealType: row.mealType,
      mainTotal: row.mainTotal,
      alternatesTotal: row.alternatesTotal,
      specialTotal: row.specialTotal,
      grandTotal: row.grandTotal,
    }));

    const byDay = {};
    for (const r of rows) {
      const dayKey = `${r.careHomeId}|${r.date}`;
      if (!byDay[dayKey]) {
        byDay[dayKey] = {
          careHomeId: r.careHomeId,
          date: r.date,
          mainTotal: 0,
          alternatesTotal: 0,
          specialTotal: 0,
          grandTotal: 0,
        };
      }
      byDay[dayKey].mainTotal += r.mainTotal;
      byDay[dayKey].alternatesTotal += r.alternatesTotal;
      byDay[dayKey].specialTotal += r.specialTotal;
      byDay[dayKey].grandTotal += r.grandTotal;
    }

    return {
      ok: true,
      data: {
        byDay: Object.values(byDay),
        byMeal: Object.values(costData.costRows),
        mealsById: costData.mealsById,
      },
    };
  } catch (err) {
    console.error('getCostBreakdown error', err);
    return { ok: false, error: err?.message || 'Failed to compute cost breakdown' };
  }
}

// Internal: compute cost rows and aggregates
async function buildCostData({ startDate, endDate, careHomeId = null }) {
  // Fetch statuses - try with persisted cost columns first, fallback if columns don't exist
  let statusQuery = supabase
    .from('meal_delivery_status')
    .select('care_home_id, date, meal_type, served_count, changed_for_all, new_main_meal_id, new_side_meal_id, new_side_meal_ids, new_dessert_meal_id, new_dessert_ids, side_meal_counts, dessert_counts, main_unit_cost, main_subtotal, alternates_total, specials_total, grand_total')
    .order('date', { ascending: true });
  if (careHomeId) statusQuery = statusQuery.eq('care_home_id', careHomeId);
  if (startDate) statusQuery = statusQuery.gte('date', startDate);
  if (endDate) statusQuery = statusQuery.lte('date', endDate);

  let statusRows = null;
  let statusError = null;
  try {
    const resp = await statusQuery;
    statusRows = resp.data;
    statusError = resp.error;
  } catch (e) {
    statusError = e;
  }
  
  // If persisted cost columns don't exist, retry without them
  if (statusError && (String(statusError?.message || '').includes('does not exist') || String(statusError?.code || '') === '42703')) {
    console.debug('analyticsService: persisted cost columns missing, retrying without them');
    try {
      let retry = supabase
        .from('meal_delivery_status')
        .select('care_home_id, date, meal_type, served_count, changed_for_all, new_main_meal_id, new_side_meal_id, new_side_meal_ids, new_dessert_meal_id, new_dessert_ids, side_meal_counts, dessert_counts')
        .order('date', { ascending: true });
      if (careHomeId) retry = retry.eq('care_home_id', careHomeId);
      if (startDate) retry = retry.gte('date', startDate);
      if (endDate) retry = retry.lte('date', endDate);
      const r2 = await retry;
      statusRows = r2.data;
      statusError = r2.error;
    } catch (e2) {
      statusError = e2;
    }
  }
  if (statusError) throw statusError;

  // DEBUG: Log first row to see data structure
  if (statusRows && statusRows.length > 0) {
    const firstRow = statusRows[0];
    console.log('DEBUG analyticsService - First status row:');
    console.log('  side_meal_counts:', firstRow.side_meal_counts, typeof firstRow.side_meal_counts);
    console.log('  dessert_counts:', firstRow.dessert_counts, typeof firstRow.dessert_counts);
    console.log('  new_side_meal_ids:', firstRow.new_side_meal_ids, typeof firstRow.new_side_meal_ids);
    console.log('  new_dessert_ids:', firstRow.new_dessert_ids, typeof firstRow.new_dessert_ids);
  }

  // Fetch alternates and specials in range
  const altKey = (r) => `${r.care_home_id}|${r.date}|${r.meal_type}`;
  let altQuery = supabase
    .from('meal_delivery_alternates')
    .select('care_home_id, date, meal_type, resident_count, alternate_meal_id, alternate_side_meal_id, alternate_side_meal_ids, alternate_dessert_id, alternate_dessert_ids, unit_cost, subtotal')
    .order('date', { ascending: true });
  if (careHomeId) altQuery = altQuery.eq('care_home_id', careHomeId);
  if (startDate) altQuery = altQuery.gte('date', startDate);
  if (endDate) altQuery = altQuery.lte('date', endDate);
  let altRows = null;
  let altError = null;
  try {
    const resp = await altQuery;
    altRows = resp.data;
    altError = resp.error;
  } catch (e) {
    altError = e;
  }
  // If unit_cost/subtotal or dessert columns don't exist, retry without them
  if (altError && (String(altError?.message || '').includes('does not exist') || String(altError?.code || '') === '42703')) {
    try {
      console.debug('analyticsService: alternate cost or dessert columns missing, retrying without them');
      let retry = supabase
        .from('meal_delivery_alternates')
        .select('care_home_id, date, meal_type, resident_count, alternate_meal_id, alternate_side_meal_id')
        .order('date', { ascending: true });
      if (careHomeId) retry = retry.eq('care_home_id', careHomeId);
      if (startDate) retry = retry.gte('date', startDate);
      if (endDate) retry = retry.lte('date', endDate);
      const r2 = await retry;
      altRows = r2.data;
      altError = r2.error;
    } catch (e2) {
      altError = e2;
    }
  }
  if (altError) throw altError;

  let specialQuery = supabase
    .from('meal_special_meals')
    .select('care_home_id, date, meal_type, resident_count, special_meal_id, special_side_meal_id, special_side_meal_ids, special_dessert_id, special_dessert_ids, unit_cost, subtotal')
    .order('date', { ascending: true });
  if (careHomeId) specialQuery = specialQuery.eq('care_home_id', careHomeId);
  if (startDate) specialQuery = specialQuery.gte('date', startDate);
  if (endDate) specialQuery = specialQuery.lte('date', endDate);
  let specialRows = null;
  let specialError = null;
  try {
    const resp = await specialQuery;
    specialRows = resp.data;
    specialError = resp.error;
  } catch (e) {
    specialError = e;
  }
  // If unit_cost/subtotal or dessert columns don't exist, retry without them
  if (specialError && (String(specialError?.message || '').includes('does not exist') || String(specialError?.code || '') === '42703')) {
    try {
      console.debug('analyticsService: special cost or dessert columns missing, retrying without them');
      let retry = supabase
        .from('meal_special_meals')
        .select('care_home_id, date, meal_type, resident_count, special_meal_id, special_side_meal_id')
        .order('date', { ascending: true });
      if (careHomeId) retry = retry.eq('care_home_id', careHomeId);
      if (startDate) retry = retry.gte('date', startDate);
      if (endDate) retry = retry.lte('date', endDate);
      const r2 = await retry;
      specialRows = r2.data;
      specialError = r2.error;
    } catch (e2) {
      specialError = e2;
    }
  }
  if (specialError) throw specialError;

  const altByKey = altRows?.reduce((acc, r) => {
    const k = altKey(r);
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {}) || {};

  const specialByKey = specialRows?.reduce((acc, r) => {
    const k = altKey(r);
    if (!acc[k]) acc[k] = [];
    acc[k].push(r);
    return acc;
  }, {}) || {};

  // Resolve meal ids including overrides, sides, alternates, specials
  const mealIds = new Set();
  const statusWithIds = [];
  for (const row of statusRows || []) {
    let mainMealId = row.changed_for_all && row.new_main_meal_id ? row.new_main_meal_id : null;
    let sideMealId = row.changed_for_all && row.new_side_meal_id ? row.new_side_meal_id : null;
    let dessertMealId = row.changed_for_all && row.new_dessert_meal_id ? row.new_dessert_meal_id : null;
    
    // Handle multiple sides and desserts (JSONB arrays)
    let newSideMealIds = [];
    if (row.changed_for_all && row.new_side_meal_ids && Array.isArray(row.new_side_meal_ids)) {
      newSideMealIds = row.new_side_meal_ids.filter(Boolean);
    } else if (sideMealId) {
      newSideMealIds = [sideMealId];
    }
    
    let newDessertIds = [];
    if (row.changed_for_all && row.new_dessert_ids && Array.isArray(row.new_dessert_ids)) {
      newDessertIds = row.new_dessert_ids.filter(Boolean);
    } else if (dessertMealId) {
      newDessertIds = [dessertMealId];
    }
    
    if (!mainMealId) mainMealId = await getScheduledMealId(row.care_home_id, row.date, row.meal_type, 'main');
    if (newSideMealIds.length === 0) {
      const scheduledSideId = await getScheduledMealId(row.care_home_id, row.date, row.meal_type, 'side');
      if (scheduledSideId) newSideMealIds = [scheduledSideId];
    }
    if (newDessertIds.length === 0) {
      const scheduledDessertId = await getScheduledMealId(row.care_home_id, row.date, row.meal_type, 'dessert');
      if (scheduledDessertId) newDessertIds = [scheduledDessertId];
    }

    // Also pull meal ids from JSONB count objects when arrays/ids are missing
    const sideCountsKeys = (() => {
      const raw = row.side_meal_counts;
      if (!raw) return [];
      if (typeof raw === 'object') return Object.keys(raw).filter(Boolean);
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Object.keys(parsed || {}).filter(Boolean);
        } catch (_) {
          return [];
        }
      }
      return [];
    })();

    const dessertCountsKeys = (() => {
      const raw = row.dessert_counts;
      if (!raw) return [];
      if (typeof raw === 'object') return Object.keys(raw).filter(Boolean);
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          return Object.keys(parsed || {}).filter(Boolean);
        } catch (_) {
          return [];
        }
      }
      return [];
    })();

    if (sideCountsKeys.length > 0) {
      newSideMealIds = Array.from(new Set([...(newSideMealIds || []), ...sideCountsKeys]));
    }
    if (dessertCountsKeys.length > 0) {
      newDessertIds = Array.from(new Set([...(newDessertIds || []), ...dessertCountsKeys]));
    }
    
    if (mainMealId) mealIds.add(mainMealId);
    newSideMealIds.forEach(id => mealIds.add(id));
    newDessertIds.forEach(id => mealIds.add(id));

    const key = `${row.care_home_id}|${row.date}|${row.meal_type}`;
    (altByKey[key] || []).forEach((a) => {
      if (a.alternate_meal_id) mealIds.add(a.alternate_meal_id);
      if (a.alternate_side_meal_id) mealIds.add(a.alternate_side_meal_id);
      if (Array.isArray(a.alternate_side_meal_ids)) a.alternate_side_meal_ids.forEach(id => mealIds.add(id));
      if (a.alternate_dessert_meal_id) mealIds.add(a.alternate_dessert_meal_id);
      if (a.alternate_dessert_id) mealIds.add(a.alternate_dessert_id);
      if (Array.isArray(a.alternate_dessert_ids)) a.alternate_dessert_ids.forEach(id => mealIds.add(id));
    });
    (specialByKey[key] || []).forEach((s) => {
      if (s.special_meal_id) mealIds.add(s.special_meal_id);
      if (s.special_side_meal_id) mealIds.add(s.special_side_meal_id);
      if (Array.isArray(s.special_side_meal_ids)) s.special_side_meal_ids.forEach(id => mealIds.add(id));
      if (s.special_dessert_meal_id) mealIds.add(s.special_dessert_meal_id);
      if (s.special_dessert_id) mealIds.add(s.special_dessert_id);
      if (Array.isArray(s.special_dessert_ids)) s.special_dessert_ids.forEach(id => mealIds.add(id));
    });

    statusWithIds.push({ ...row, mainMealId, sideMealId, dessertMealId, newSideMealIds, newDessertIds });
  }

  const mealsById = await getMealsByIds(Array.from(mealIds));

  // Compute costs per status
  const costRows = {};
  const spendingByDate = {};
  const spendByMealType = {};
  const topExpensesMap = {};
  let sideSpendTotal = 0;
  let dessertSpendTotal = 0;
  let alternatesSpendTotal = 0;
  let specialsSpendTotal = 0;
  let totalServed = 0;
  let totalSpend = 0;

  for (const row of statusWithIds) {
    const key = `${row.care_home_id}|${row.date}|${row.meal_type}`;
    const alternates = altByKey[key] || [];
    const specials = specialByKey[key] || [];

    const mainMeal = mealsById[row.mainMealId];
    const sideMeal = mealsById[row.sideMealId];
    const dessertMeal = mealsById[row.dessertMealId];
    const mainServed = Number(row.served_count || 0);

    // Get individual item counts from JSONB columns
    const sideMealCounts = row.side_meal_counts || {};
    const dessertCounts = row.dessert_counts || {};
    let newSideMealIds = [];
    let newDessertIds = [];

    // Handle both array and single ID formats for side meals
    if (row.new_side_meal_ids) {
      if (Array.isArray(row.new_side_meal_ids)) {
        newSideMealIds = row.new_side_meal_ids.filter(Boolean);
      } else if (typeof row.new_side_meal_ids === 'string') {
        try {
          const parsed = JSON.parse(row.new_side_meal_ids);
          newSideMealIds = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
        } catch (e) {
          newSideMealIds = [row.new_side_meal_ids].filter(Boolean);
        }
      }
    } else if (row.new_side_meal_id) {
      newSideMealIds = [row.new_side_meal_id];
    }

    // Handle both array and single ID formats for desserts
    if (row.new_dessert_ids) {
      if (Array.isArray(row.new_dessert_ids)) {
        newDessertIds = row.new_dessert_ids.filter(Boolean);
      } else if (typeof row.new_dessert_ids === 'string') {
        try {
          const parsed = JSON.parse(row.new_dessert_ids);
          newDessertIds = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
        } catch (e) {
          newDessertIds = [row.new_dessert_ids].filter(Boolean);
        }
      }
    } else if (row.new_dessert_meal_id || row.new_dessert_id) {
      newDessertIds = [row.new_dessert_meal_id || row.new_dessert_id];
    }

    // Parse counts if they come as JSON strings, handle null/undefined
    let sideMealCountsObj = {};
    if (sideMealCounts) {
      if (typeof sideMealCounts === 'object') {
        sideMealCountsObj = sideMealCounts;
      } else if (typeof sideMealCounts === 'string') {
        try {
          sideMealCountsObj = JSON.parse(sideMealCounts);
        } catch (e) {
          sideMealCountsObj = {};
        }
      }
    }

    let dessertCountsObj = {};
    if (dessertCounts) {
      if (typeof dessertCounts === 'object') {
        dessertCountsObj = dessertCounts;
      } else if (typeof dessertCounts === 'string') {
        try {
          dessertCountsObj = JSON.parse(dessertCounts);
        } catch (e) {
          dessertCountsObj = {};
        }
      }
    }

    // KEY FIX: Extract meal IDs from the counts objects if the ID arrays are missing
    if ((!newSideMealIds || newSideMealIds.length === 0)) {
      const parsedKeys = Object.keys(sideMealCountsObj || {}).filter(Boolean);
      if (parsedKeys.length > 0) {
        newSideMealIds = parsedKeys;
        console.log(`[${row.date} ${row.meal_type}] derived side IDs from counts`, parsedKeys);
      } else if (typeof sideMealCounts === 'string') {
        try {
          const parsed = JSON.parse(sideMealCounts);
          const keys = Object.keys(parsed || {}).filter(Boolean);
          if (keys.length > 0) {
            newSideMealIds = keys;
            console.log(`[${row.date} ${row.meal_type}] derived side IDs from raw string counts`, keys);
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }

    if ((!newDessertIds || newDessertIds.length === 0)) {
      const parsedKeys = Object.keys(dessertCountsObj || {}).filter(Boolean);
      if (parsedKeys.length > 0) {
        newDessertIds = parsedKeys;
        console.log(`[${row.date} ${row.meal_type}] derived dessert IDs from counts`, parsedKeys);
      } else if (typeof dessertCounts === 'string') {
        try {
          const parsed = JSON.parse(dessertCounts);
          const keys = Object.keys(parsed || {}).filter(Boolean);
          if (keys.length > 0) {
            newDessertIds = keys;
            console.log(`[${row.date} ${row.meal_type}] derived dessert IDs from raw string counts`, keys);
          }
        } catch (e) {
          // ignore parse error
        }
      }
    }

    // DEBUG: Log if we have any side/dessert data
    if (newSideMealIds.length > 0 || newDessertIds.length > 0) {
      console.log(`[${row.date} ${row.meal_type}] sides: ids=${newSideMealIds.length}, counts=${JSON.stringify(sideMealCountsObj)}`);
    }

    // Calculate actual quantities for sides and desserts based on individual counts
    let sidesQuantity = 0;
    if (newSideMealIds.length > 0) {
      // Use individual counts if available, otherwise use served count
      sidesQuantity = newSideMealIds.reduce((sum, id) => {
        return sum + Number(sideMealCountsObj[id] || mainServed);
      }, 0);
    }

    let dessertsQuantity = 0;
    if (newDessertIds.length > 0) {
      // Use individual counts if available, otherwise use served count
      dessertsQuantity = newDessertIds.reduce((sum, id) => {
        return sum + Number(dessertCountsObj[id] || mainServed);
      }, 0);
    }

    // component-level unit costs for the main (used for detailed breakdown regardless of persistence)
    const mainUnitBreakdown = {
      main: Number(mainMeal?.cost_per_person || 0),
      sides: 0,
      desserts: 0,
    };
    
    // Calculate sides and desserts unit costs using new JSONB counts
    if (newSideMealIds.length > 0) {
      mainUnitBreakdown.sides = newSideMealIds.reduce((sum, id) => {
        return sum + Number(mealsById[id]?.cost_per_person || 0);
      }, 0);
    }
    if (newDessertIds.length > 0) {
      mainUnitBreakdown.desserts = newDessertIds.reduce((sum, id) => {
        return sum + Number(mealsById[id]?.cost_per_person || 0);
      }, 0);
    }
    
    const mainTotalsByPart = {
      main: mainUnitBreakdown.main * mainServed,
      sides: 0,
      desserts: 0,
    };

    // Calculate main total with proper handling of multiple sides/desserts
    let mainSidesTotal = 0;
    if (newSideMealIds.length > 0) {
      mainSidesTotal = newSideMealIds.reduce((sum, id) => {
        const meal = mealsById[id];
        const qty = Number(sideMealCountsObj[id] || mainServed);
        return sum + (Number(meal?.cost_per_person || 0) * qty);
      }, 0);
      mainTotalsByPart.sides = mainSidesTotal;
    }

    let mainDessertsTotal = 0;
    if (newDessertIds.length > 0) {
      mainDessertsTotal = newDessertIds.reduce((sum, id) => {
        const meal = mealsById[id];
        const qty = Number(dessertCountsObj[id] || mainServed);
        return sum + (Number(meal?.cost_per_person || 0) * qty);
      }, 0);
      mainTotalsByPart.desserts = mainDessertsTotal;
    }

    const mainMainTotal = Number(mainMeal?.cost_per_person || 0) * mainServed;
    const computedMainTotal = mainMainTotal + mainSidesTotal + mainDessertsTotal;

    // DEBUG: Log cost calculation
    if (mainSidesTotal > 0 || mainDessertsTotal > 0) {
      console.log(`[${row.date} ${row.meal_type}] costs: main=${mainMainTotal.toFixed(2)}, sides=${mainSidesTotal.toFixed(2)}, desserts=${mainDessertsTotal.toFixed(2)}, total=${computedMainTotal.toFixed(2)}`);
    }

    // prefer persisted unit/subtotal if present AND valid (> 0)
    const hasPersisted = row.main_unit_cost != null && Number(row.main_unit_cost) > 0;
    const computedMainUnit = mainUnitBreakdown.main + mainUnitBreakdown.sides + mainUnitBreakdown.desserts;
    const mainUnit = hasPersisted ? Number(row.main_unit_cost) : computedMainUnit;
    const mainTotal = (row.main_subtotal != null && Number(row.main_subtotal) > 0) ? Number(row.main_subtotal) : computedMainTotal;

    const alternateLines = alternates.map((a) => {
      // support both snake_case (DB) and camelCase (normalized) shapes
      const altMealId = a.alternate_meal_id || a.alternateMealId || a.alternate_meal || a.alternateMeal;
      const altMeal = mealsById[altMealId];
      // normalize side ids (support single and array fields)
      const altSideIds = [];
      if (Array.isArray(a.alternate_side_meal_ids)) altSideIds.push(...a.alternate_side_meal_ids);
      if (a.alternate_side_meal_id) altSideIds.push(a.alternate_side_meal_id);
      if (Array.isArray(a.alternateSideMealIds)) altSideIds.push(...a.alternateSideMealIds);
      if (a.alternateSideMealId) altSideIds.push(a.alternateSideMealId);
      const dedupAltSideIds = Array.from(new Set((altSideIds || []).filter(Boolean)));

      // normalize dessert ids
      const altDessertIds = [];
      if (Array.isArray(a.alternate_dessert_ids)) altDessertIds.push(...a.alternate_dessert_ids);
      if (a.alternate_dessert_id) altDessertIds.push(a.alternate_dessert_id);
      if (Array.isArray(a.alternateDessertIds)) altDessertIds.push(...a.alternateDessertIds);
      if (a.alternateDessertId) altDessertIds.push(a.alternateDessertId);
      if (a.alternate_dessert_meal_id) altDessertIds.push(a.alternate_dessert_meal_id);
      const dedupAltDessertIds = Array.from(new Set((altDessertIds || []).filter(Boolean)));

      // prefer persisted unit/subtotal if available AND valid on the alternate row
      const computedAltMainUnit = Number(altMeal?.cost_per_person || 0);
      const computedAltSideUnit = dedupAltSideIds.reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
      const computedAltDessertUnit = dedupAltDessertIds.reduce((s, id) => s + Number(mealsById[id]?.cost_per_person || 0), 0);
      const computedUnit = computedAltMainUnit + computedAltSideUnit + computedAltDessertUnit;
      const count = Number(a.resident_count ?? a.residentCount ?? 0);
      const unit = (a.unit_cost != null && Number(a.unit_cost) > 0) ? Number(a.unit_cost) : computedUnit;
      const total = (a.subtotal != null && Number(a.subtotal) > 0) ? Number(a.subtotal) : unit * count;
      return {
        mealId: altMeal?.id,
        sideIds: dedupAltSideIds,
        dessertIds: dedupAltDessertIds,
        label: altMeal?.name || 'Alternate meal',
        sideLabel: dedupAltSideIds.map(id => mealsById[id]?.name).filter(Boolean).join(', ') || null,
        dessertLabel: dedupAltDessertIds.map(id => mealsById[id]?.name).filter(Boolean).join(', ') || null,
        count,
        unit,
        total,
        unitBreakdown: { main: computedAltMainUnit, sides: computedAltSideUnit, desserts: computedAltDessertUnit },
        totalBreakdown: {
          main: computedAltMainUnit * count,
          sides: computedAltSideUnit * count,
          desserts: computedAltDessertUnit * count,
        },
      };
    });

    const specialLines = specials.map((s) => {
      const spMealId = s.special_meal_id || s.specialMealId || s.special_meal || s.specialMeal;
      const spMeal = mealsById[spMealId];
      const spSideIds = [];
      if (Array.isArray(s.special_side_meal_ids)) spSideIds.push(...s.special_side_meal_ids);
      if (s.special_side_meal_id) spSideIds.push(s.special_side_meal_id);
      if (Array.isArray(s.specialSideMealIds)) spSideIds.push(...s.specialSideMealIds);
      if (s.specialSideMealId) spSideIds.push(s.specialSideMealId);
      const dedupSpSideIds = Array.from(new Set((spSideIds || []).filter(Boolean)));

      const spDessertIds = [];
      if (Array.isArray(s.special_dessert_ids)) spDessertIds.push(...s.special_dessert_ids);
      if (s.special_dessert_id) spDessertIds.push(s.special_dessert_id);
      if (Array.isArray(s.specialDessertIds)) spDessertIds.push(...s.specialDessertIds);
      if (s.specialDessertId) spDessertIds.push(s.specialDessertId);
      if (s.special_dessert_meal_id) spDessertIds.push(s.special_dessert_meal_id);
      const dedupSpDessertIds = Array.from(new Set((spDessertIds || []).filter(Boolean)));

      const computedSpMainUnit = Number(spMeal?.cost_per_person || 0);
      const computedSpSideUnit = dedupSpSideIds.reduce((s2, id) => s2 + Number(mealsById[id]?.cost_per_person || 0), 0);
      const computedSpDessertUnit = dedupSpDessertIds.reduce((s2, id) => s2 + Number(mealsById[id]?.cost_per_person || 0), 0);
      const computedSpUnit = computedSpMainUnit + computedSpSideUnit + computedSpDessertUnit;
      const count = Number(s.resident_count ?? s.residentCount ?? 0);
      const unit = (s.unit_cost != null && Number(s.unit_cost) > 0) ? Number(s.unit_cost) : computedSpUnit;
      const total = (s.subtotal != null && Number(s.subtotal) > 0) ? Number(s.subtotal) : unit * count;
      return {
        mealId: spMeal?.id,
        sideIds: dedupSpSideIds,
        dessertIds: dedupSpDessertIds,
        label: spMeal?.name || 'Special meal',
        sideLabel: dedupSpSideIds.map(id => mealsById[id]?.name).filter(Boolean).join(', ') || null,
        dessertLabel: dedupSpDessertIds.map(id => mealsById[id]?.name).filter(Boolean).join(', ') || null,
        count,
        unit,
        total,
        unitBreakdown: { main: computedSpMainUnit, sides: computedSpSideUnit, desserts: computedSpDessertUnit },
        totalBreakdown: {
          main: computedSpMainUnit * count,
          sides: computedSpSideUnit * count,
          desserts: computedSpDessertUnit * count,
        },
      };
    });

    const alternatesTotal = alternateLines.reduce((sum, l) => sum + l.total, 0);
    const specialTotal = specialLines.reduce((sum, l) => sum + l.total, 0);

    // Ensure alternates/specials spend totals include main+side+dessert components
    alternatesSpendTotal += alternatesTotal;
    specialsSpendTotal += specialTotal;

    const grandTotal = mainTotal + alternatesTotal + specialTotal;

    // Count residents served: main served + alternates + specials
    const alternatesCount = alternateLines.reduce((s, l) => s + (Number(l.count) || 0), 0);
    const specialsCount = specialLines.reduce((s, l) => s + (Number(l.count) || 0), 0);
    const totalServedForRow = mainServed + alternatesCount + specialsCount;

    // Top expenses by individual meal (main + side + dessert + alternates + specials)
    if (mainMeal && mainServed > 0) topExpensesMap[mainMeal.id] = (topExpensesMap[mainMeal.id] || 0) + mainServed * Number(mainMeal.cost_per_person || 0);
    
    // Calculate side meals costs using individual counts
    if (newSideMealIds.length > 0) {
      newSideMealIds.forEach((id) => {
        const meal = mealsById[id];
        if (meal) {
          const qty = Number(sideMealCountsObj[id] || mainServed);
          const cost = qty * Number(meal.cost_per_person || 0);
          topExpensesMap[id] = (topExpensesMap[id] || 0) + cost;
          sideSpendTotal += cost;
        }
      });
    } else if (sideMeal && mainServed > 0) {
      // Legacy: single side meal
      topExpensesMap[sideMeal.id] = (topExpensesMap[sideMeal.id] || 0) + mainServed * Number(sideMeal.cost_per_person || 0);
      sideSpendTotal += mainServed * Number(sideMeal.cost_per_person || 0);
    }
    
    // Calculate dessert costs using individual counts
    if (newDessertIds.length > 0) {
      newDessertIds.forEach((id) => {
        const meal = mealsById[id];
        if (meal) {
          const qty = Number(dessertCountsObj[id] || mainServed);
          const cost = qty * Number(meal.cost_per_person || 0);
          topExpensesMap[id] = (topExpensesMap[id] || 0) + cost;
          dessertSpendTotal += cost;
        }
      });
    } else if (dessertMeal && mainServed > 0) {
      // Legacy: single dessert
      topExpensesMap[dessertMeal.id] = (topExpensesMap[dessertMeal.id] || 0) + mainServed * Number(dessertMeal.cost_per_person || 0);
      dessertSpendTotal += mainServed * Number(dessertMeal.cost_per_person || 0);
    }
    alternates.forEach((a) => {
      const count = Number(a.resident_count ?? a.residentCount ?? 0);
      const altMealId = a.alternate_meal_id || a.alternateMealId || a.alternate_meal || a.alternateMeal;
      const altMeal = mealsById[altMealId];
      if (altMeal) {
        topExpensesMap[altMeal.id] = (topExpensesMap[altMeal.id] || 0) + count * Number(altMeal.cost_per_person || 0);
      }
      // sides (support single and array fields)
      const altSideIds = [];
      if (Array.isArray(a.alternate_side_meal_ids)) altSideIds.push(...a.alternate_side_meal_ids);
      if (a.alternate_side_meal_id) altSideIds.push(a.alternate_side_meal_id);
      if (Array.isArray(a.alternateSideMealIds)) altSideIds.push(...a.alternateSideMealIds);
      if (a.alternateSideMealId) altSideIds.push(a.alternateSideMealId);
      if (Array.isArray(a.alternate_side_ids)) altSideIds.push(...a.alternate_side_ids);
      if (a.alternate_side_id) altSideIds.push(a.alternate_side_id);
      const dedupAltSideIds = Array.from(new Set((altSideIds || []).filter(Boolean)));
      dedupAltSideIds.forEach((id) => {
        const m = mealsById[id];
        if (m) {
          topExpensesMap[m.id] = (topExpensesMap[m.id] || 0) + count * Number(m.cost_per_person || 0);
          sideSpendTotal += count * Number(m.cost_per_person || 0);
        }
      });
      // desserts (support single and array fields)
      const altDessertIds = [];
      if (Array.isArray(a.alternate_dessert_ids)) altDessertIds.push(...a.alternate_dessert_ids);
      if (a.alternate_dessert_id) altDessertIds.push(a.alternate_dessert_id);
      if (Array.isArray(a.alternateDessertIds)) altDessertIds.push(...a.alternateDessertIds);
      if (a.alternateDessertId) altDessertIds.push(a.alternateDessertId);
      if (a.alternate_dessert_meal_id) altDessertIds.push(a.alternate_dessert_meal_id);
      if (Array.isArray(a.alternate_dessert_ids_list)) altDessertIds.push(...a.alternate_dessert_ids_list);
      const dedupAltDessertIds = Array.from(new Set((altDessertIds || []).filter(Boolean)));
      dedupAltDessertIds.forEach((id) => {
        const m = mealsById[id];
        if (m) {
          topExpensesMap[m.id] = (topExpensesMap[m.id] || 0) + count * Number(m.cost_per_person || 0);
          dessertSpendTotal += count * Number(m.cost_per_person || 0);
        }
      });
    });
    specials.forEach((s) => {
      const count = Number(s.resident_count ?? s.residentCount ?? 0);
      const spMealId = s.special_meal_id || s.specialMealId || s.special_meal || s.specialMeal;
      const spMeal = mealsById[spMealId];
      if (spMeal) {
        topExpensesMap[spMeal.id] = (topExpensesMap[spMeal.id] || 0) + count * Number(spMeal.cost_per_person || 0);
      }
      // sides
      const spSideIds = [];
      if (Array.isArray(s.special_side_meal_ids)) spSideIds.push(...s.special_side_meal_ids);
      if (s.special_side_meal_id) spSideIds.push(s.special_side_meal_id);
      if (Array.isArray(s.specialSideMealIds)) spSideIds.push(...s.specialSideMealIds);
      if (s.specialSideMealId) spSideIds.push(s.specialSideMealId);
      if (Array.isArray(s.special_side_ids)) spSideIds.push(...s.special_side_ids);
      if (s.special_side_id) spSideIds.push(s.special_side_id);
      const dedupSpSideIds = Array.from(new Set((spSideIds || []).filter(Boolean)));
      dedupSpSideIds.forEach((id) => {
        const m = mealsById[id];
        if (m) {
          topExpensesMap[m.id] = (topExpensesMap[m.id] || 0) + count * Number(m.cost_per_person || 0);
          sideSpendTotal += count * Number(m.cost_per_person || 0);
        }
      });
      // desserts
      const spDessertIds = [];
      if (Array.isArray(s.special_dessert_ids)) spDessertIds.push(...s.special_dessert_ids);
      if (s.special_dessert_id) spDessertIds.push(s.special_dessert_id);
      if (Array.isArray(s.specialDessertIds)) spDessertIds.push(...s.specialDessertIds);
      if (s.specialDessertId) spDessertIds.push(s.specialDessertId);
      if (s.special_dessert_meal_id) spDessertIds.push(s.special_dessert_meal_id);
      if (Array.isArray(s.special_dessert_ids_list)) spDessertIds.push(...s.special_dessert_ids_list);
      const dedupSpDessertIds = Array.from(new Set((spDessertIds || []).filter(Boolean)));
      dedupSpDessertIds.forEach((id) => {
        const m = mealsById[id];
        if (m) {
          topExpensesMap[m.id] = (topExpensesMap[m.id] || 0) + count * Number(m.cost_per_person || 0);
          dessertSpendTotal += count * Number(m.cost_per_person || 0);
        }
      });
    });

    totalServed += totalServedForRow;
    totalSpend += grandTotal;
    spendingByDate[row.date] = (spendingByDate[row.date] || 0) + grandTotal;
    const cat = row.meal_type || 'Unknown';
    spendByMealType[cat] = (spendByMealType[cat] || 0) + grandTotal;

    // Debug logging
    if (typeof window !== 'undefined' && window?.console) {
      console.log(`Analytics row: ${row.date} ${cat} - served:${totalServedForRow} mainTotal:${mainTotal.toFixed(2)} alts:${alternatesTotal.toFixed(2)} spec:${specialTotal.toFixed(2)} grand:${grandTotal.toFixed(2)}`);
    }

    costRows[key] = {
      careHomeId: row.care_home_id,
      date: row.date,
      mealType: row.meal_type,
      mainUnit,
      served: totalServedForRow,
      mainServed,
      alternatesServed: alternatesCount,
      specialsServed: specialsCount,
      mainUnitBreakdown,
      mainTotalsByPart: {
        main: mainMainTotal,
        sides: mainSidesTotal,
        desserts: mainDessertsTotal,
      },
      mainTotal,
      alternatesTotal,
      specialTotal,
      grandTotal,
      mainMealName: mainMeal?.name || null,
      sideMealName: sideMeal?.name || null,
      sideMealNames: sideMeal ? [sideMeal.name] : [],
      dessertMealName: dessertMeal?.name || null,
      dessertMealNames: dessertMeal ? [dessertMeal.name] : [],
      alternateLines,
      specialLines,
    };
  }

  // Debug: log summary totals & small sample of rows in browser to help diagnose mismatches
  try {
    if (typeof window !== 'undefined' && window && window.console) {
      console.log('=== ANALYTICS BUILD SUMMARY ===');
      console.log(`Total Spend: £${totalSpend.toFixed(2)}, Total Served: ${totalServed}`);
      console.log('Spend by Meal Type:', spendByMealType);
      console.log(`Alternates Total: £${alternatesSpendTotal.toFixed(2)}, Specials Total: £${specialsSpendTotal.toFixed(2)}`);
      console.log(`Sides Total: £${sideSpendTotal.toFixed(2)}, Desserts Total: £${dessertSpendTotal.toFixed(2)}`);
      const sample = Object.values(costRows || {}).slice(0, 6).map(r => ({
        date: r.date,
        mealType: r.mealType,
        mainTotal: r.mainTotal,
        alternatesTotal: r.alternatesTotal,
        specialTotal: r.specialTotal,
        grandTotal: r.grandTotal,
      }));
      console.log('Sample rows:', sample);
    }
  } catch (e) {
    // swallow - debugging only
  }

  return {
    costRows,
    mealsById,
    totalServed,
    totalSpend,
    spendingByDate,
    spendByMealType,
    topExpensesMap,
    sideSpendTotal,
    dessertSpendTotal,
    alternatesSpendTotal,
    specialsSpendTotal,
  };
}

// Debugging helper: small adapter to log dataset sizes when analytics return all zeros
/* eslint-disable no-console */

// Log quick diagnostics when results are empty to help debugging in browser console
// (this will only print when totalSpend and totalServed are zero)
async function _debugIfEmpty({ statusRows, altRows, specialRows, mealIds, mealsById, totalSpend, totalServed }) {
  try {
    if ((Number(totalSpend) || 0) === 0 && (Number(totalServed) || 0) === 0) {
      console.debug('analyticsService.buildCostData debug', {
        statusCount: (statusRows || []).length,
        altCount: (altRows || []).length,
        specialCount: (specialRows || []).length,
        mealIdsCount: mealIds ? mealIds.size : 0,
        mealsByIdCount: mealsById ? Object.keys(mealsById).length : 0,
        totalSpend,
        totalServed,
      });
    }
  } catch (e) {
    console.warn('analytics debug helper failed', e);
  }
}
