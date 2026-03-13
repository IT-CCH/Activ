import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const OptimizationRecommendations = ({ recommendations }) => {
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high':
        return 'text-success bg-success/10';
      case 'medium':
        return 'text-warning bg-warning/10';
      case 'low':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Cost Optimization</h3>
        <Icon name="Lightbulb" size={20} color="var(--color-warning)" />
      </div>
      <div className="space-y-4">
        {recommendations?.map((rec) => (
          <div key={rec?.id} className="border border-border rounded-lg p-4 hover:border-primary transition-colors duration-200">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground mb-1">{rec?.title}</h4>
                <p className="text-xs text-muted-foreground">{rec?.description}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded ${getImpactColor(rec?.impact)}`}>
                {rec?.impact?.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="TrendingDown" size={16} color="var(--color-success)" />
                <span className="text-sm font-semibold text-success">
                  Save £{rec?.potentialSavings?.toFixed(2)}/month
                </span>
              </div>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OptimizationRecommendations;