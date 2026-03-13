import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const CostAnalyticsSummary = ({ weeklyData, budgetData }) => {
  const navigate = useNavigate();

  const calculateVariance = () => {
    const variance = budgetData?.budget - weeklyData?.totalSpent;
    const percentage = ((variance / budgetData?.budget) * 100)?.toFixed(1);
    return { amount: Math.abs(variance), percentage: Math.abs(percentage), isOver: variance < 0 };
  };

  const variance = calculateVariance();

  const handleViewAnalytics = () => {
    navigate('/cost-analytics');
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 card-elevation-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="PoundSterling" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Cost Analytics</h2>
            <p className="text-sm text-muted-foreground">Weekly summary</p>
          </div>
        </div>
        <Button variant="outline" size="sm" iconName="BarChart3" iconPosition="right" onClick={handleViewAnalytics}>
          View Analytics
        </Button>
      </div>
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Weekly Budget</span>
            <span className="text-lg font-bold text-foreground">£{budgetData?.budget?.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
            <span className="text-lg font-bold text-foreground">£{weeklyData?.totalSpent?.toFixed(2)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                variance?.isOver ? 'bg-error' : 'bg-success'
              }`}
              style={{ width: `${Math.min((weeklyData?.totalSpent / budgetData?.budget) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {((weeklyData?.totalSpent / budgetData?.budget) * 100)?.toFixed(1)}% utilized
            </span>
            <span className={`text-xs font-medium ${variance?.isOver ? 'text-error' : 'text-success'}`}>
              {variance?.isOver ? 'Over' : 'Under'} by £{variance?.amount?.toFixed(2)} ({variance?.percentage}%)
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Daily Breakdown</h3>
          {weeklyData?.dailyBreakdown?.map((day, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <Icon name="Calendar" size={14} className="text-muted-foreground" />
                <span className="text-sm text-foreground">{day?.day}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">£{day?.amount?.toFixed(2)}</span>
                <div className={`flex items-center gap-1 ${day?.trend === 'up' ? 'text-error' : 'text-success'}`}>
                  <Icon name={day?.trend === 'up' ? 'TrendingUp' : 'TrendingDown'} size={12} />
                  <span className="text-xs font-medium">{day?.change}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <Icon name="Lightbulb" size={16} className="text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Cost Optimization Tip</p>
              <p className="text-xs text-muted-foreground">
                Consider bulk purchasing for frequently used ingredients to reduce costs by up to 15%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalyticsSummary;