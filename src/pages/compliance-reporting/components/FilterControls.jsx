import React from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const FilterControls = ({ filters, onFilterChange, onReset, onExport }) => {
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'dietary', label: 'Dietary Restrictions' },
    { value: 'allergen', label: 'Allergen Management' },
    { value: 'nutritional', label: 'Nutritional Standards' },
    { value: 'delivery', label: 'Meal Delivery' },
    { value: 'modifications', label: 'Meal Modifications' },
    { value: 'violations', label: 'Compliance Violations' }
  ];

  const residentGroupOptions = [
    { value: 'all', label: 'All Residents' },
    { value: 'diabetic', label: 'Diabetic Residents' },
    { value: 'allergen', label: 'Allergen Sensitive' },
    { value: 'texture', label: 'Texture Modified' },
    { value: 'religious', label: 'Religious Dietary' },
    { value: 'medical', label: 'Medical Restrictions' }
  ];

  const eventTypeOptions = [
    { value: 'all', label: 'All Events' },
    { value: 'modification', label: 'Meal Modifications' },
    { value: 'violation', label: 'Violations' },
    { value: 'correction', label: 'Corrective Actions' },
    { value: 'approval', label: 'Approvals' },
    { value: 'alert', label: 'Alerts' },
    { value: 'review', label: 'Reviews' }
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Filter Controls</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" iconName="RotateCcw" onClick={onReset}>
            Reset
          </Button>
          <Button variant="default" size="sm" iconName="Download" onClick={onExport}>
            Export
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="Date Range"
          options={dateRangeOptions}
          value={filters?.dateRange}
          onChange={(value) => onFilterChange('dateRange', value)}
        />

        <Select
          label="Compliance Category"
          options={categoryOptions}
          value={filters?.category}
          onChange={(value) => onFilterChange('category', value)}
        />

        <Select
          label="Resident Group"
          options={residentGroupOptions}
          value={filters?.residentGroup}
          onChange={(value) => onFilterChange('residentGroup', value)}
        />

        <Select
          label="Event Type"
          options={eventTypeOptions}
          value={filters?.eventType}
          onChange={(value) => onFilterChange('eventType', value)}
        />
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing results for: <span className="font-medium text-foreground">{filters?.dateRange === 'last7days' ? 'Last 7 Days' : filters?.dateRange === 'last30days' ? 'Last 30 Days' : 'Today'}</span>
          </span>
          <span className="text-muted-foreground">
            Last updated: <span className="font-medium text-foreground">{new Date()?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;