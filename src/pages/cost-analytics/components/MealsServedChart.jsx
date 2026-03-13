import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';

const MealsServedChart = ({ mealsServedByType, costMetricsByType, selectedRange, onRangeChange }) => {
  if (!mealsServedByType) return null;

  const quickRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7' },
    { label: 'Last 30 Days', value: 'last30' },
  ];

  const mealTypes = ['Breakfast', 'Lunch', 'Supper'];
  const data = mealTypes.map((name) => {
    const bucket = mealsServedByType?.[name];
    const normalized = typeof bucket === 'number' ? { main: bucket, alternates: 0, specials: 0 } : (bucket || {});
    const standard = Number(normalized.main || 0);
    const alternates = Number(normalized.alternates || 0);
    const specials = Number(normalized.specials || 0);
    const total = standard + alternates + specials;
    return { name, standard, alternates, specials, total, avgCost: costMetricsByType?.[name]?.avg || 0 };
  });

  const hasData = data.some((d) => d.total > 0);

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">Meals Served by Type</h3>
          <Icon name="BarChart3" size={20} color="var(--color-muted-foreground)" />
        </div>
        <div className="flex items-center gap-2">
          {quickRanges.map((range) => {
            const isActive = selectedRange === range.value;
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => onRangeChange?.(range.value)}
                disabled={!onRangeChange}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-foreground border-border hover:border-primary/60'
                } ${onRangeChange ? '' : 'opacity-70 cursor-not-allowed'}`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" />
          <YAxis stroke="var(--color-muted-foreground)" allowDecimals={false} />
          <Tooltip
            formatter={(value, name) => [value, name]}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-foreground)',
            }}
          />
          <Legend />
          <Bar dataKey="standard" stackId="served" fill="var(--color-primary)" name="Standard" />
          <Bar dataKey="alternates" stackId="served" fill="var(--color-warning)" name="Alternates" />
          <Bar dataKey="specials" stackId="served" fill="var(--color-accent)" name="Specials" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {!hasData && (
        <p className="text-center text-sm text-muted-foreground mt-4">No meal service data for this range.</p>
      )}
    </div>
  );
};

export default MealsServedChart;
