// Helpers extracted from ConfirmDeliveryModal to enable unit testing and to avoid mixing side/dessert ids
export const normalizeIdList = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (_) {}
    if (v.includes(',')) return v.split(',').map(s => s.trim()).filter(Boolean);
    return [v];
  }
  return [];
};

export const resolveIdsFromStatus = (initialStatus, { arrayIds, singleId, nameField, slotKind = null, findMealByName, allowEnrichedFallback = true }) => {
  const arr = normalizeIdList(arrayIds);
  if (arr && arr.length > 0) return arr;
  const single = normalizeIdList(singleId);
  if (single && single.length > 0) return single;
  if (nameField && findMealByName) {
    const found = findMealByName(nameField);
    if (found && found.id) return [found.id];
  }
  if (!allowEnrichedFallback) return [];

  const enriched = initialStatus?.mealsById || {};
  const idsFromEnriched = Object.entries(enriched)
    .filter(([id, m]) => m && (
      (slotKind && m.slot_kind === slotKind) ||
      (!slotKind && m.type && m.type.toLowerCase().includes(nameField?.toLowerCase?.() ? nameField.toLowerCase() : slotKind || '')) ||
      (slotKind === 'side' && (m.type === 'side' || (m.type && m.type.toLowerCase().includes('side'))))
    ))
    .map(([id]) => id);
  if (idsFromEnriched.length > 0) return idsFromEnriched;
  return [];
};

export const computeCostBreakdown = (initialStatus, { getMealById, findMealByName }) => {
  const mealsMap = initialStatus?.mealsById || {};
  const mainCount = Number(initialStatus?.servedCount || 0);
  const sideCounts = initialStatus?.sideMealCounts || {};
  const dessertCounts = initialStatus?.dessertCounts || {};

  const sideIds = resolveIdsFromStatus(initialStatus, {
    arrayIds: initialStatus?.newSideMealIds,
    singleId: initialStatus?.newSideMealId || initialStatus?.new_side_meal_id,
    nameField: initialStatus?.newSideMeal || initialStatus?.new_side_meal || initialStatus?.originalSide || null,
    slotKind: 'side',
    findMealByName,
    // IMPORTANT: do not fallback to scanning enriched mealsById for main sides (avoids picking up alternates/specials)
    allowEnrichedFallback: false,
  });

  const dessertIds = resolveIdsFromStatus(initialStatus, {
    arrayIds: initialStatus?.newDessertIds,
    singleId: initialStatus?.newDessertMealId || initialStatus?.new_dessert_meal_id,
    nameField: initialStatus?.newDessert || initialStatus?.dessertName || initialStatus?.dessert_name || null,
    slotKind: 'dessert',
    findMealByName,
    allowEnrichedFallback: false,
  });

  const mainMeal = (getMealById && getMealById(initialStatus?.newMainMealId)) || (findMealByName && findMealByName(initialStatus?.newMainMeal || initialStatus?.mainName));
  const mainBase = mainMeal ? Number(mainMeal.cost_per_person || 0) : 0;
  
  // Calculate side costs with individual counts
  let mainSidesTotal = 0;
  const sideCostBreakdown = {};
  (sideIds || []).forEach(id => {
    const sideCost = Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0);
    const sideCount = Number(sideCounts[id] || 0);
    sideCostBreakdown[id] = { cost: sideCost, count: sideCount, subtotal: sideCost * sideCount };
    mainSidesTotal += sideCost * sideCount;
  });
  
  // Calculate dessert costs with individual counts
  let mainDessertsTotal = 0;
  const dessertCostBreakdown = {};
  (dessertIds || []).forEach(id => {
    const dessertCost = Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0);
    const dessertCount = Number(dessertCounts[id] || 0);
    dessertCostBreakdown[id] = { cost: dessertCost, count: dessertCount, subtotal: dessertCost * dessertCount };
    mainDessertsTotal += dessertCost * dessertCount;
  });
  
  const mainSubtotal = (mainBase * mainCount) + mainSidesTotal + mainDessertsTotal;

  const alternateLines = (initialStatus?.alternates || []).map(a => {
    const altMeal = (getMealById && getMealById(a.alternateMealId)) || (findMealByName && findMealByName(a.alternateMealName));
    const altBase = altMeal ? Number(altMeal.cost_per_person || 0) : 0;
    const altSidesTotal = (a.alternateSideMealIds || []).reduce((s, id) => s + Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0), 0);
    const altDessertsTotal = (a.alternateDessertIds || []).reduce((s, id) => s + Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0), 0);
    const altUnit = altBase + altSidesTotal + altDessertsTotal;
    const qty = Number(a.residentCount || 0);
    return { name: altMeal?.name || a.alternateMealName || 'Alternate', base: altBase, sidesTotal: altSidesTotal, dessertsTotal: altDessertsTotal, unit: altUnit, qty, subtotal: altUnit * qty };
  });

  const specialLines = (initialStatus?.specialMeals || []).map(s => {
    const spMeal = (getMealById && getMealById(s.specialMealId)) || (findMealByName && findMealByName(s.specialMealName));
    const spBase = spMeal ? Number(spMeal.cost_per_person || 0) : 0;
    const spSidesTotal = (s.specialSideMealIds || []).reduce((sum, id) => sum + Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0), 0);
    const spDessertsTotal = (s.specialDessertIds || []).reduce((sum, id) => sum + Number((mealsMap[id]?.cost_per_person) || (getMealById ? getMealById(id)?.cost_per_person : 0) || 0), 0);
    const spUnit = spBase + spSidesTotal + spDessertsTotal;
    const qty = Number(s.residentCount || 0);
    return { name: spMeal?.name || s.specialMealName || 'Special', base: spBase, sidesTotal: spSidesTotal, dessertsTotal: spDessertsTotal, unit: spUnit, qty, subtotal: spUnit * qty };
  });

  const alternatesTotal = alternateLines.reduce((s, l) => s + l.subtotal, 0);
  const specialsTotal = specialLines.reduce((s, l) => s + l.subtotal, 0);
  const grandTotal = mainSubtotal + alternatesTotal + specialsTotal;

  return { main: { meal: mainMeal, base: mainBase, sidesTotal: mainSidesTotal, dessertsTotal: mainDessertsTotal, unit: mainBase + mainSidesTotal + mainDessertsTotal, qty: mainCount, subtotal: mainSubtotal, sides: sideIds, desserts: dessertIds, sideCostBreakdown, dessertCostBreakdown }, alternateLines, specialLines, totals: { mainSubtotal, alternatesTotal, specialsTotal, grandTotal } };
};