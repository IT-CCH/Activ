import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CalendarSidebar = ({ 
  preparationChecklist, 
  dietaryAlerts, 
  cycleAnalytics,
  onChecklistItemToggle,
  onAlertClick 
}) => {
  return (
    <div className="bg-card border-l border-border h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="ClipboardCheck" size={16} className="text-primary" />
              Today's Preparation
            </h3>
            <span className="text-xs text-muted-foreground">
              {preparationChecklist?.filter(item => item?.completed)?.length}/{preparationChecklist?.length}
            </span>
          </div>

          <div className="space-y-2">
            {preparationChecklist?.map((item) => (
              <div
                key={item?.id}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors duration-150 cursor-pointer"
                onClick={() => onChecklistItemToggle(item?.id)}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  item?.completed
                    ? 'bg-success border-success' :'border-border'
                }`}>
                  {item?.completed && <Icon name="Check" size={12} color="white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item?.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item?.task}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item?.meal} • {item?.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Icon name="AlertCircle" size={16} className="text-warning" />
              Dietary Alerts
            </h3>
            <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs font-medium rounded">
              {dietaryAlerts?.length}
            </span>
          </div>

          <div className="space-y-2">
            {dietaryAlerts?.map((alert) => (
              <div
                key={alert?.id}
                onClick={() => onAlertClick(alert)}
                className={`p-3 rounded-md border cursor-pointer transition-all duration-200 hover:shadow-sm ${
                  alert?.severity === 'high' ?'bg-error/5 border-error/20'
                    : alert?.severity === 'medium' ?'bg-warning/5 border-warning/20' :'bg-primary/5 border-primary/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    name={alert?.severity === 'high' ? 'AlertTriangle' : 'Info'}
                    size={14}
                    className={
                      alert?.severity === 'high' ?'text-error mt-0.5'
                        : alert?.severity === 'medium' ?'text-warning mt-0.5' :'text-primary mt-0.5'
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">
                      {alert?.resident}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert?.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert?.meal} • {alert?.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Icon name="TrendingUp" size={16} className="text-accent" />
            Cycle Performance
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Completion Rate</span>
                <span className="text-sm font-semibold text-foreground">
                  {cycleAnalytics?.completionRate}%
                </span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${cycleAnalytics?.completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <Icon name="CheckCircle" size={12} className="text-success" />
                  <span className="text-xs text-muted-foreground">On Time</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {cycleAnalytics?.onTimeMeals}
                </p>
              </div>

              <div className="p-2 bg-muted rounded-md">
                <div className="flex items-center gap-1 mb-1">
                  <Icon name="Clock" size={12} className="text-warning" />
                  <span className="text-xs text-muted-foreground">Delayed</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {cycleAnalytics?.delayedMeals}
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Avg Cost/Meal</span>
                <span className="text-sm font-semibold text-foreground">
                  £{cycleAnalytics?.avgCostPerMeal?.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Budget Status</span>
                <span className={`text-xs font-medium ${
                  cycleAnalytics?.budgetStatus === 'under' ? 'text-success' : 'text-warning'
                }`}>
                  {cycleAnalytics?.budgetStatus === 'under' ? 'Under Budget' : 'Over Budget'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          iconName="BarChart3"
          iconPosition="left"
          fullWidth
        >
          View Full Analytics
        </Button>
      </div>
    </div>
  );
};

export default CalendarSidebar;