import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import { Checkbox } from '../../../components/ui/CheckBox';

const PreparationChecklist = ({ checklist, onUpdateStatus }) => {
  const [expandedStage, setExpandedStage] = useState(null);

  const getStageProgress = (stage) => {
    const completed = stage?.tasks?.filter(task => task?.completed)?.length;
    return (completed / stage?.tasks?.length) * 100;
  };

  const getStageStatus = (stage) => {
    const progress = getStageProgress(stage);
    if (progress === 100) return { icon: 'CheckCircle2', color: 'text-success', bg: 'bg-success/10' };
    if (progress > 0) return { icon: 'Clock', color: 'text-warning', bg: 'bg-warning/10' };
    return { icon: 'Circle', color: 'text-muted-foreground', bg: 'bg-muted' };
  };

  const handleTaskToggle = (stageId, taskId) => {
    if (onUpdateStatus) {
      onUpdateStatus(stageId, taskId);
    }
  };

  return (
    <div className="bg-card rounded-lg card-elevation-1">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon name="ClipboardCheck" size={20} color="var(--color-accent)" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Preparation Workflow</h2>
        </div>
        <p className="text-sm text-muted-foreground">Track cooking stages and staff confirmations</p>
      </div>
      <div className="p-6 space-y-4">
        {checklist?.map((stage) => {
          const status = getStageStatus(stage);
          const progress = getStageProgress(stage);
          const isExpanded = expandedStage === stage?.id;

          return (
            <div key={stage?.id} className="border border-border rounded-lg overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedStage(isExpanded ? null : stage?.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${status?.bg} flex items-center justify-center`}>
                      <Icon name={status?.icon} size={20} className={status?.color} />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">{stage?.name}</div>
                      <div className="text-xs text-muted-foreground">{stage?.estimatedTime} minutes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">{progress?.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                    <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={20} className="text-muted-foreground" />
                  </div>
                </div>

                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border">
                  <div className="mt-4 space-y-3">
                    {stage?.tasks?.map((task) => (
                      <div key={task?.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <Checkbox
                          checked={task?.completed}
                          onChange={() => handleTaskToggle(stage?.id, task?.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${task?.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {task?.description}
                          </div>
                          {task?.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{task?.notes}</div>
                          )}
                          {task?.completedBy && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Icon name="User" size={12} />
                              <span>Completed by {task?.completedBy} at {task?.completedAt}</span>
                            </div>
                          )}
                        </div>
                        {task?.critical && (
                          <span className="px-2 py-1 bg-error/10 text-error text-xs font-medium rounded">
                            Critical
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {stage?.notes && (
                    <div className="mt-4 p-3 bg-primary/5 border-l-4 border-primary rounded">
                      <div className="flex items-start gap-2">
                        <Icon name="Info" size={16} className="text-primary mt-0.5" />
                        <div className="text-xs text-foreground">{stage?.notes}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-6 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Clock" size={16} />
            <span>Last updated: {new Date()?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Users" size={16} />
            <span>3 staff members active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreparationChecklist;