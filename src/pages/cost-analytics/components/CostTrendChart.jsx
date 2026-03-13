import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Icon from '../../../components/AppIcon';

const CostTrendChart = ({ dailyMetrics }) => {
  if (!dailyMetrics || dailyMetrics.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Daily Cost Trend</h3>
        <Icon name="LineChart" size={20} color="var(--color-muted-foreground)" />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dailyMetrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="date" 
            stroke="var(--color-muted-foreground)"
            tick={{ fontSize: 12 }}
          />
          <YAxis stroke="var(--color-muted-foreground)" />
          <Tooltip 
            formatter={(value) => value.toFixed(2)}
            contentStyle={{ 
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.5rem',
              color: 'var(--color-foreground)',
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="spend" 
            stroke="var(--color-primary)" 
            name="Daily Spend (£)"
            dot={false}
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="avgCost" 
            stroke="var(--color-amber-500)" 
            name="Avg Cost per Meal (£)"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostTrendChart;
