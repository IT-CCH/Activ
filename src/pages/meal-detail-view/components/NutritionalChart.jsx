import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Icon from '../../../components/AppIcon';

const NutritionalChart = ({ nutritionalInfo }) => {
  const macroData = [
    { name: 'Protein', value: nutritionalInfo?.protein, color: '#2563EB' },
    { name: 'Carbs', value: nutritionalInfo?.carbs, color: '#059669' },
    { name: 'Fat', value: nutritionalInfo?.fat, color: '#F59E0B' },
    { name: 'Fiber', value: nutritionalInfo?.fiber, color: '#8B5CF6' }
  ];

  const vitaminData = [
    { name: 'Vit A', value: nutritionalInfo?.vitamins?.vitaminA, guideline: 100 },
    { name: 'Vit C', value: nutritionalInfo?.vitamins?.vitaminC, guideline: 100 },
    { name: 'Vit D', value: nutritionalInfo?.vitamins?.vitaminD, guideline: 100 },
    { name: 'Calcium', value: nutritionalInfo?.vitamins?.calcium, guideline: 100 },
    { name: 'Iron', value: nutritionalInfo?.vitamins?.iron, guideline: 100 }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{payload?.[0]?.name}</p>
          <p className="text-sm text-muted-foreground">{payload?.[0]?.value}g</p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{payload?.[0]?.payload?.name}</p>
          <p className="text-sm text-accent">{payload?.[0]?.value}% of NHS guideline</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-card rounded-lg card-elevation-1 p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon name="Activity" size={20} color="var(--color-accent)" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Nutritional Analysis</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Macronutrient Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={macroData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100)?.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {macroData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-sm font-medium text-foreground mb-4">Vitamin & Mineral Content (% NHS Guidelines)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={vitaminData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{nutritionalInfo?.calories}</div>
          <div className="text-xs text-muted-foreground">Calories</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{nutritionalInfo?.protein}g</div>
          <div className="text-xs text-muted-foreground">Protein</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{nutritionalInfo?.carbs}g</div>
          <div className="text-xs text-muted-foreground">Carbohydrates</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{nutritionalInfo?.fat}g</div>
          <div className="text-xs text-muted-foreground">Fat</div>
        </div>
      </div>
      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Icon name="Info" size={16} className="text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            Nutritional values calculated based on NHS dietary guidelines for elderly care. Values may vary based on portion sizes and preparation methods.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionalChart;