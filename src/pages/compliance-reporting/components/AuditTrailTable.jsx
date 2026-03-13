import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const AuditTrailTable = ({ events, onAcknowledge, onAssignAction }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const toggleRow = (eventId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded?.has(eventId)) {
      newExpanded?.delete(eventId);
    } else {
      newExpanded?.add(eventId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-error/10 text-error border-error/20';
      case 'high':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'medium':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return 'CheckCircle2';
      case 'pending':
        return 'Clock';
      case 'in-progress':
        return 'AlertCircle';
      default:
        return 'Circle';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'text-success';
      case 'pending':
        return 'text-warning';
      case 'in-progress':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden card-elevation-1">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Audit Trail</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{events?.length} events</span>
            <Button variant="outline" size="sm" iconName="Filter">
              Advanced Filter
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Date & Time
                  <Icon name={sortConfig?.key === 'timestamp' ? (sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('eventType')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Event Type
                  <Icon name={sortConfig?.key === 'eventType' ? (sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('severity')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Severity
                  <Icon name={sortConfig?.key === 'severity' ? (sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-muted-foreground">Staff</span>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Status
                  <Icon name={sortConfig?.key === 'status' ? (sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown'} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="text-xs font-medium text-muted-foreground">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {events?.map((event) => (
              <React.Fragment key={event?.id}>
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground font-medium">
                      {new Date(event.timestamp)?.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(event.timestamp)?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Icon name={event?.icon} size={16} className="text-primary" />
                      <span className="text-sm font-medium text-foreground">{event?.eventType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-foreground">{event?.description}</div>
                    {event?.resident && (
                      <div className="text-xs text-muted-foreground mt-1">Resident: {event?.resident}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getSeverityColor(event?.severity)}`}>
                      {event?.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src={event?.staffAvatar}
                        alt={event?.staffAvatarAlt}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">{event?.staffName}</div>
                        <div className="text-xs text-muted-foreground">{event?.staffRole}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Icon name={getStatusIcon(event?.status)} size={16} className={getStatusColor(event?.status)} />
                      <span className={`text-sm font-medium ${getStatusColor(event?.status)}`}>
                        {event?.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName={expandedRows?.has(event?.id) ? 'ChevronUp' : 'ChevronDown'}
                        onClick={() => toggleRow(event?.id)}
                      >
                        Details
                      </Button>
                      {event?.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          iconName="Check"
                          onClick={() => onAcknowledge(event?.id)}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows?.has(event?.id) && (
                  <tr className="bg-muted/20">
                    <td colSpan="7" className="px-6 py-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Event Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Event ID:</span>
                                <span className="text-foreground font-medium">{event?.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Category:</span>
                                <span className="text-foreground font-medium">{event?.category}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Meal:</span>
                                <span className="text-foreground font-medium">{event?.mealName || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Corrective Action</h4>
                            <p className="text-sm text-muted-foreground">{event?.correctiveAction}</p>
                            {event?.status === 'pending' && (
                              <Button
                                variant="default"
                                size="sm"
                                iconName="UserPlus"
                                className="mt-3"
                                onClick={() => onAssignAction(event?.id)}
                              >
                                Assign Action
                              </Button>
                            )}
                          </div>
                        </div>
                        {event?.notes && (
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2">Additional Notes</h4>
                            <p className="text-sm text-muted-foreground">{event?.notes}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Showing 1-{events?.length} of {events?.length} events</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" iconName="ChevronLeft" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" iconName="ChevronRight" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailTable;