import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const MealCalendarPreview = ({ weekData, onDateSelect }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date()?.toISOString()?.split('T')?.[0]);

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  const handleViewFullCalendar = () => {
    navigate('/food-calendar-view');
  };

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
      lunch: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
      snack: 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
    };
    return colors?.[mealType?.toLowerCase()] || 'bg-muted text-muted-foreground';
  };

  const isToday = (date) => {
    return date === new Date()?.toISOString()?.split('T')?.[0];
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-elevation-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Calendar" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Weekly Meal Calendar</h2>
            <p className="text-sm text-muted-foreground">Current week overview</p>
          </div>
        </div>
        <Button variant="outline" size="sm" iconName="ExternalLink" iconPosition="right" onClick={handleViewFullCalendar}>
          Full Calendar
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {weekData?.map((day) => (
          <div
            key={day?.date}
            className={`rounded-lg border p-3 cursor-pointer transition-all duration-200 ${
              selectedDate === day?.date
                ? 'border-primary bg-primary/5'
                : isToday(day?.date)
                ? 'border-accent bg-accent/5' :'border-border bg-muted/30 hover:border-primary/50'
            }`}
            onClick={() => handleDateClick(day?.date)}
          >
            <div className="text-center mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">{day?.dayName}</p>
              <p className={`text-lg font-bold ${isToday(day?.date) ? 'text-accent' : 'text-foreground'}`}>
                {day?.dayNumber}
              </p>
            </div>

            <div className="space-y-1">
              {day?.meals?.map((meal, index) => (
                <div
                  key={index}
                  className={`text-xs px-2 py-1 rounded ${getMealTypeColor(meal?.type)}`}
                  title={meal?.name}
                >
                  <div className="flex items-center gap-1">
                    <Icon name="Circle" size={6} className="flex-shrink-0" />
                    <span className="truncate font-medium">{meal?.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-semibold text-foreground">£{day?.totalCost}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon name="Info" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Click any day to view details</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealCalendarPreview;