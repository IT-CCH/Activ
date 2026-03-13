import React from 'react';
import Icon from '../../../components/AppIcon';

const ComplianceScoreCard = ({ title, score, benchmark, status, icon, trend }) => {
  const getStatusColor = () => {
    if (score >= benchmark) return 'bg-success/10 text-success border-success/20';
    if (score >= benchmark * 0.8) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-error/10 text-error border-error/20';
  };

  const getProgressColor = () => {
    if (score >= benchmark) return 'bg-success';
    if (score >= benchmark * 0.8) return 'bg-warning';
    return 'bg-error';
  };

  const getTrendIcon = () => {
    if (trend > 0) return 'TrendingUp';
    if (trend < 0) return 'TrendingDown';
    return 'Minus';
  };

  const getTrendColor = () => {
    if (trend > 0) return 'text-success';
    if (trend < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor()}`}>
            <Icon name={icon} size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-semibold text-foreground">{score}%</span>
              <span className="text-xs text-muted-foreground">/ {benchmark}% target</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${getTrendColor()}`}>
          <Icon name={getTrendIcon()} size={16} />
          <span className="text-sm font-medium">{Math.abs(trend)}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress to target</span>
          <span className="font-medium text-foreground">{Math.min(100, Math.round((score / benchmark) * 100))}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${Math.min(100, (score / benchmark) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className={`font-medium ${score >= benchmark ? 'text-success' : score >= benchmark * 0.8 ? 'text-warning' : 'text-error'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ComplianceScoreCard;