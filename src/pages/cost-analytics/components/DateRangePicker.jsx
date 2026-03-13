import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DateRangePicker = ({ selectedRange, onRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const presetRanges = [
    { label: 'Today', value: 'today', days: 0 },
    { label: 'Yesterday', value: 'yesterday', days: 1 },
    { label: 'Last 7 Days', value: 'last7', days: 7 },
    { label: 'Last 14 Days', value: 'last14', days: 14 },
    { label: 'Last 21 Days', value: 'last21', days: 21 },
    { label: 'Last 30 Days', value: 'last30', days: 30 },
    { label: 'Last 60 Days', value: 'last60', days: 60 },
    { label: 'Last 90 Days', value: 'last90', days: 90 },
    { label: 'This Year', value: 'year', days: 365 }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef?.current && !dropdownRef?.current?.contains(event?.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRangeSelect = (range) => {
    onRangeChange(range);
    setIsOpen(false);
  };

  const getDisplayLabel = () => {
    const selected = presetRanges?.find(r => r?.value === selectedRange);
    return selected ? selected?.label : 'Select Range';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        iconName="Calendar"
        iconPosition="left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {getDisplayLabel()}
        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="ml-2" />
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-[1010] overflow-hidden">
          {presetRanges?.map((range) => (
            <button
              key={range?.value}
              onClick={() => handleRangeSelect(range?.value)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${
                selectedRange === range?.value
                  ? 'bg-primary/10 text-primary font-medium' :'text-foreground hover:bg-muted'
              }`}
            >
              {range?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;