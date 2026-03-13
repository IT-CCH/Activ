import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';

const MealDistributionChart = ({ mealDistribution }) => {
  if (!mealDistribution) return null;

  const data = [
    { name: 'Standard Meals', value: Number(mealDistribution.standard?.toFixed(1)) || 0, count: 0 },
    { name: 'Alternates', value: Number(mealDistribution.alternates?.toFixed(1)) || 0, count: mealDistribution.alternatesCount || 0 },
    { name: 'Specials', value: Number(mealDistribution.specials?.toFixed(1)) || 0, count: mealDistribution.specialsCount || 0 },
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Meal Distribution</h3>
        <Icon name="PieChart" size={20} color="var(--color-muted-foreground)" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value) => `${value}%`}
            contentStyle={{ 
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-foreground)',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MealDistributionChart;
