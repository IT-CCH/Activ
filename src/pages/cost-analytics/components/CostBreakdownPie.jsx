import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Icon from '../../../components/AppIcon';

const CostBreakdownPie = ({ data, onCategoryClick }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const COLORS = [
    'var(--color-primary)',
    'var(--color-accent)',
    'var(--color-warning)',
    'var(--color-secondary)',
    '#8B5CF6',
    '#EC4899'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0];
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-1">{data?.name}</p>
          <p className="text-xs text-muted-foreground">
            £{data?.value?.toFixed(2)} ({data?.payload?.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleClick = (entry) => {
    if (onCategoryClick) {
      onCategoryClick(entry?.name);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Cost Breakdown by Category</h3>
        <Icon name="PieChart" size={20} color="var(--color-muted-foreground)" />
      </div>
      <div className="w-full h-80" aria-label="Cost Breakdown Pie Chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              onClick={(_, index) => handleClick(data?.[index])}
              style={{ cursor: 'pointer' }}
            >
              {data?.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS?.[index % COLORS?.length]}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {data?.map((entry, index) => (
          <div 
            key={entry?.name}
            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer transition-colors duration-150"
            onClick={() => handleClick(entry)}
          >
            <div 
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COLORS?.[index % COLORS?.length] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{entry?.name}</p>
              <p className="text-xs text-muted-foreground">£{entry?.value?.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostBreakdownPie;