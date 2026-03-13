import React from 'react';
import Icon from '../../../components/AppIcon';

const EfficiencyMetrics = ({ costMetricsByType, mealDistribution, highestSpendingDay, lowestSpendingDay, currentResidents, totalServed, avgCostPerMeal }) => {
  if (!costMetricsByType) return null;

  const metrics = [
    {
      label: 'Avg Cost per Meal',
      value: `£${(avgCostPerMeal || 0).toFixed(2)}`,
      icon: 'TrendingDown',
      color: 'text-blue-500',
    },
    {
      label: 'Alternates Ratio',
      value: `${(mealDistribution?.alternates || 0).toFixed(1)}%`,
      icon: 'ExchangeAlt',
      color: 'text-purple-500',
    },
    {
      label: 'Specials Ratio',
      value: `${(mealDistribution?.specials || 0).toFixed(1)}%`,
      icon: 'Star',
      color: 'text-amber-500',
    },
    {
      label: 'Meals Served',
      value: `${totalServed || 0}`,
      icon: 'Users',
      color: 'text-green-500',
    },
    {
      label: 'Highest Spend Day',
      value: `£${(highestSpendingDay?.spend || 0).toFixed(2)}`,
      icon: 'TrendingUp',
      color: 'text-red-500',
      subtext: highestSpendingDay?.date,
    },
    {
      label: 'Lowest Spend Day',
      value: `£${(lowestSpendingDay?.spend || 0).toFixed(2)}`,
      icon: 'TrendingDown',
      color: 'text-green-600',
      subtext: lowestSpendingDay?.date,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Efficiency Metrics</h3>
        <Icon name="Activity" size={20} color="var(--color-muted-foreground)" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-muted/40 border border-border/50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">{metric.label}</p>
                <p className={`text-lg font-semibold ${metric.color}`}>{metric.value}</p>
                {metric.subtext && <p className="text-xs text-muted-foreground mt-1">{metric.subtext}</p>}
              </div>
              <Icon name={metric.icon} size={20} color="var(--color-muted-foreground)" className="flex-shrink-0 ml-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EfficiencyMetrics;
