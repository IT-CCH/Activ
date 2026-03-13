import React from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';

const MealImageSection = ({ meal }) => {
  return (
    <div className="bg-card rounded-lg overflow-hidden card-elevation-2">
      <div className="relative h-80 overflow-hidden">
        <Image
          src={meal?.image}
          alt={meal?.imageAlt}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          {meal?.isNew && (
            <span className="px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-full">
              New Recipe
            </span>
          )}
          {meal?.isPopular && (
            <span className="px-3 py-1 bg-warning text-warning-foreground text-xs font-medium rounded-full flex items-center gap-1">
              <Icon name="TrendingUp" size={14} />
              Popular
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{meal?.name}</h1>
            <p className="text-sm text-muted-foreground">{meal?.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">£{meal?.totalCost?.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">per serving</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="Clock" size={20} color="var(--color-primary)" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Prep Time</div>
              <div className="text-sm font-medium text-foreground">{meal?.prepTime} min</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon name="Flame" size={20} color="var(--color-accent)" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Calories</div>
              <div className="text-sm font-medium text-foreground">{meal?.calories} kcal</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Icon name="Users" size={20} color="var(--color-warning)" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Servings</div>
              <div className="text-sm font-medium text-foreground">{meal?.servings}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Icon name="ChefHat" size={20} color="var(--color-secondary)" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Difficulty</div>
              <div className="text-sm font-medium text-foreground">{meal?.difficulty}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealImageSection;