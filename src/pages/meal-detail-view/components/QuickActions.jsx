import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const QuickActions = ({ mealId, onAction }) => {
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);
  const [modificationReason, setModificationReason] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [substituteIngredient, setSubstituteIngredient] = useState('');

  const ingredientOptions = [
    { value: 'chicken', label: 'Chicken Breast' },
    { value: 'carrots', label: 'Carrots' },
    { value: 'potatoes', label: 'Potatoes' },
    { value: 'onions', label: 'Onions' }
  ];

  const substituteOptions = [
    { value: 'turkey', label: 'Turkey Breast' },
    { value: 'tofu', label: 'Firm Tofu' },
    { value: 'quorn', label: 'Quorn Pieces' }
  ];

  const handleApprove = () => {
    if (onAction) {
      onAction('approve', mealId);
    }
  };

  const handleReject = () => {
    if (onAction) {
      onAction('reject', mealId);
    }
  };

  const handleModify = () => {
    if (modificationReason?.trim()) {
      if (onAction) {
        onAction('modify', mealId, { reason: modificationReason });
      }
      setShowModifyModal(false);
      setModificationReason('');
    }
  };

  const handleSubstitute = () => {
    if (selectedIngredient && substituteIngredient) {
      if (onAction) {
        onAction('substitute', mealId, {
          original: selectedIngredient,
          substitute: substituteIngredient
        });
      }
      setShowSubstituteModal(false);
      setSelectedIngredient('');
      setSubstituteIngredient('');
    }
  };

  const handleExport = () => {
    if (onAction) {
      onAction('export', mealId);
    }
  };

  return (
    <>
      <div className="bg-card rounded-lg card-elevation-1 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Zap" size={20} color="var(--color-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        </div>

        <div className="space-y-3">
          <Button
            variant="default"
            iconName="CheckCircle2"
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
            onClick={() => setShowModifyModal(true)}
            fullWidth
          >
            Request Modification
          </Button>

          <Button
            variant="outline"
            iconName="RefreshCw"
            iconPosition="left"
            onClick={() => setShowSubstituteModal(true)}
            fullWidth
          >
            Substitute Ingredient
          </Button>

          <Button
            variant="destructive"
            iconName="XCircle"
            iconPosition="left"
            onClick={handleReject}
            fullWidth
          >
            Reject Meal
          </Button>

          <div className="pt-3 border-t border-border">
            <Button
              variant="secondary"
              iconName="Download"
              iconPosition="left"
              onClick={handleExport}
              fullWidth
            >
              Export Preparation Guide
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Icon name="Info" size={14} />
              <span>All actions are logged for audit compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Clock" size={14} />
              <span>Last updated: {new Date()?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="Shield" size={14} />
              <span>CQC compliant tracking enabled</span>
            </div>
          </div>
        </div>
      </div>
      {showModifyModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-card rounded-lg card-elevation-modal max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Request Modification</h3>
              <button
                onClick={() => setShowModifyModal(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <Input
              label="Modification Reason"
              type="text"
              placeholder="Enter reason for modification..."
              value={modificationReason}
              onChange={(e) => setModificationReason(e?.target?.value)}
              required
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModifyModal(false)} fullWidth>
                Cancel
              </Button>
              <Button variant="default" onClick={handleModify} fullWidth>
                Submit Request
              </Button>
            </div>
          </div>
        </div>
      )}
      {showSubstituteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-card rounded-lg card-elevation-modal max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Substitute Ingredient</h3>
              <button
                onClick={() => setShowSubstituteModal(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
            <Select
              label="Original Ingredient"
              options={ingredientOptions}
              value={selectedIngredient}
              onChange={setSelectedIngredient}
              placeholder="Select ingredient to replace"
              required
              className="mb-4"
            />
            <Select
              label="Substitute With"
              options={substituteOptions}
              value={substituteIngredient}
              onChange={setSubstituteIngredient}
              placeholder="Select substitute ingredient"
              required
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSubstituteModal(false)} fullWidth>
                Cancel
              </Button>
              <Button variant="default" onClick={handleSubstitute} fullWidth>
                Apply Substitution
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickActions;