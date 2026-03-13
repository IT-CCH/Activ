import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/navigation/Header';
import Icon from '../../components/AppIcon';
import Skeleton from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getCareHomes, getCostBreakdown } from '../../services/analyticsService';

const todayISO = () => new Date().toISOString().slice(0, 10);
const sevenDaysAgoISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
};

const formatGBP = (n) => `£${Number(n || 0).toFixed(2)}`;
const formatGBPPlain = (n) => Number(n || 0).toFixed(2);

// This is a rebuilt, simpler Cost Breakdown page focused on accuracy:
// - Uses `getCostBreakdown` from analyticsService
// - Renders per-day cards and per-meal detailed rows
// - Shows all side and dessert names and uses alternate/special line totals
const CostBreakdownPage = () => {
  const { isAdmin, careHomeId: userCareHomeId } = useAuth();
  const [startDate, setStartDate] = useState(sevenDaysAgoISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [careHomes, setCareHomes] = useState([]);
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rowsByDay, setRowsByDay] = useState([]);
  const [rowsByMeal, setRowsByMeal] = useState([]);
  const [mealsById, setMealsById] = useState({});

  const summary = useMemo(() => {
    const main = rowsByDay.reduce((s, r) => s + Number(r.mainTotal || 0), 0);
    const alts = rowsByDay.reduce((s, r) => s + Number(r.alternatesTotal || 0), 0);
    const specs = rowsByDay.reduce((s, r) => s + Number(r.specialTotal || 0), 0);
    const total = rowsByDay.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
    const served = rowsByMeal.reduce((s, r) => s + Number(r.served || 0), 0);
    return { main, alts, specs, total, served, days: new Set(rowsByDay.map(r => r.date)).size };
  }, [rowsByDay, rowsByMeal]);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    (async () => {
      const homes = await getCareHomes();
      if (!ignore) setCareHomes(homes || []);
    })();
    return () => { ignore = true; };
  }, [isAdmin]);

  const effectiveCareHomeId = isAdmin ? selectedCareHomeId : userCareHomeId;

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await getCostBreakdown({ startDate, endDate, careHomeId: effectiveCareHomeId || null });
        if (!ignore) {
          if (res.ok) {
            setRowsByDay(res.data.byDay || []);
            setRowsByMeal(res.data.byMeal || []);
            setMealsById(res.data.mealsById || {});
          } else {
            setError(res.error || 'Failed to load cost breakdown');
          }
        }
      } catch (e) {
        if (!ignore) setError(e?.message || 'Failed to load cost breakdown');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [startDate, endDate, effectiveCareHomeId]);

  const groupedByDate = useMemo(() => {
    const map = {};
    rowsByDay.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [rowsByDay]);

  const mealsByDate = useMemo(() => {
    const map = {};
    rowsByMeal.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [rowsByMeal]);

  const applyQuickRange = (range) => {
    const today = new Date();
    const toISO = (d) => d.toISOString().slice(0, 10);
    if (range === 'today') {
      const iso = toISO(today);
      setStartDate(iso);
      setEndDate(iso);
      return;
    }
    if (range === 'week') {
      const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 6);
      setStartDate(toISO(start));
      setEndDate(toISO(end));
      return;
    }
    if (range === 'month') {
      const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
      setStartDate(toISO(start));
      setEndDate(toISO(end));
    }
  };

  return (
    <>
      <Helmet>
        <title>Cost Breakdown - CareHome Food Analytics</title>
      </Helmet>
      <Header />
      <main className="main-content bg-background min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-6 shadow-sm flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-border text-xs font-semibold text-primary">Cost Breakdown</div>
              <h1 className="text-3xl font-bold text-foreground leading-tight">Per-day meal cost intelligence</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">Track main, sides, desserts, alternates, and specials with per-serving detail across your selected window.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[{key:'today',label:'Today'},{key:'week',label:'This Week'},{key:'month',label:'This Month'}].map(o=> (
                <button key={o.key} onClick={() => applyQuickRange(o.key)} className="px-3 py-2 rounded-lg border border-border bg-card text-sm font-semibold hover:border-primary transition-colors duration-150">
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
            <div className="flex flex-wrap gap-3 items-center rounded-xl border border-border bg-card p-4 shadow-sm">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Icon name="Building2" size={18} className="text-muted-foreground" />
                  <select value={selectedCareHomeId || ''} onChange={(e) => setSelectedCareHomeId(e.target.value || null)} className="px-4 py-2 bg-background border border-border rounded-lg text-sm">
                    <option value="">All Care Homes</option>
                    {careHomes.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Icon name="CalendarRange" size={18} className="text-muted-foreground" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-sm" />
                <span className="text-muted-foreground">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-border rounded-lg bg-background text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Cost', value: formatGBP(summary.total), icon: 'PoundSterling' },
                { label: 'Main Meals', value: formatGBP(summary.main), icon: 'Utensils' },
                { label: 'Alternates', value: formatGBP(summary.alts), icon: 'Shuffle' },
                { label: 'Specials', value: formatGBP(summary.specs), icon: 'Star' },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{k.label}</span>
                    <Icon name={k.icon} size={16} className="text-muted-foreground" />
                  </div>
                  <div className="text-lg font-semibold text-foreground">{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>}

          {loading ? (
            <div className="py-6">
              <Skeleton className="space-y-4">
                <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
              </Skeleton>
            </div>
          ) : (
            <div className="grid gap-4">
              {Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a)).map(dateKey => (
                <div key={dateKey} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="text-sm text-muted-foreground">{new Date(dateKey).toLocaleDateString('en-GB', { weekday: 'long' })}</div>
                      <div className="text-lg font-semibold text-foreground">{new Date(dateKey).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon name="ClipboardList" size={16} className="text-muted-foreground" />
                      {groupedByDate[dateKey].length} entries
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border/80">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Care Home</th>
                          <th className="px-3 py-2 text-right">Main (£)</th>
                          <th className="px-3 py-2 text-right">Alternates (£)</th>
                          <th className="px-3 py-2 text-right">Special (£)</th>
                          <th className="px-3 py-2 text-right">Total (£)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedByDate[dateKey].map((r, idx) => (
                          <tr key={`${dateKey}-${idx}`} className="border-t border-border/60">
                            <td className="px-3 py-2 font-medium">{resolveCareHomeName(r.careHomeId, careHomes)}</td>
                            <td className="px-3 py-2 text-right">{formatGBP(r.mainTotal)}</td>
                            <td className="px-3 py-2 text-right">{formatGBP(r.alternatesTotal)}</td>
                            <td className="px-3 py-2 text-right">{formatGBP(r.specialTotal)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatGBP(r.grandTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {mealsByDate[dateKey]?.length ? (
                    <div className="mt-5 space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">Per-meal detail</div>
                      <div className="overflow-x-auto rounded-lg border border-border/80">
                        <table className="min-w-full text-sm align-middle">
                          <thead className="bg-muted/60 text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left">Meal</th>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-left">Item</th>
                              <th className="px-3 py-2 text-right">Unit (£)</th>
                              <th className="px-3 py-2 text-right">Served</th>
                              <th className="px-3 py-2 text-right">Total (£)</th>
                              <th className="px-3 py-2 text-left">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mealsByDate[dateKey].map((m, i) => {
                              const mainRow = (
                                <tr key={`main-${dateKey}-${i}`} className="border-t border-border/60">
                                  <td rowSpan={(m.alternateLines?.length || 0) + (m.specialLines?.length || 0) + 1} className="px-3 py-2 align-top">
                                    <div className="font-medium text-foreground">{m.mealType}</div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {m.mainMealName || 'Main'}
                                      {(m.sideMealNames && m.sideMealNames.length) ? ` + ${m.sideMealNames.join(', ')}` : ''}
                                      {(m.dessertMealNames && m.dessertMealNames.length) ? ` + ${m.dessertMealNames.join(', ')}` : ''}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">Main</td>
                                  <td className="px-3 py-2">{m.mainMealName || 'Main meal'}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(m.mainUnit)}</td>
                                  <td className="px-3 py-2 text-right">{m.mainServed ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(m.mainTotal)}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {`Main £${formatGBPPlain(m.mainUnitBreakdown?.main || 0)}, Sides £${formatGBPPlain(m.mainUnitBreakdown?.sides || 0)}, Desserts £${formatGBPPlain(m.mainUnitBreakdown?.desserts || 0)}`}
                                  </td>
                                </tr>
                              );

                              const altRows = (m.alternateLines || []).map((l, idx2) => (
                                <tr key={`alt-${dateKey}-${i}-${idx2}`} className="border-t border-border/60 bg-muted/20">
                                  <td className="px-3 py-2">Alternate</td>
                                  <td className="px-3 py-2">{l.label}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(l.unit)}</td>
                                  <td className="px-3 py-2 text-right">{l.count}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(l.total)}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {l.sideLabel && <span className="block">Sides: {l.sideLabel}</span>}
                                    {l.dessertLabel && <span className="block">Desserts: {l.dessertLabel}</span>}
                                    {l.unitBreakdown && (
                                      <span className="block">{`Main £${formatGBPPlain(l.unitBreakdown.main)}, Sides £${formatGBPPlain(l.unitBreakdown.sides)}, Desserts £${formatGBPPlain(l.unitBreakdown.desserts)}`}</span>
                                    )}
                                  </td>
                                </tr>
                              ));

                              const specialRows = (m.specialLines || []).map((l, idx2) => (
                                <tr key={`spec-${dateKey}-${i}-${idx2}`} className="border-t border-border/60 bg-muted/10">
                                  <td className="px-3 py-2">Special</td>
                                  <td className="px-3 py-2">{l.label}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(l.unit)}</td>
                                  <td className="px-3 py-2 text-right">{l.count}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(l.total)}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {l.sideLabel && <span className="block">Sides: {l.sideLabel}</span>}
                                    {l.dessertLabel && <span className="block">Desserts: {l.dessertLabel}</span>}
                                    {l.unitBreakdown && (
                                      <span className="block">{`Main £${formatGBPPlain(l.unitBreakdown.main)}, Sides £${formatGBPPlain(l.unitBreakdown.sides)}, Desserts £${formatGBPPlain(l.unitBreakdown.desserts)}`}</span>
                                    )}
                                  </td>
                                </tr>
                              ));

                              const totalRow = (
                                <tr key={`total-${dateKey}-${i}`} className="border-t border-border/60 font-semibold bg-card/60">
                                  <td colSpan={2} className="px-3 py-2 text-left text-muted-foreground">Totals</td>
                                  <td className="px-3 py-2 text-right">—</td>
                                  <td className="px-3 py-2 text-right">{m.served ?? 0}</td>
                                  <td className="px-3 py-2 text-right">{formatGBP(m.grandTotal)}</td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    Main £{formatGBPPlain(m.mainTotal)} · Alt £{formatGBPPlain(m.alternatesTotal)} · Spec £{formatGBPPlain(m.specialTotal)}
                                  </td>
                                </tr>
                              );

                              return [mainRow, ...altRows, ...specialRows, totalRow];
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
};

function resolveCareHomeName(id, list) {
  if (!id) return 'Care Home';
  const found = (list || []).find(ch => ch.id === id);
  return found?.name || 'Care Home';
}

export default CostBreakdownPage;
