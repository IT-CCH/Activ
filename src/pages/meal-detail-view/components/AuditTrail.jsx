import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const AuditTrail = ({ auditLogs }) => {
  const [filter, setFilter] = useState('all');

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return { icon: 'Plus', color: 'text-success' };
      case 'modified':
        return { icon: 'Edit', color: 'text-warning' };
      case 'approved':
        return { icon: 'CheckCircle2', color: 'text-success' };
      case 'rejected':
        return { icon: 'XCircle', color: 'text-error' };
      case 'ingredient_changed':
        return { icon: 'Package', color: 'text-primary' };
      case 'cost_updated':
        return { icon: 'PoundSterling', color: 'text-accent' };
      default:
        return { icon: 'Activity', color: 'text-muted-foreground' };
    }
  };

  const getActionLabel = (action) => {
    return action?.split('_')?.map(word => word?.charAt(0)?.toUpperCase() + word?.slice(1))?.join(' ');
  };

  const filteredLogs = filter === 'all' 
    ? auditLogs 
    : auditLogs?.filter(log => log?.action === filter);

  const actionTypes = ['all', ...new Set(auditLogs.map(log => log.action))];

  return (
    <div className="bg-card rounded-lg card-elevation-1">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Icon name="History" size={20} color="var(--color-secondary)" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Audit Trail</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredLogs?.length} {filteredLogs?.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {actionTypes?.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type === 'all' ? 'All Changes' : getActionLabel(type)}
            </button>
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {filteredLogs?.map((log, index) => {
            const actionStyle = getActionIcon(log?.action);
            return (
              <div key={log?.id} className="relative">
                {index !== filteredLogs?.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border"></div>
                )}
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full bg-card border-2 border-border flex items-center justify-center flex-shrink-0 ${actionStyle?.color}`}>
                    <Icon name={actionStyle?.icon} size={18} />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm text-foreground">{getActionLabel(log?.action)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          by {log?.user} • {log?.timestamp}
                        </div>
                      </div>
                      {log?.critical && (
                        <span className="px-2 py-1 bg-error/10 text-error text-xs font-medium rounded">
                          Critical
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                      {log?.description}
                    </div>
                    {log?.changes && (
                      <div className="mt-2 space-y-1">
                        {log?.changes?.map((change, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                            <Icon name="ArrowRight" size={12} />
                            <span className="line-through opacity-60">{change?.from}</span>
                            <Icon name="ArrowRight" size={12} />
                            <span className="font-medium text-foreground">{change?.to}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {log?.reason && (
                      <div className="mt-2 p-2 bg-primary/5 border-l-2 border-primary rounded text-xs text-foreground">
                        <span className="font-medium">Reason: </span>{log?.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredLogs?.length === 0 && (
          <div className="text-center py-8">
            <Icon name="FileSearch" size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No audit entries found for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;