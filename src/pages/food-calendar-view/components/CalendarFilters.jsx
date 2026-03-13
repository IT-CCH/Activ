import React from 'react';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const CalendarFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  isExpanded,
  onToggleExpand 
}) => {
  const dietaryOptions = [
    { value: 'all', label: 'All Diets' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'gluten-free', label: 'Gluten Free' },
    { value: 'dairy-free', label: 'Dairy Free' },
    { value: 'halal', label: 'Halal' },
    { value: 'kosher', label: 'Kosher' },
    { value: 'low-sodium', label: 'Low Sodium' }
  ];

  const costOptions = [
    { value: 'all', label: 'All Costs' },
    { value: 'under-2', label: 'Under £2.00' },
    { value: '2-3', label: '£2.00 - £3.00' },
    { value: '3-4', label: '£3.00 - £4.00' },
    { value: 'over-4', label: 'Over £4.00' }
  ];

  const complexityOptions = [
    { value: 'all', label: 'All Complexity' },
    { value: 'simple', label: 'Simple' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'complex', label: 'Complex' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'modified', label: 'Modified' }
  ];

  const hasActiveFilters = 
    filters?.dietary !== 'all' || 
    filters?.cost !== 'all' || 
    filters?.complexity !== 'all' || 
    filters?.status !== 'all';

  return (
    <div className="bg-card border-b border-border">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
          >
            <Icon name="Filter" size={16} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                Active
              </span>
            )}
            <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={16} />
          </button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              iconName="X"
              iconPosition="left"
              onClick={onClearFilters}
            >
              Clear All
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Select
              label="Dietary Requirements"
              options={dietaryOptions}
              value={filters?.dietary}
              onChange={(value) => onFilterChange('dietary', value)}
            />

            <Select
              label="Cost Range"
              options={costOptions}
              value={filters?.cost}
              onChange={(value) => onFilterChange('cost', value)}
            />

            <Select
              label="Preparation Complexity"
              options={complexityOptions}
              value={filters?.complexity}
              onChange={(value) => onFilterChange('complexity', value)}
            />

            <Select
              label="Meal Status"
              options={statusOptions}
              value={filters?.status}
              onChange={(value) => onFilterChange('status', value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarFilters;