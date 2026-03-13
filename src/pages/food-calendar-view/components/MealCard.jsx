import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const MealCard = ({ meal, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'modified':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getMealTypeIcon = (type) => {
    switch (type) {
      case 'breakfast':
        return 'Coffee';
      case 'lunch':
        return 'Utensils';
      case 'dinner':
        return 'UtensilsCrossed';
      case 'snack':
        return 'Cookie';
      default:
        return 'Utensils';
    }
  };

  return (
    <div
      onClick={() => onClick(meal)}
      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer group h-full"
    >
      <div className="relative h-24 overflow-hidden">
        <Image
          src={meal?.image}
          alt={meal?.imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {meal?.allergens && meal?.allergens?.length > 0 && (
            <div className="bg-error text-error-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Icon name="AlertTriangle" size={12} />
              <span>{meal?.allergens?.length}</span>
            </div>
          )}
        </div>
        <div className="absolute bottom-2 left-2">
          <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(meal?.status)}`}>
            {meal?.status}
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon name={getMealTypeIcon(meal?.type)} size={16} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
              {meal?.name}
            </h3>
          </div>
          <span className="text-sm font-bold text-primary whitespace-nowrap">
            £{meal?.costPerServing?.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{meal?.time}</span>
          <span>{meal?.servings} servings</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="Users" size={12} />
            <span>{meal?.compatibleResidents}/{meal?.totalResidents}</span>
          </div>

          {meal?.dietaryRestrictions && meal?.dietaryRestrictions?.length > 0 && (
            <div className="flex items-center gap-1">
              {meal?.dietaryRestrictions?.slice(0, 2)?.map((restriction, index) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 bg-secondary/10 text-secondary text-xs rounded"
                >
                  {restriction}
                </span>
              ))}
              {meal?.dietaryRestrictions?.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{meal?.dietaryRestrictions?.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {meal?.preparationStatus && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Preparation</span>
              <span className="font-medium text-foreground">
                {meal?.preparationStatus?.completed}/{meal?.preparationStatus?.total} items
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(meal?.preparationStatus?.completed / meal?.preparationStatus?.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealCard;