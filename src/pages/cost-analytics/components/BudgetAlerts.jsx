import React from 'react';
import Icon from '../../../components/AppIcon';

const BudgetAlerts = ({ alerts }) => {
  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return 'AlertCircle';
      case 'warning':
        return 'AlertTriangle';
      case 'info':
        return 'Info';
      default:
        return 'Bell';
    }
  };

  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-error bg-error/5';
      case 'warning':
        return 'border-warning bg-warning/5';
      case 'info':
        return 'border-primary bg-primary/5';
      default:
        return 'border-border bg-muted';
    }
  };

  const getIconColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'var(--color-error)';
      case 'warning':
        return 'var(--color-warning)';
      case 'info':
        return 'var(--color-primary)';
      default:
        return 'var(--color-muted-foreground)';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Budget Alerts</h3>
        <Icon name="Bell" size={20} color="var(--color-muted-foreground)" />
      </div>
      <div className="space-y-3">
        {alerts?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="CheckCircle" size={48} color="var(--color-success)" className="mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          alerts?.map((alert) => (
            <div
              key={alert?.id}
              className={`border-l-4 rounded-lg p-3 ${getAlertColor(alert?.severity)}`}
            >
              <div className="flex items-start gap-3">
                <Icon 
                  name={getAlertIcon(alert?.severity)} 
                  size={20} 
                  color={getIconColor(alert?.severity)}
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">{alert?.title}</p>
                  <p className="text-xs text-muted-foreground">{alert?.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{alert?.timestamp}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BudgetAlerts;