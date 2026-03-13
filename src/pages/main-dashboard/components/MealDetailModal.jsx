import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import supabase from '../../../services/supabaseClient';
import IngredientCalculator from './IngredientCalculator';

const MealDetailModal = ({ mealId, sideMealId: sideMealIdProp, sideMeals: sideMealsProp, dessert: dessertProp, isOpen, onClose }) => {
  const [meal, setMeal] = useState(null);
  const [sideMeals, setSideMeals] = useState([]);
  const [lastFetchedSideRows, setLastFetchedSideRows] = useState(null);
  const [dessert, setDessert] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSideLoading, setIsSideLoading] = useState(false);
  const [receivedSideMealsProp, setReceivedSideMealsProp] = useState(false);

  useEffect(() => {
    if (isOpen && mealId) {
      loadMealDetails();
    }
  }, [isOpen, mealId]);

  // Separate effect to load side meal when sideMealIdProp changes
  useEffect(() => {
    // Track whether parent provided a `sideMeals` prop (even if empty)
    if (typeof sideMealsProp !== 'undefined') setReceivedSideMealsProp(true); else setReceivedSideMealsProp(false);
    // If parent passed sideMeals, use them directly (no refetch)
    if (sideMealsProp && Array.isArray(sideMealsProp)) {
      const normalized = sideMealsProp.map(s => (typeof s === 'object' ? s : { id: s, name: s }));
      // If any side lacks nutritional_info but has an id, fetch missing details
      const idsToFetch = normalized.filter(s => s && s.id && (!s.nutritional_info || Object.keys(s.nutritional_info).length === 0)).map(s => s.id);
      if (idsToFetch.length === 0) {
        setSideMeals(normalized);
      } else {
        (async () => {
          try {
            // Try a bulk fetch for specific useful columns first (smaller RLS surface)
            const { data, error } = await supabase
              .from('meals')
              .select('id,nutritional_info,name,image_url,cost_per_person,description,ingredients,allergens')
              .in('id', idsToFetch);

            const idMap = {};
            if (!error && Array.isArray(data)) data.forEach(d => { idMap[d.id] = d; });

            // If bulk fetch returned nothing for some ids, try single fetch per-id as a fallback
            const missingIds = idsToFetch.filter(id => !idMap[id]);
            if (missingIds.length > 0) {
              for (const mid of missingIds) {
                try {
                  const { data: single, error: singleErr } = await supabase
                    .from('meals')
                    .select('id,nutritional_info,name,image_url,cost_per_person,description,ingredients,allergens')
                    .eq('id', mid)
                    .single();
                  if (!singleErr && single) idMap[mid] = single;
                } catch (e) {
                  // ignore per-id failure
                }
              }
            }

            const merged = normalized.map(s => (s && s.id && idMap[s.id]) ? ({ ...idMap[s.id], ...s }) : s);

            // If after fetching there are still sides missing nutritional_info, try a more permissive fetch
            let mergedFinal = merged;
            const stillMissing = merged.filter(m => m && m.id && (!m.nutritional_info || Object.keys(m.nutritional_info || {}).length === 0)).map(m => m.id);
            if (stillMissing.length > 0) {
              console.warn('MealDetailModal - sides missing nutritional_info for ids (attempting full-row fetch):', stillMissing);
              try {
                const { data: fullRows, error: fullErr } = await supabase
                  .from('meals')
                  .select('*')
                  .in('id', stillMissing);
                if (!fullErr && Array.isArray(fullRows) && fullRows.length > 0) {
                  const fullMap = {};
                  fullRows.forEach(r => { fullMap[r.id] = r; });
                  mergedFinal = merged.map(s => (s && s.id && fullMap[s.id]) ? ({ ...fullMap[s.id], ...s }) : s);
                  const stillNowMissing = mergedFinal.filter(m => m && m.id && (!m.nutritional_info || Object.keys(m.nutritional_info || {}).length === 0)).map(m => m.id);
                    if (stillNowMissing.length > 0) {
                      console.warn('MealDetailModal - after full fetch still missing nutritional_info for ids:', stillNowMissing);
                      try {
                        console.warn('MealDetailModal - fetchedRows JSON', JSON.stringify(fullRows, null, 2));
                      } catch (e) {
                        console.warn('MealDetailModal - fetchedRows (object):', fullRows);
                      }
                    }
                    // store fetched rows for use by aggregation when sideMeals objects are missing nutrition
                    if (Array.isArray(fullRows) && fullRows.length > 0) setLastFetchedSideRows(fullRows);
                } else {
                  console.warn('MealDetailModal - full-row fetch returned nothing or error for ids:', stillMissing, fullErr);
                }
              } catch (e) {
                console.warn('MealDetailModal - error during full-row fallback fetch', e);
              }
            }

            setSideMeals(mergedFinal);
          } catch (e) {
            console.warn('MealDetailModal - bulk side fetch failed, using provided side placeholders', e);
            setSideMeals(normalized);
          }
        })();
      }
    } else if (meal && sideMealIdProp) {
      // load single side by id
      loadSideMeal(sideMealIdProp).then(() => {});
    } else if (!sideMealIdProp && meal) {
      // Try to load from meal fields if no prop provided
      const sideCandidates = meal?.sides ?? meal?.side_meal_id ?? meal?.side_id ?? meal?.sideMealId ?? null;
      if (Array.isArray(sideCandidates) && sideCandidates.length > 0) {
        // load each side id/object
        const normalized = sideCandidates.map(s => (typeof s === 'object' ? s : { id: s }));
        (async () => {
          setIsSideLoading(true);
          const loaded = [];
          for (const s of normalized) {
            if (s.id) {
              try {
                const { data: side, error: sideErr } = await supabase.from('meals').select('*').eq('id', s.id).single();
                if (!sideErr && side) loaded.push(side);
              } catch (e) { /* ignore */ }
            } else if (s.name) {
              loaded.push(s);
            }
          }
          setSideMeals(loaded);
          setIsSideLoading(false);
        })();
      } else {
        setSideMeals([]);
      }
    }
    // dessert prop: treat explicit null as "no dessert" (do not fall back to meal.dessert)
    if (dessertProp === null) {
      setDessert(null);
    } else if (typeof dessertProp !== 'undefined') {
      const d = typeof dessertProp === 'object' ? dessertProp : { id: dessertProp };
      if (d && d.id && (!d.nutritional_info || Object.keys(d.nutritional_info || {}).length === 0)) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from('meals')
              .select('id,nutritional_info,name,image_url,cost_per_person,description,ingredients,allergens')
              .eq('id', d.id)
              .single();
            if (!error && data) setDessert({ ...d, ...data });
            else {
              console.warn('MealDetailModal - dessert fetch returned no data for id', d.id);
              setDessert(d);
            }
          } catch (e) { console.warn('MealDetailModal - error fetching dessert', e); setDessert(d); }
        })();
      } else {
        setDessert(d);
      }
    }
  }, [sideMealIdProp, sideMealsProp, meal, dessertProp]);

  const loadMealDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('id', mealId)
        .single();

      if (error) throw error;
      setMeal(data);
    } catch (err) {
      console.error('Error loading meal details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSideMeal = async (sideId) => {
    if (!sideId) {
      setSideMeals([]);
      return;
    }
    try {
      setIsSideLoading(true);
      const { data: side, error: sideErr } = await supabase
        .from('meals')
        .select('*')
        .eq('id', sideId)
        .single();
      if (!sideErr && side) {
        setSideMeals([side]);
      } else {
        setSideMeals([]);
      }
    } catch (e) {
      console.warn('Failed to load side meal:', e);
      setSideMeals([]);
    } finally {
      setIsSideLoading(false);
    }
  };

  const parseIngredients = (ingredientField) => {
    if (!ingredientField) return [];
    let items = [];
    if (Array.isArray(ingredientField)) items = ingredientField.slice();
    else if (typeof ingredientField === 'string') {
      try {
        const parsed = JSON.parse(ingredientField);
        if (Array.isArray(parsed)) items = parsed;
        else items = [parsed];
      } catch (e) {
        items = ingredientField.split(/\n|,/).map(s => s.trim()).filter(Boolean);
      }
    } else if (typeof ingredientField === 'object') {
      items = [ingredientField];
    }

    // Flatten nested arrays and try to parse JSON strings inside
    const flattened = [];
    items.forEach(it => {
      if (Array.isArray(it)) flattened.push(...it);
      else flattened.push(it);
    });

    const normalized = [];
    flattened.forEach(it => {
      if (typeof it === 'string') {
        const trimmed = it.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const p = JSON.parse(trimmed);
            if (Array.isArray(p)) normalized.push(...p);
            else normalized.push(p);
            return;
          } catch (e) {
            // fallthrough
          }
        }
      }
      normalized.push(it);
    });

    // Ensure simple objects are converted to {name, amount, unit} shape when possible
    return normalized.map(it => {
      if (typeof it === 'string') return it;
      if (!it || typeof it !== 'object') return String(it);
      return {
        name: it.name || it.label || JSON.stringify(it),
        amount: it.amount || it.quantity || it.qty || null,
        unit: it.unit || it.u || null,
      };
    });
  };

  // compatibility: single sideMeal convenience
  const sideMeal = (sideMeals && sideMeals.length > 0) ? sideMeals[0] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {isLoading ? (
          <div className="w-full">
            <Skeleton className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-40 h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-1/6 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </Skeleton>
          </div>
        ) : meal ? (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b border-slate-200 dark:border-slate-700">
              {/* Small Thumbnail Image */}
              <div className="flex-shrink-0 w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                {meal.image_url ? (
                  <Image 
                    src={meal.image_url} 
                    alt={meal.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon name="UtensilsCrossed" size={40} className="text-slate-400 dark:text-slate-600" />
                  </div>
                )}
              </div>

              {/* Title & Type */}
              <div className="flex-1 min-w-0">
                <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold mb-2">
                  {meal.type || meal.meal_type || 'Meal'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">{meal.name}</h2>
                {(() => {
                  const mainPrice = meal.cost_per_person ?? meal.cost ?? meal.price_per_serving ?? meal.price ?? 0;
                  const sidesPriceTotal = (sideMeals || []).reduce((s, sm) => s + (sm?.cost_per_person ?? sm?.costPerServing ?? 0), 0);
                  const dessertPriceVal = (dessert && (dessert.cost_per_person ?? dessert.costPerServing)) || (meal?.dessert && (meal.dessert.cost_per_person ?? meal.dessert.costPerServing)) || 0;

                  const hasAnyPrice = Number(mainPrice) > 0 || Number(sidesPriceTotal) > 0 || Number(dessertPriceVal) > 0;
                  if (!hasAnyPrice) return null;

                  return (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                          {Number(mainPrice) > 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold">Meal: £{Number(mainPrice).toFixed(2)}</span>
                          ) : null}
                          {(sideMeals || []).map((sm, i) => (sm && (sm.cost_per_person ?? sm.costPerServing) > 0) ? (
                            <span key={`side-price-${i}`} className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 text-xs font-bold">Side: £{Number(sm.cost_per_person ?? sm.costPerServing).toFixed(2)}</span>
                          ) : null)}
                          {Number(dessertPriceVal) > 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 text-xs font-bold">Dessert: £{Number(dessertPriceVal).toFixed(2)}</span>
                          ) : null}
                      <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold">Total: £{(Number(mainPrice) + Number(sidesPriceTotal) + Number(dessertPriceVal)).toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Icon name="X" size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Quick Stats removed per request */}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="FileText" size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Description</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 pl-6">
                  {meal.description || 'Not Available'}
                </p>
              </div>

                {/* Side / Sides */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Utensils" size={16} className="text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Side</h3>
                </div>
                <div className="ml-6">
                  {isSideLoading ? (
                    <div className="text-xs text-slate-500">Loading side…</div>
                  ) : (sideMeals && sideMeals.length > 0) ? (
                    <div className="space-y-3">
                      {sideMeals.map((sm, idx) => (
                        <div key={`side-block-${idx}`} className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-rose-200 dark:border-rose-800">
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 mb-3">
                            {sm.image_url ? (
                              <Image src={sm.image_url} alt={sm.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon name="UtensilsCrossed" size={32} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Side Dish</div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{sm.name}</h4>
                          {sm.description && (<p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{sm.description}</p>)}
                          {(() => {
                            const sidePrice = sm.cost_per_person ?? sm.cost ?? sm.price_per_serving ?? sm.price ?? null;
                            if (sidePrice && Number(sidePrice) > 0) {
                              return (
                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold">
                                  £{Number(sidePrice).toFixed(2)}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ))}
                    </div>
                  ) : (() => {
                    // derive textual sides from meal fields if present
                    const sideCandidates = meal?.sides ?? meal?.side ?? meal?.side_dishes ?? meal?.sideDish ?? null;
                    if (!sideCandidates) return <p className="text-sm text-slate-600 dark:text-slate-400">Not Available</p>;
                    let list = null;
                    if (Array.isArray(sideCandidates)) {
                      list = sideCandidates;
                    } else if (typeof sideCandidates === 'string') {
                      try {
                        const parsed = JSON.parse(sideCandidates);
                        if (Array.isArray(parsed)) list = parsed;
                      } catch {}
                      if (!list) {
                        const split = sideCandidates.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                        list = split.length ? split : [sideCandidates];
                      }
                    }
                    if (!list || list.length === 0) return <p className="text-sm text-slate-600 dark:text-slate-400">Not Available</p>;
                    const normalized = list.map((it) => {
                      if (typeof it === 'string') return it;
                      if (it && typeof it === 'object') return it.name || JSON.stringify(it);
                      return String(it);
                    });
                    return (
                      <ul className="list-disc pl-5 space-y-1">
                        {normalized.map((label, idx) => (
                          <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">{label}</li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              {/* Dessert */}
              {dessert || meal?.dessert ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="IceCream" size={16} className="text-pink-600 dark:text-pink-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dessert</h3>
                  </div>
                  <div className="ml-6">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-pink-200 dark:border-pink-800">
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 mb-3">
                        <Image src={(dessert && dessert.image_url) || meal?.dessert?.image_url || ''} alt={(dessert && dessert.name) || meal?.dessert?.name || 'Dessert'} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Dessert</div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{(dessert && dessert.name) || meal?.dessert?.name}</h4>
                      {(dessert && dessert.description) || meal?.dessert?.description ? (<p className="text-xs text-slate-700 dark:text-slate-300 mb-2">{(dessert && dessert.description) || meal?.dessert?.description}</p>) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Pricing: Meal + Side Cost */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="PoundSterling" size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pricing</h3>
                </div>
                <div className="ml-6 flex flex-wrap gap-2">
                  {(() => {
                    const mealPrice = meal.cost_per_person ?? meal.cost ?? meal.price_per_serving ?? meal.price ?? 0;
                    const sidesTotal = (sideMeals || []).reduce((sum, s) => sum + (s?.cost_per_person ?? s?.costPerServing ?? 0), 0);
                    const dessertP = (dessert && (dessert.cost_per_person ?? dessert.costPerServing)) || (meal?.dessert && (meal.dessert.cost_per_person ?? meal.dessert.costPerServing)) || 0;

                    const hasAny = Number(mealPrice) > 0 || Number(sidesTotal) > 0 || Number(dessertP) > 0;
                    if (!hasAny) return <p className="text-sm text-slate-600 dark:text-slate-400">Not Available</p>;

                    return (
                      <>
                        {Number(mealPrice) > 0 ? (<span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-sm">Meal: £{Number(mealPrice).toFixed(2)}</span>) : null}
                        {(sideMeals || []).map((s, i) => (s && (s.cost_per_person ?? s.costPerServing) > 0) ? (
                          <span key={`price-side-${i}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold text-sm">Side: £{Number(s.cost_per_person ?? s.costPerServing).toFixed(2)}</span>
                        ) : null)}
                        {Number(dessertP) > 0 ? (<span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300 font-bold text-sm">Dessert: £{Number(dessertP).toFixed(2)}</span>) : null}
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-sm">Total: £{(Number(mealPrice) + Number(sidesTotal) + Number(dessertP)).toFixed(2)}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Ingredients in 2 (or 3) Columns */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="ShoppingBasket" size={16} className="text-green-600 dark:text-green-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ingredients</h3>
                </div>
                <div className={`grid grid-cols-1 ${((dessert || meal?.dessert) ? 'md:grid-cols-3' : 'md:grid-cols-2')} gap-4`}>
                  {/* Meal Ingredients */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 px-3 py-1 bg-green-50 dark:bg-green-950/30 rounded">Meal</h4>
                    {meal.ingredients ? (
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        {(() => {
                          const items = parseIngredients(meal.ingredients);
                          if (!items || items.length === 0) return <p className="text-xs text-slate-600 dark:text-slate-400">Not Available</p>;
                          return (
                            <ul className="list-disc pl-5 space-y-1">
                              {items.map((it, idx) => (
                                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">
                                  {typeof it === 'string' ? it : (
                                    <span>
                                      <span className="font-semibold">{it.name}</span>
                                      {it.amount != null && <span className="ml-2 text-muted-foreground">— {it.amount}{it.unit ? ` ${it.unit}` : ''}</span>}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">Not Available</p>
                    )}
                  </div>

                  {/* Side Ingredients (all sides) */}
                  {(sideMeals && sideMeals.length > 0) ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 px-3 py-1 bg-rose-50 dark:bg-rose-950/30 rounded">Sides</h4>
                      <div className="space-y-3">
                        {sideMeals.map((sm, sidx) => (
                          <div key={`side-ingred-${sidx}`} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                            <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-2">{sm.name}</div>
                            {(() => {
                              const items = parseIngredients(sm.ingredients || sm.ingredient || sm.ingredients_list || []);
                              if (!items || items.length === 0) return <p className="text-xs text-slate-600 dark:text-slate-400">Not Available</p>;
                              return (
                                <ul className="list-disc pl-5 space-y-1">
                                  {items.map((it, idx) => (
                                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">{
                                      typeof it === 'string' ? it : (
                                        <span>
                                          <span className="font-semibold">{it.name}</span>
                                          {it.amount != null && <span className="ml-2 text-muted-foreground">— {it.amount}{it.unit ? ` ${it.unit}` : ''}</span>}
                                        </span>
                                      )
                                    }</li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Dessert Ingredients (if present) */}
                  {(dessert || meal?.dessert) ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 px-3 py-1 bg-pink-50 dark:bg-pink-950/30 rounded">Dessert</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                        {(() => {
                          const d = dessert || meal?.dessert || {};
                          const items = parseIngredients(d.ingredients || d.ingredient || d.ingredients_list || []);
                          if (!items || items.length === 0) return <p className="text-xs text-slate-600 dark:text-slate-400">Not Available</p>;
                          return (
                            <ul className="list-disc pl-5 space-y-1">
                              {items.map((it, idx) => (
                                <li key={idx} className="text-xs text-slate-700 dark:text-slate-300">{
                                  typeof it === 'string' ? it : (
                                    <span>
                                      <span className="font-semibold">{it.name}</span>
                                      {it.amount != null && <span className="ml-2 text-muted-foreground">— {it.amount}{it.unit ? ` ${it.unit}` : ''}</span>}
                                    </span>
                                  )
                                }</li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Combined Allergens */}
              {(() => {
                const mealAllergens = meal.allergens && Array.isArray(meal.allergens) ? meal.allergens : [];
                const sidesAllergens = (sideMeals || []).flatMap(s => (s?.allergens && Array.isArray(s.allergens)) ? s.allergens : []);
                const dessertAllergens = (dessert && Array.isArray(dessert.allergens)) ? dessert.allergens : (meal?.dessert && Array.isArray(meal.dessert.allergens) ? meal.dessert.allergens : []);
                const allAllergens = [...new Set([...mealAllergens, ...sidesAllergens, ...dessertAllergens])];
                if (allAllergens.length === 0) return null;
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="AlertTriangle" size={16} className="text-orange-600 dark:text-orange-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Allergens</h3>
                    </div>
                    <div className="ml-6 flex flex-wrap gap-2">
                      {allAllergens.map((allergen, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-orange-500 text-white font-bold text-xs">{allergen}</span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Combined Nutritional Info */}
              {(() => {
                const parseNutrition = (m) => {
                  if (!m) return {};
                  // Common field names
                  const candidates = [m.nutritional_info, m.nutrition, m.nutritional, m.nutrition_info, m.nutritionInfo, m.nutritionalInfo];
                  // Try candidates first
                  for (const c of candidates) {
                    if (c == null) continue;
                    if (typeof c === 'object') return c;
                    if (typeof c === 'string') {
                      try {
                        const p = JSON.parse(c);
                        if (p && typeof p === 'object') return p;
                      } catch (e) {
                        // fallthrough to regex parse
                        const kv = {};
                        const re = /([a-zA-Z_ ]+):?\s*([0-9]+\.?[0-9]*)/g;
                        let mres;
                        while ((mres = re.exec(c)) !== null) {
                          const k = mres[1].trim().toLowerCase().replace(/\s+/g, '_');
                          kv[k] = parseFloat(mres[2]);
                        }
                        if (Object.keys(kv).length > 0) return kv;
                      }
                    }
                  }

                  // Try top-level numeric fields
                  const altNums = {};
                  const maybeNum = (v) => {
                    if (v == null) return null;
                    if (typeof v === 'number') return v;
                    if (typeof v === 'string') {
                      const p = parseFloat(v.replace(/[^0-9.+-eE]/g, ''));
                      return isNaN(p) ? null : p;
                    }
                    return null;
                  };
                  const cands = ['calories', 'kcal', 'energy_kcal', 'energy', 'cal'];
                  for (const k of cands) {
                    if (m[k] != null) {
                      const n = maybeNum(m[k]);
                      if (n != null) { altNums['calories'] = n; break; }
                    }
                  }
                  if (Object.keys(altNums).length > 0) return altNums;
                  return {};
                };

                const extractNutritionFromMeal = (m) => {
                  if (!m || typeof m !== 'object') return {};
                  // Prefer explicit nutritional_info if present
                  if (m.nutritional_info && typeof m.nutritional_info === 'object' && Object.keys(m.nutritional_info).length > 0) return m.nutritional_info;
                  // If nutritional_info is a JSON string
                  if (typeof m.nutritional_info === 'string' && m.nutritional_info.trim()) {
                    try { const p = JSON.parse(m.nutritional_info); if (p && typeof p === 'object') return p; } catch {}
                  }
                  // Try parseNutrition (covers other fields and string shapes)
                  const parsed = parseNutrition(m);
                  if (parsed && Object.keys(parsed).length > 0) return parsed;
                  // Fallback: top-level numeric-ish fields
                  const candidates = {};
                  const maybeNum = (v) => {
                    if (v == null) return null;
                    if (typeof v === 'number') return v;
                    if (typeof v === 'string') {
                      const p = parseFloat(v.replace(/[^0-9.+-eE]/g, ''));
                      return isNaN(p) ? null : p;
                    }
                    if (typeof v === 'object') {
                      if (v.value != null && !isNaN(Number(v.value))) return Number(v.value);
                    }
                    return null;
                  };
                  const keysForCalories = ['calories','kcal','energy_kcal','energy','cal'];
                  for (const k of keysForCalories) {
                    if (m[k] != null) {
                      const n = maybeNum(m[k]); if (n != null) { candidates.calories = n; break; }
                    }
                  }
                  return candidates;
                };

                const mealNutrition = extractNutritionFromMeal(meal);
                let sidesList = (sideMeals || []).map(s => extractNutritionFromMeal(s));
                // If some side items are present but lack nutrition, try to fill per-id from lastFetchedSideRows
                if (Array.isArray(sideMeals) && sideMeals.length > 0 && lastFetchedSideRows && Array.isArray(lastFetchedSideRows)) {
                  sidesList = sideMeals.map((s) => {
                    const parsed = extractNutritionFromMeal(s);
                    if (parsed && Object.keys(parsed).length > 0) return parsed;
                    // try match by id in lastFetchedSideRows
                    if (s && s.id) {
                      const match = lastFetchedSideRows.find(r => r && r.id === s.id);
                      if (match) return extractNutritionFromMeal(match);
                    }
                    return parsed || {};
                  });
                }
                const sidesHaveData = Array.isArray(sidesList) && sidesList.some(si => si && Object.keys(si).length > 0);
                // Allow fallback to previously fetched side rows when:
                // - parent did not provide sideMeals, OR
                // - parent provided placeholders without ids (so we can't fetch details client-side)
                const providedButNoIds = receivedSideMealsProp && Array.isArray(sideMealsProp) && sideMealsProp.length > 0 && sideMealsProp.every(s => !s || !s.id);
                if (!sidesHaveData && ( !receivedSideMealsProp || providedButNoIds ) && lastFetchedSideRows && Array.isArray(lastFetchedSideRows) && lastFetchedSideRows.length > 0) {
                  sidesList = lastFetchedSideRows.map(r => extractNutritionFromMeal(r));
                }
                const dessertNutrition = extractNutritionFromMeal(dessert || meal?.dessert);

                const toNumber = (v) => {
                  if (v == null) return 0;
                  if (typeof v === 'number') return v;
                  if (typeof v === 'string') {
                    const p = parseFloat(v.replace(/[^0-9.+-eE]/g, ''));
                    return isNaN(p) ? 0 : p;
                  }
                  if (typeof v === 'object') {
                    // common shapes: { value: 100, unit: 'kcal' } or {amount:100}
                    if (v.value != null && !isNaN(Number(v.value))) return Number(v.value);
                    if (v.amount != null && !isNaN(Number(v.amount))) return Number(v.amount);
                    if (v.quantity != null && !isNaN(Number(v.quantity))) return Number(v.quantity);
                    // fallback: try parseFloat on JSON string
                    try { const s = JSON.stringify(v); const p = parseFloat(s.replace(/[^0-9.+-eE]/g, '')); return isNaN(p) ? 0 : p; } catch { return 0; }
                  }
                  return 0;
                };

                const canonicalKey = (k) => {
                  if (!k) return k;
                  const s = String(k).toLowerCase();
                  if (s.includes('calor') || s.includes('ener') || s.includes('kcal') || s.includes('kj') || s === 'cal') return 'calories';
                  if (s.includes('protein')) return 'protein';
                  if (s.includes('carb')) return 'carbs';
                  if (s.includes('fat') && !s.includes('fatty')) return 'fat';
                  if (s.includes('fiber') || s.includes('fibre')) return 'fiber';
                  if (s.includes('sodium') || s.includes('salt') || s === 'na') return 'sodium';
                  if (s.includes('sug') || s.includes('sugar')) return 'sugar';
                  // fallback: strip non-alpha and use that
                  return s.replace(/[^a-z]/g, '');
                };

                const combined = {};
                const addObj = (obj) => {
                  if (!obj || typeof obj !== 'object') return;
                  for (const rawKey of Object.keys(obj)) {
                    const key = canonicalKey(rawKey);
                    const val = toNumber(obj[rawKey]);
                    combined[key] = (combined[key] || 0) + (val || 0);
                  }
                };

                // Add meal
                addObj(mealNutrition);
                // Add all sides
                for (const ni of sidesList) addObj(ni || {});
                // Add dessert
                addObj(dessertNutrition);

                if (Object.keys(combined).length === 0) return null;

                  // Debug: log inputs and combined totals when modal opens (helps diagnose missing side nutrition)
                  try {
                    console.info('MealDetailModal - nutrition inputs', { mealNutrition, sidesList, dessertNutrition, combined });
                  } catch (e) {}

                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon name="Activity" size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Total Nutritional Info</h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">(Meal + Sides + Dessert)</span>
                    </div>
                    <div className="ml-6 grid grid-cols-3 gap-2">
                      {Object.entries(combined).map(([key, value]) => (
                        <div key={key} className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg text-center">
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">{key}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


              {/* Additional Info */}
              {(meal.serving_size || (meal.dietary_tags && meal.dietary_tags.length > 0)) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Info" size={16} className="text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Additional Info</h3>
                  </div>
                  <div className="pl-6 space-y-2">
                    {meal.serving_size && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Icon name="Users" size={14} />
                        <span className="font-semibold">Serving:</span>
                        <span>{meal.serving_size}</span>
                      </div>
                    )}
                    {meal.dietary_tags && meal.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {meal.dietary_tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ingredient Calculator */}
              <IngredientCalculator meal={meal} sides={sideMeals} dessert={dessert || meal?.dessert} />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white py-2"
              >
                Close
              </Button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <Icon name="AlertCircle" size={40} className="mx-auto mb-3 text-red-500" />
            <p className="text-slate-600 dark:text-slate-400">Failed to load meal details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealDetailModal;
