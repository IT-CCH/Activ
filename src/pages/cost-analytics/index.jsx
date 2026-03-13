import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/navigation/Header';
import KPICard from './components/KPICard';
import DateRangePicker from './components/DateRangePicker';
import SpendingChart from './components/SpendingChart';
import CostBreakdownPie from './components/CostBreakdownPie';
import TopExpensesList from './components/TopExpensesList';
import BudgetAlerts from './components/BudgetAlerts';
import OptimizationRecommendations from './components/OptimizationRecommendations';
import ExpenseTable from './components/ExpenseTable';
import ForecastingModule from './components/ForecastingModule';
import MealsServedChart from './components/MealsServedChart';
import MealDistributionChart from './components/MealDistributionChart';
import EfficiencyMetrics from './components/EfficiencyMetrics';
import CostTrendChart from './components/CostTrendChart';
import { useAuth } from '../../context/AuthContext';
import { getCostAnalytics, getCareHomes } from '../../services/analyticsService';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const CostAnalytics = () => {
  const navigate = useNavigate();
  const { careHomeId, isAdmin, role } = useAuth();
  const [selectedRange, setSelectedRange] = useState('last30');
  const [selectedCategories, setSelectedCategories] = useState(['meal-types']);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [careHomes, setCareHomes] = useState([]);
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(null);

  // Load care homes for admin selector, or set default for care home manager
  useEffect(() => {
    if (role === 'care_home_manager' && careHomeId) {
      setSelectedCareHomeId(careHomeId);
      return;
    }
    if (!isAdmin) return;
    let ignore = false;
    (async () => {
      const homes = await getCareHomes();
      if (!ignore) setCareHomes(homes);
    })();
    return () => { ignore = true; };
  }, [isAdmin, role, careHomeId]);

  // Determine which care home to fetch analytics for
  const analyticsCareHomeId = (isAdmin && role !== 'care_home_manager') ? selectedCareHomeId : careHomeId;

  const todayRange = useMemo(() => {
    const today = new Date();
    const toISO = (d) => d.toISOString().slice(0, 10);
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const addDays = (base, delta) => {
      const copy = new Date(base);
      copy.setUTCDate(copy.getUTCDate() + delta);
      return copy;
    };

    const rollingRange = (days) => {
      const start = addDays(end, -(days - 1));
      return { startDate: toISO(start), endDate: toISO(end) };
    };

    switch (selectedRange) {
      case 'today':
        return { startDate: toISO(end), endDate: toISO(end) };
      case 'yesterday': {
        const y = addDays(end, -1);
        return { startDate: toISO(y), endDate: toISO(y) };
      }
      case 'last7':
        return rollingRange(7);
      case 'last14':
        return rollingRange(14);
      case 'last21':
        return rollingRange(21);
      case 'last30':
        return rollingRange(30);
      case 'last60':
        return rollingRange(60);
      case 'last90':
        return rollingRange(90);
      case 'year': {
        const start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
        return { startDate: toISO(start), endDate: toISO(end) };
      }
      default:
        return rollingRange(30);
    }
  }, [selectedRange]);

  const [kpis, setKpis] = useState({ totalSpend: 0, avgCostPerMeal: 0, costPerResidentDay: 0, totalServed: 0 });
  const [timeseries, setTimeseries] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [topExpenses, setTopExpenses] = useState([]);
  const [spendCats, setSpendCats] = useState({});
  const [mealDistribution, setMealDistribution] = useState({});
  const [costMetricsByType, setCostMetricsByType] = useState({});
  const [mealsServedByType, setMealsServedByType] = useState({});
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [highestSpendingDay, setHighestSpendingDay] = useState({});
  const [lowestSpendingDay, setLowestSpendingDay] = useState({});
  const [currentResidents, setCurrentResidents] = useState(0);
  const [coverage, setCoverage] = useState({});
  const [rawResp, setRawResp] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  const budgetAlerts = [];
  const recommendations = [];
  const expenseTableData = [];
  const forecastData = [];

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError('');
        try {
        const res = await getCostAnalytics({ startDate: todayRange.startDate, endDate: todayRange.endDate, careHomeId: analyticsCareHomeId || null });
        if (!ignore) {
          if (res.ok) {
            setKpis(res.data.kpis);
            setTimeseries(res.data.timeseries);
            setBreakdown(res.data.breakdown);
            setTopExpenses(res.data.topExpenses);
            setSpendCats(res.data.spendCategories || {});
            setMealsServedByType(res.data.mealsServedByType || {});
            setMealDistribution(res.data.mealDistribution || {});
            setCostMetricsByType(res.data.costMetricsByType || {});
            setDailyMetrics(res.data.dailyMetrics || []);
            setHighestSpendingDay(res.data.highestSpendingDay || {});
            setLowestSpendingDay(res.data.lowestSpendingDay || {});
            setCurrentResidents(res.data.totals?.currentResidents || 0);
            setCoverage(res.data.coverage || {});
            setRawResp(res);
            setLastUpdate(new Date());
            setCoverage(res.data.coverage || {});
            setRawResp(res);
            setLastUpdate(new Date());
          } else {
            setError(res.error || 'Failed to load analytics');
            setRawResp(res);
          }
        }
      } catch (e) {
        if (!ignore) setError(e?.message || 'Failed to load analytics');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [analyticsCareHomeId, todayRange.startDate, todayRange.endDate]);

  const formatGBP = (n) => Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpiData = [
    { title: 'Total Spend', value: formatGBP(kpis.totalSpend), change: '', changeType: 'neutral', icon: 'PoundSterling' },
    { title: 'Avg Cost / Meal', value: formatGBP(kpis.avgCostPerMeal), change: '', changeType: 'neutral', icon: 'Utensils' },
    { title: 'Cost / Resident-Day', value: formatGBP(kpis.costPerResidentDay), change: '', changeType: 'neutral', icon: 'Users' },
    { title: 'Meals Served', value: String(kpis.totalServed), change: '', changeType: 'neutral', icon: 'ClipboardList', prefix: '' },
  ];

  const handleCategoryClick = (categoryName) => {
    console.log('Category clicked:', categoryName);
  };

  return (
    <>
      <Helmet>
        <title>Cost Analytics - Meal Manager</title>
        <meta name="description" content="Comprehensive financial insights for meal service optimization and budget management in UK care homes" />
      </Helmet>
      <Header />
      <main className="main-content bg-background min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">Cost Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Last updated: {lastUpdate?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" iconName="Receipt" iconPosition="left" onClick={() => navigate('/cost-analytics/breakdown')}>
                          Cost Breakdown
                        </Button>
                        <DateRangePicker selectedRange={selectedRange} onRangeChange={setSelectedRange} />
                        {/* Debug toggle removed per request */}
                      </div>
            </div>
            {isAdmin && role !== 'care_home_manager' && (
              <div className="relative max-w-xs">
                <select
                  value={selectedCareHomeId || ''}
                  onChange={(e) => setSelectedCareHomeId(e.target.value || null)}
                  className="w-full appearance-none px-4 py-2.5 pr-10 bg-card border border-border rounded-lg text-foreground text-sm font-medium hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 shadow-sm"
                >
                  <option value="">All Care Homes</option>
                  {careHomes.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <Icon name="ChevronDown" size={18} color="var(--color-muted-foreground)" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {kpiData?.map((kpi, index) => (
              <KPICard key={index} {...kpi} />
            ))}
          </div>

          {showRaw && rawResp && (
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2">Raw analytics response (click Debug to toggle)</div>
              <pre className="w-full overflow-auto max-h-72 bg-card p-3 rounded text-xs">
                {JSON.stringify(rawResp, null, 2)}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {['Breakfast', 'Lunch', 'Supper', 'Alternates', 'Specials'].map((name) => (
              <KPICard
                key={`sp-${name}`}
                title={name}
                value={(spendCats?.[name] || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                change={''}
                changeType={'neutral'}
                icon={name === 'Alternates' ? 'ExchangeAlt' : (name === 'Specials' ? 'Star' : 'Utensils')}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
            <div className="xl:col-span-6">
              <MealsServedChart
                mealsServedByType={mealsServedByType}
                costMetricsByType={costMetricsByType}
                selectedRange={selectedRange}
                onRangeChange={setSelectedRange}
              />
            </div>
            <div className="xl:col-span-6">
              <MealDistributionChart mealDistribution={mealDistribution} />
            </div>
          </div>

          <EfficiencyMetrics 
            costMetricsByType={costMetricsByType}
            mealDistribution={mealDistribution}
            highestSpendingDay={highestSpendingDay}
            lowestSpendingDay={lowestSpendingDay}
            currentResidents={currentResidents}
            totalServed={kpis.totalServed}
            avgCostPerMeal={kpis.avgCostPerMeal}
          />

          <div className="mb-8">
            <CostTrendChart dailyMetrics={dailyMetrics} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Meal Type Performance</h3>
              <div className="space-y-3">
                {Object.entries(costMetricsByType).map(([type, metric]) => (
                  <div key={type} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-foreground">{type}</p>
                      <p className="text-xs text-muted-foreground">{metric.served} served</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">£{metric.spend.toFixed(2)}</p>
                      <p className="text-xs text-primary">£{metric.avg.toFixed(2)}/meal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Meal Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Standard</span>
                    <span className="text-sm font-semibold text-foreground">{mealDistribution.standard?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-success h-2 rounded-full" style={{width: `${mealDistribution.standard || 0}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Alternates</span>
                    <span className="text-sm font-semibold text-foreground">{mealDistribution.alternates?.toFixed(1)}% ({mealDistribution.alternatesCount})</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-warning h-2 rounded-full" style={{width: `${mealDistribution.alternates || 0}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Specials</span>
                    <span className="text-sm font-semibold text-foreground">{mealDistribution.specials?.toFixed(1)}% ({mealDistribution.specialsCount})</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{width: `${mealDistribution.specials || 0}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Resident Coverage</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Residents</p>
                  <p className="text-2xl font-bold text-foreground">{coverage.currentResidents || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Daily Served</p>
                  <p className="text-2xl font-bold text-foreground">{(coverage.avgDailyServed || 0).toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Coverage</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-success h-2 rounded-full" style={{width: `${Math.min(coverage.coveragePercentage || 0, 100)}%`}}></div>
                    </div>
                    <p className="text-sm font-semibold text-foreground w-12">{(coverage.coveragePercentage || 0).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Daily Spending Extremes</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-success mb-2">Highest Spending Day</p>
                  <p className="text-2xl font-bold text-foreground">£{(highestSpendingDay.spend || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{highestSpendingDay.date} • {highestSpendingDay.served} served</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Cost Efficiency</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Cost Per Resident Per Day</p>
                  <p className="text-2xl font-bold text-foreground">£{kpis.costPerResidentDay?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Cost Per Meal</p>
                  <p className="text-2xl font-bold text-foreground">£{kpis.avgCostPerMeal?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
            <div className="xl:col-span-8">
              <SpendingChart data={timeseries} selectedCategories={selectedCategories} />
            </div>
            <div className="xl:col-span-4">
              <CostBreakdownPie data={breakdown} onCategoryClick={handleCategoryClick} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
            <div className="xl:col-span-4">
              <TopExpensesList expenses={topExpenses} />
            </div>
            <div className="xl:col-span-4">
              <BudgetAlerts alerts={[]} />
            </div>
            <div className="xl:col-span-4">
              <OptimizationRecommendations recommendations={[]} />
            </div>
          </div>

          <div className="mb-8">
            <ForecastingModule forecastData={[]} />
          </div>

          <div>
            <ExpenseTable expenses={[]} />
          </div>
        </div>
      </main>
    </>
  );
};

export default CostAnalytics;