import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ComplianceAlertPanel = ({ alerts, deadlines, updates }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-error/10 text-error border-error/20';
      case 'high':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'AlertTriangle';
      case 'high':
        return 'AlertCircle';
      case 'medium':
        return 'Info';
      default:
        return 'Bell';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Compliance Alerts</h3>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-error text-error-foreground text-xs font-semibold">
            {alerts?.length}
          </span>
        </div>

        <div className="space-y-3">
          {alerts?.map((alert) => (
            <div
              key={alert?.id}
              className={`p-4 rounded-lg border ${getPriorityColor(alert?.priority)}`}
            >
              <div className="flex items-start gap-3">
                <Icon name={getPriorityIcon(alert?.priority)} size={20} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold mb-1">{alert?.title}</h4>
                  <p className="text-xs opacity-90 mb-2">{alert?.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs opacity-75">{alert?.time}</span>
                    <Button variant="ghost" size="xs" iconName="ArrowRight">
                      Review
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {alerts?.length === 0 && (
          <div className="text-center py-8">
            <Icon name="CheckCircle2" size={48} className="text-success mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active compliance alerts</p>
          </div>
        )}
      </div>
      <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h3>
          <Icon name="Calendar" size={20} className="text-primary" />
        </div>

        <div className="space-y-3">
          {deadlines?.map((deadline) => (
            <div key={deadline?.id} className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-foreground">{deadline?.title}</h4>
                <span className={`text-xs font-medium px-2 py-1 rounded ${deadline?.daysLeft <= 3 ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                  {deadline?.daysLeft} days
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{deadline?.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Due: {new Date(deadline.dueDate)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <Button variant="outline" size="xs" iconName="ExternalLink">
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Regulatory Updates</h3>
          <Icon name="FileText" size={20} className="text-primary" />
        </div>

        <div className="space-y-3">
          {updates?.map((update) => (
            <div key={update?.id} className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-foreground mb-1">{update?.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{update?.summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(update.publishedDate)?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <Button variant="link" size="xs" iconName="ExternalLink">
                      Read More
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Shield" size={24} className="text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">CQC Compliance Status</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Your facility maintains excellent compliance standards. Next inspection scheduled for March 2026.
            </p>
            <Button variant="outline" size="sm" iconName="FileCheck">
              View Full Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceAlertPanel;