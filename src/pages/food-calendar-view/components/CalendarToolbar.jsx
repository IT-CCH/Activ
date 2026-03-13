import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CalendarToolbar = ({ 
  currentView, 
  onViewChange, 
  currentDate, 
  onNavigate, 
  mealCycle,
  onExport 
}) => {
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })?.format(date);
  };

  const views = [
    { id: 'day', label: 'Day', icon: 'Calendar' },
    { id: 'week', label: 'Week', icon: 'CalendarDays' },
    { id: 'month', label: 'Month', icon: 'CalendarRange' }
  ];

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronLeft"
              onClick={() => onNavigate('PREV')}
              aria-label="Previous period"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('TODAY')}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              iconName="ChevronRight"
              onClick={() => onNavigate('NEXT')}
              aria-label="Next period"
            />
          </div>

          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-foreground">
              {formatDate(currentDate)}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-md border border-accent/20">
            <Icon name="RefreshCw" size={16} className="text-accent" />
            <span className="text-sm font-medium text-accent">
              Week {mealCycle?.currentWeek} of {mealCycle?.totalWeeks}
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              Day {mealCycle?.currentDay}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-muted rounded-md p-1">
            {views?.map((view) => (
              <button
                key={view?.id}
                onClick={() => onViewChange(view?.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  currentView === view?.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={`${view?.label} view`}
                aria-pressed={currentView === view?.id}
              >
                <Icon name={view?.icon} size={16} />
                <span className="hidden sm:inline">{view?.label}</span>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            iconName="Download"
            iconPosition="left"
            onClick={onExport}
            className="hidden md:flex"
          >
            Export
          </Button>
        </div>
      </div>
      <div className="md:hidden mt-3">
        <h2 className="text-base font-semibold text-foreground">
          {formatDate(currentDate)}
        </h2>
      </div>
    </div>
  );
};

export default CalendarToolbar;