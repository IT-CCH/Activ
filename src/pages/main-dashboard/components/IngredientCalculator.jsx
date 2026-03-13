import React, { useState, useMemo, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import supabase from '../../../services/supabaseClient';

const IngredientCalculator = ({ meal, sides = [], dessert = null }) => {
  const [servings, setServings] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  // Unit conversion rules (to base units in grams/ml)
  const conversionRules = {
    // Weight
    'g': 1,
    'kg': 1000,
    'mg': 0.001,
    'oz': 28.35,
    'lb': 453.592,
    'lbs': 453.592,
    // Volume
    'ml': 1,
    'l': 1000,
    'cl': 10,
    'tsp': 5,
    'tbsp': 15,
    'fl oz': 29.5735,
    'cup': 236.588,
    'pint': 473.176,
    'quart': 946.353,
  };

  // Convert to best readable unit (auto-converts to larger units)
  const convertToOptimalUnit = (amount, unit) => {
    if (!amount || isNaN(amount)) return { amount: 0, unit };
    
    const baseAmount = amount * (conversionRules[unit?.toLowerCase()] || 1);
    
    // Weight conversions
    if (['g', 'kg', 'mg', 'oz', 'lb', 'lbs'].includes(unit?.toLowerCase())) {
      if (baseAmount >= 1000) {
        return { amount: (baseAmount / 1000).toFixed(2), unit: 'kg' };
      }
      return { amount: baseAmount.toFixed(2), unit: 'g' };
    }
    
    // Volume conversions
    if (['ml', 'l', 'cl', 'tsp', 'tbsp', 'fl oz', 'cup', 'pint', 'quart'].includes(unit?.toLowerCase())) {
      if (baseAmount >= 1000) {
        return { amount: (baseAmount / 1000).toFixed(2), unit: 'L' };
      }
      if (baseAmount >= 236.588) {
        return { amount: (baseAmount / 236.588).toFixed(2), unit: 'cup' };
      }
      return { amount: baseAmount.toFixed(2), unit: 'ml' };
    }
    
    return { amount: baseAmount.toFixed(2), unit };
  };

  // Parse ingredients from meal, sides and dessert
  const parseIngredients = (ingredientData) => {
    if (!ingredientData) return [];
    
    let items = [];
    if (Array.isArray(ingredientData)) {
      items = ingredientData;
    } else if (typeof ingredientData === 'string') {
      try {
        const parsed = JSON.parse(ingredientData);
        items = Array.isArray(parsed) ? parsed : [ingredientData];
      } catch {
        items = ingredientData.split(/\n|,/).map(s => s.trim()).filter(Boolean);
      }
    }
    // Normalize nested arrays (some sources may include a single array wrapped inside)
    const flattened = [];
    items.forEach(it => {
      if (Array.isArray(it)) flattened.push(...it);
      else flattened.push(it);
    });
    items = flattened;
    // Normalize stringified JSON elements inside arrays (e.g. ['[{...}]'])
    const normalized = [];
    items.forEach(it => {
      if (typeof it === 'string') {
        const trimmed = it.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            const p = JSON.parse(trimmed);
            if (Array.isArray(p)) {
              p.forEach(pi => normalized.push(pi));
            } else if (p && typeof p === 'object') {
              normalized.push(p);
            } else {
              normalized.push(trimmed);
            }
            return;
          } catch (e) {
            // fallthrough to push original string
          }
        }
      }
      normalized.push(it);
    });
    items = normalized;
    
    return items.map(item => {
      if (typeof item === 'string') {
        return { name: item, amount: 1, unit: 'unit' };
      }
      if (typeof item === 'object' && item) {
        return {
          name: item.name || JSON.stringify(item),
          amount: item.amount || item.quantity || 1,
          unit: item.unit || 'unit'
        };
      }
      return { name: String(item), amount: 1, unit: 'unit' };
    });
  };

  const [resolvedSides, setResolvedSides] = useState(sides || []);
  const [resolvedDesserts, setResolvedDesserts] = useState(Array.isArray(dessert) ? dessert : (dessert ? [dessert] : []));

  useEffect(() => {
    // Resolve any side or dessert items that only contain an id but no ingredients
    const idsToFetch = [];
    (sides || []).forEach(s => {
      if (s && !s.ingredients && s.id) idsToFetch.push(s.id);
    });
    // dessert may be an array or single object
    const dessertList = Array.isArray(dessert) ? dessert : (dessert ? [dessert] : []);
    dessertList.forEach(d => {
      if (d && !d.ingredients && d.id) idsToFetch.push(d.id);
    });
    const uniqueIds = [...new Set(idsToFetch)];
    if (uniqueIds.length === 0) {
      setResolvedSides(sides || []);
      setResolvedDesserts(Array.isArray(dessert) ? dessert : (dessert ? [dessert] : []));
      return;
    }
    // fetch meal objects for ids and patch resolved lists
    (async () => {
      try {
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .in('id', uniqueIds);
        if (!error && data) {
          const idMap = {};
          data.forEach(d => { idMap[d.id] = d; });
          const newResolvedSides = (sides || []).map(s => (s && s.id && !s.ingredients) ? (idMap[s.id] || s) : s);
          const newResolvedDesserts = dessertList.map(d => (d && d.id && !d.ingredients) ? (idMap[d.id] || d) : d);
          setResolvedSides(newResolvedSides);
          setResolvedDesserts(newResolvedDesserts);
        }
      } catch (e) {
        // ignore fetch errors; leave original items
        setResolvedSides(sides || []);
        setResolvedDesserts(Array.isArray(dessert) ? dessert : (dessert ? [dessert] : []));
      }
    })();
  }, [sides, dessert, meal]);

  // Build ingredient lists (apply servings multipliers and unit conversion)
  const mealIngredients = useMemo(() => {
    const items = parseIngredients(meal?.ingredients);
    return items.map((it, idx) => {
      const amountTotal = Number(it.amount || 1) * Number(servings || 1);
      const calculatedAmount = convertToOptimalUnit(amountTotal, it.unit || 'unit');
      return { ...it, id: it.id || `meal-${idx}`, calculatedAmount, source: meal?.name || 'Main' };
    });
  }, [meal, servings]);

  const sideIngredients = useMemo(() => {
    const all = [];
    (resolvedSides || []).forEach((s, si) => {
      const items = parseIngredients(s?.ingredients || s?.ingredient || s?.ingredients_list || []);
      items.forEach((it, idx) => {
        const amountTotal = Number(it.amount || 1) * Number(servings || 1);
        const calculatedAmount = convertToOptimalUnit(amountTotal, it.unit || 'unit');
        all.push({ ...it, id: it.id || `side-${si}-${idx}`, calculatedAmount, source: s?.name || 'Side' });
      });
    });
    return all;
  }, [resolvedSides, servings]);

  const dessertIngredients = useMemo(() => {
    const all = [];
    (resolvedDesserts || []).forEach((d, di) => {
      const items = parseIngredients(d?.ingredients || d?.ingredient || d?.ingredients_list || []);
      items.forEach((it, idx) => {
        const amountTotal = Number(it.amount || 1) * Number(servings || 1);
        const calculatedAmount = convertToOptimalUnit(amountTotal, it.unit || 'unit');
        all.push({ ...it, id: it.id || `dessert-${di}-${idx}`, calculatedAmount, source: d?.name || 'Dessert' });
      });
    });
    return all;
  }, [resolvedDesserts, servings]);

  const allIngredients = [...mealIngredients, ...sideIngredients, ...dessertIngredients];

  // Export to styled PDF via print-to-PDF: open a new window with formatted HTML and trigger print
  const exportPDF = () => {
    const sideNames = (resolvedSides || []).map(s => s?.name).filter(Boolean).join(' + ');
    const dessNames = (resolvedDesserts && resolvedDesserts.length > 0) ? resolvedDesserts.map(d => d?.name).filter(Boolean).join(' + ') : (dessert?.name || '');
    const title = `Shopping List - ${meal?.name}${sideNames ? ` + ${sideNames}` : ''}${dessNames ? ` + ${dessNames}` : ''}`;

    // color palette for sections
    const palette = {
      Main: { bg: '#eef2ff', accent: '#4f46e5' },
      Side: { bg: '#fff1f2', accent: '#e11d48' },
      Dessert: { bg: '#fffbeb', accent: '#d97706' },
      Other: { bg: '#f8fafc', accent: '#64748b' }
    };

    // Group ingredients by source (Main, Side, Dessert or custom source)
    const groups = {};
    allIngredients.forEach(ing => {
      const key = ing.source || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(ing);
    });

    const styles = `
      @media print { @page { size: A4; margin: 16mm } }
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color: #0f172a; margin: 0; padding: 20px; background: #fff }
      .container { max-width: 980px; margin: 0 auto; }
      .header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:18px }
      .brand { display:flex; flex-direction:column }
      .title { font-size:20px; font-weight:800; color:#0f172a }
      .meta { font-size:12px; color:#475569; margin-top:6px }
      .summary { font-size:13px; color:#334155; margin-top:6px }
      .section { margin-top:18px; padding:12px; border-radius:8px }
      .section + .section { margin-top:12px }
      .section-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px }
      .section-title { font-weight:700; font-size:13px; display:flex; align-items:center; gap:10px }
      .count-pill { font-size:12px; color:#0f172a; opacity:0.8 }
      .items { column-count: 2; column-gap: 28px }
      .item-row { display:flex; justify-content:space-between; padding:6px 0; break-inside:avoid; border-bottom:1px dashed #e6eef7 }
      .item-name { color:#0f172a }
      .item-qty { color:#0b1220; font-weight:600 }
      .footer { margin-top:20px; font-size:12px; color:#64748b }
    `;

    // Build grouped HTML sections with color accents
    const groupHtml = Object.keys(groups).map((grp) => {
      const items = groups[grp];
      const pal = palette[grp] || palette.Other;
      const rows = items.map((ing, i) => `
        <div class="item-row">
          <div class="item-name">${ing.name}</div>
          <div class="item-qty">${ing.calculatedAmount.amount} ${ing.calculatedAmount.unit}</div>
        </div>
      `).join('');

      return `
        <div class="section" style="background:${pal.bg}; border:1px solid ${pal.bg};">
          <div class="section-head">
            <div class="section-title"><span style="width:10px;height:10px;border-radius:3px;background:${pal.accent};display:inline-block"></span>${grp}</div>
            <div class="count-pill">${items.length} item${items.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="items">
            ${rows}
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">
                <div class="title">${title}</div>
                <div class="meta">Servings: ${servings} • Generated: ${new Date().toLocaleString()}</div>
                <div class="summary">Main: ${meal?.name || '—'}${sideNames ? ' • Sides: ' + sideNames : ''}${dessNames ? ' • Desserts: ' + dessNames : ''}</div>
              </div>
              <div style="text-align:right"><div style="font-size:12px;color:#94a3b8">Food Calendar</div></div>
            </div>
            ${groupHtml}
            <div class="footer">Generated by Food Calendar • ${new Date().getFullYear()}</div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Export to CSV (Excel-compatible)
  const exportCSV = () => {
    let csv = 'Ingredient,Quantity,Unit,Source\n';
    allIngredients.forEach((ing) => {
      csv += `"${ing.name}",${ing.calculatedAmount.amount},"${ing.calculatedAmount.unit}","${ing.source}"\n`;
    });

    const file = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = `ingredients-${(meal?.name || 'list').replace(/\s+/g, '-')}.csv`;
    link.click();
  };

  if (allIngredients.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/20 dark:to-slate-800/50 rounded-xl border border-indigo-200 dark:border-indigo-800 p-5 mt-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 p-2 -m-2 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon name="ShoppingCart" size={20} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Shopping List Calculator</h3>
          <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
            {allIngredients.length} items
          </span>
        </div>
        <Icon
          name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
          size={20}
          className="text-slate-600 dark:text-slate-400 transition-transform"
        />
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t border-indigo-200 dark:border-indigo-800 pt-4">
          {/* Servings Input */}
          <div className="flex items-center gap-3 pb-4 border-b border-indigo-200 dark:border-indigo-800">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
              Servings Needed:
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={servings}
              onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-3 py-2 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-center"
            />
          </div>

          {/* 2-Column Layout */}
          <div className={`grid grid-cols-1 ${dessertIngredients.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            {/* Main Meal Column */}
            {mealIngredients.length > 0 && (
              <div className="bg-white dark:bg-slate-700 rounded-lg p-3 border-l-4 border-indigo-600">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Icon name="UtensilsCrossed" size={16} className="text-indigo-600" />
                  {meal?.name}
                </h4>
                <ul className="space-y-2">
                  {mealIngredients.map((ing) => (
                    <li key={ing.id} className="text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">{ing.name}</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        <span className="inline-block bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                          {ing.calculatedAmount.amount} {ing.calculatedAmount.unit}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Side Meal Column */}
            {sideIngredients.length > 0 && (
              <div className="bg-white dark:bg-slate-700 rounded-lg p-3 border-l-4 border-rose-600">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Icon name="Leaf" size={16} className="text-rose-600" />
                    {(resolvedSides && resolvedSides.length > 0) ? resolvedSides.map(s => s?.name).filter(Boolean).join(' + ') : ((sides && sides.length > 0) ? sides.map(s => s?.name).filter(Boolean).join(' + ') : 'Side')}
                </h4>
                <ul className="space-y-2">
                  {sideIngredients.map((ing) => (
                    <li key={ing.id} className="text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">{ing.name}</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        <span className="inline-block bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded font-bold">
                          {ing.calculatedAmount.amount} {ing.calculatedAmount.unit}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Dessert Column */}
            {dessertIngredients.length > 0 && (
              <div className="bg-white dark:bg-slate-700 rounded-lg p-3 border-l-4 border-amber-500">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Icon name="IceCream" size={16} className="text-amber-500" />
                    {(resolvedDesserts && resolvedDesserts.length > 0) ? resolvedDesserts.map(d => d?.name).filter(Boolean).join(' + ') : (dessert?.name || 'Dessert')}
                  </h4>
                <ul className="space-y-2">
                  {dessertIngredients.map((ing) => (
                    <li key={ing.id} className="text-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">{ing.name}</div>
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        <span className="inline-block bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                          {ing.calculatedAmount.amount} {ing.calculatedAmount.unit}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 pt-3 border-t border-indigo-200 dark:border-indigo-800">
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              iconPosition="left"
              onClick={exportPDF}
              className="flex-1 text-xs"
            >
              Download List
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="FileSpreadsheet"
              iconPosition="left"
              onClick={exportCSV}
              className="flex-1 text-xs"
            >
              Export Excel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientCalculator;
