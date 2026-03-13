import React from 'react';
import Icon from '../AppIcon';
import Button from '../ui/Button';

const QuickActionPanel = ({ mealId, onClose, onApprove, onModify, onReject }) => {
  const handleApprove = () => {
    if (onApprove) {
      onApprove(mealId);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleModify = () => {
    if (onModify) {
      onModify(mealId);
    }
  };

  const handleReject = () => {
    if (onReject) {
      onReject(mealId);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="quick-action-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors duration-200"
          aria-label="Close quick actions"
        >
          <Icon name="X" size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          iconName="Check"
          iconPosition="left"
          onClick={handleApprove}
          fullWidth
        >
          Approve Meal
        </Button>

        <Button
          variant="outline"
          iconName="Edit"
          iconPosition="left"
          onClick={handleModify}
          fullWidth
        >
          Modify Details
        </Button>

        <Button
          variant="destructive"
          iconName="X"
          iconPosition="left"
          onClick={handleReject}
          fullWidth
        >
          Reject Meal
        </Button>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Info" size={14} />
            <span>Actions will be logged for audit</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Clock" size={14} />
            <span>Last updated: {new Date()?.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionPanel;