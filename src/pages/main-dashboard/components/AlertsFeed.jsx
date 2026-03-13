import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const AlertsFeed = ({ alerts, onAcknowledge, onViewDetails }) => {
  const [filter, setFilter] = useState('all');

  const getSeverityStyles = (severity) => {
    const styles = {
      critical: {
        bg: 'bg-error/10',
        border: 'border-error/30',
        icon: 'bg-error text-error-foreground',
        text: 'text-error'
      },
      high: {
        bg: 'bg-warning/10',
        border: 'border-warning/30',
        icon: 'bg-warning text-warning-foreground',
        text: 'text-warning'
      },
      medium: {
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        icon: 'bg-primary text-primary-foreground',
        text: 'text-primary'
      },
      low: {
        bg: 'bg-muted',
        border: 'border-border',
        icon: 'bg-muted-foreground text-background',
        text: 'text-muted-foreground'
      }
    };
    return styles?.[severity] || styles?.low;
  };

  const getAlertIcon = (type) => {
    const icons = {
      dietary: 'AlertTriangle',
      inventory: 'Package',
      delivery: 'Truck',
      compliance: 'FileCheck',
      cost: 'PoundSterling'
    };
    return icons?.[type] || 'Bell';
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts?.filter(alert => alert?.severity === filter);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-elevation-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
            <Icon name="Bell" size={20} className="text-error" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
            <p className="text-sm text-muted-foreground">{filteredAlerts?.length} items requiring attention</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'critical' ? 'destructive' : 'ghost'}
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critical
          </Button>
        </div>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
        {filteredAlerts?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="CheckCircle2" size={48} className="text-success mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No alerts to display</p>
            <p className="text-xs text-muted-foreground mt-1">All systems operating normally</p>
          </div>
        ) : (
          filteredAlerts?.map((alert) => {
            const styles = getSeverityStyles(alert?.severity);
            return (
              <div
                key={alert?.id}
                className={`rounded-lg border p-4 ${styles?.bg} ${styles?.border} transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-lg ${styles?.icon} flex items-center justify-center flex-shrink-0`}>
                    <Icon name={getAlertIcon(alert?.type)} size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-foreground mb-1">{alert?.title}</h3>
                        <p className="text-xs text-muted-foreground">{alert?.description}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${styles?.text} bg-background/50 ml-2`}>
                        {alert?.severity?.toUpperCase()}
                      </span>
                    </div>

                    {alert?.affectedItems && (
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name="Users" size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Affects {alert?.affectedItems} resident{alert?.affectedItems > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Icon name="Clock" size={12} />
                        {getTimeAgo(alert?.timestamp)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          iconName="Eye"
                          iconPosition="left"
                          onClick={() => onViewDetails(alert?.id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          iconName="Check"
                          iconPosition="left"
                          onClick={() => onAcknowledge(alert?.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsFeed;