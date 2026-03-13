import React from 'react';
import Icon from '../../../components/AppIcon';

const KPICard = ({ title, value, subtitle, icon, trend, trendValue, variant = 'default' }) => {
  const getVariantStyles = () => {
    const styles = {
      default: 'bg-card border-border',
      success: 'bg-success/5 border-success/20',
      warning: 'bg-warning/5 border-warning/20',
      error: 'bg-error/5 border-error/20',
      primary: 'bg-primary/5 border-primary/20'
    };
    return styles?.[variant] || styles?.default;
  };

  const getIconColor = () => {
    const colors = {
      default: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      primary: 'text-primary'
    };
    return colors?.[variant] || colors?.default;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-success';
    if (trend === 'down') return 'text-error';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'TrendingUp';
    if (trend === 'down') return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className={`rounded-lg border p-6 card-elevation-1 ${getVariantStyles()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center ${getIconColor()}`}>
          <Icon name={icon} size={24} />
        </div>
      </div>

      {(trend || trendValue) && (
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            <Icon name={getTrendIcon()} size={14} />
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
          <span className="text-xs text-muted-foreground">vs yesterday</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;