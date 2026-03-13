import React from 'react';
import Icon from '../../../components/AppIcon';

const TopExpensesList = ({ expenses }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top Expense Items</h3>
        <Icon name="TrendingUp" size={20} color="var(--color-muted-foreground)" />
      </div>
      <div className="space-y-3 overflow-y-auto max-h-96 pr-2">
        {expenses?.map((expense, index) => (
          <div key={expense?.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors duration-150 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{expense?.name}</p>
              <p className="text-xs text-muted-foreground">{expense?.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">£{expense?.amount?.toFixed(2)}</p>
              <p className={`text-xs ${expense?.change >= 0 ? 'text-error' : 'text-success'}`}>
                {expense?.change >= 0 ? '+' : ''}{expense?.change}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopExpensesList;