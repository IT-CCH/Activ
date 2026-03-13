import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const ResidentCompatibility = ({ compatibilityData }) => {
  const [expandedResident, setExpandedResident] = useState(null);

  const getCompatibilityColor = (status) => {
    switch (status) {
      case 'compatible':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'incompatible':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getCompatibilityIcon = (status) => {
    switch (status) {
      case 'compatible':
        return 'CheckCircle2';
      case 'warning':
        return 'AlertTriangle';
      case 'incompatible':
        return 'XCircle';
      default:
        return 'HelpCircle';
    }
  };

  const getCompatibilityText = (status) => {
    switch (status) {
      case 'compatible':
        return 'Fully Compatible';
      case 'warning':
        return 'Requires Modification';
      case 'incompatible':
        return 'Not Suitable';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-card rounded-lg card-elevation-1">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Users" size={20} color="var(--color-primary)" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Resident Compatibility</h2>
        </div>
        <p className="text-sm text-muted-foreground">Dietary restriction and medical condition analysis</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-success/10 rounded-lg">
            <div className="text-2xl font-bold text-success">{compatibilityData?.summary?.compatible}</div>
            <div className="text-xs text-muted-foreground mt-1">Compatible</div>
          </div>
          <div className="text-center p-4 bg-warning/10 rounded-lg">
            <div className="text-2xl font-bold text-warning">{compatibilityData?.summary?.warning}</div>
            <div className="text-xs text-muted-foreground mt-1">Need Modification</div>
          </div>
          <div className="text-center p-4 bg-error/10 rounded-lg">
            <div className="text-2xl font-bold text-error">{compatibilityData?.summary?.incompatible}</div>
            <div className="text-xs text-muted-foreground mt-1">Incompatible</div>
          </div>
        </div>

        <div className="space-y-3">
          {compatibilityData?.residents?.map((resident) => (
            <div key={resident?.id} className={`border rounded-lg overflow-hidden transition-all ${getCompatibilityColor(resident?.status)}`}>
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedResident(expandedResident === resident?.id ? null : resident?.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name={getCompatibilityIcon(resident?.status)} size={20} />
                    <div>
                      <div className="font-medium text-sm">{resident?.name}</div>
                      <div className="text-xs opacity-80">Room {resident?.room}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{getCompatibilityText(resident?.status)}</span>
                    <Icon name={expandedResident === resident?.id ? 'ChevronUp' : 'ChevronDown'} size={16} />
                  </div>
                </div>
              </div>

              {expandedResident === resident?.id && (
                <div className="px-4 pb-4 border-t border-current/20">
                  <div className="mt-4 space-y-3">
                    {resident?.dietaryRestrictions?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2 flex items-center gap-2">
                          <Icon name="ShieldAlert" size={14} />
                          Dietary Restrictions
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {resident?.dietaryRestrictions?.map((restriction, idx) => (
                            <span key={idx} className="px-2 py-1 bg-background/50 text-xs rounded">
                              {restriction}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resident?.allergens?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2 flex items-center gap-2">
                          <Icon name="AlertCircle" size={14} />
                          Allergen Alerts
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {resident?.allergens?.map((allergen, idx) => (
                            <span key={idx} className="px-2 py-1 bg-error/20 text-xs rounded font-medium">
                              {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {resident?.medicalConditions?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium mb-2 flex items-center gap-2">
                          <Icon name="Stethoscope" size={14} />
                          Medical Conditions
                        </div>
                        <div className="space-y-1">
                          {resident?.medicalConditions?.map((condition, idx) => (
                            <div key={idx} className="text-xs bg-background/50 p-2 rounded">
                              <div className="font-medium">{condition?.name}</div>
                              {condition?.requirement && (
                                <div className="text-muted-foreground mt-1">Required: {condition?.requirement}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resident?.modifications && (
                      <div className="mt-3 p-3 bg-background/50 rounded">
                        <div className="text-xs font-medium mb-1 flex items-center gap-2">
                          <Icon name="Wrench" size={14} />
                          Suggested Modifications
                        </div>
                        <div className="text-xs">{resident?.modifications}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResidentCompatibility;