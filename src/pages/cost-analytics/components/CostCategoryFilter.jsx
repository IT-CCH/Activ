import React from 'react';
import { Checkbox } from '../../../components/ui/Checkbox';

const CostCategoryFilter = ({ selectedCategories, onCategoryChange }) => {
  const categories = [
    { id: 'ingredients', label: 'Ingredients', color: 'bg-primary' },
    { id: 'labor', label: 'Labor', color: 'bg-accent' },
    { id: 'overhead', label: 'Overhead', color: 'bg-warning' }
  ];

  const handleCategoryToggle = (categoryId) => {
    const newCategories = selectedCategories?.includes(categoryId)
      ? selectedCategories?.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoryChange(newCategories);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Cost Categories</h3>
      <div className="space-y-2">
        {categories?.map((category) => (
          <div key={category?.id} className="flex items-center gap-2">
            <Checkbox
              checked={selectedCategories?.includes(category?.id)}
              onChange={() => handleCategoryToggle(category?.id)}
            />
            <div className={`w-3 h-3 rounded ${category?.color}`} />
            <label className="text-sm text-foreground cursor-pointer flex-1">
              {category?.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CostCategoryFilter;