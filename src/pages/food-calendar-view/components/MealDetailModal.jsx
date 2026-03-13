import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const MealDetailModal = ({ meal, onClose, onEdit, onDelete }) => {
  if (!meal) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-foreground">Meal Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted transition-colors duration-200"
            aria-label="Close modal"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative h-64 rounded-lg overflow-hidden mb-6">
            <Image
              src={meal?.image}
              alt={meal?.imageAlt}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 flex gap-2">
              {meal?.allergens && meal?.allergens?.length > 0 && (
                <div className="bg-error text-error-foreground px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} />
                  <span>{meal?.allergens?.length} Allergens</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{meal?.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {meal?.type?.charAt(0)?.toUpperCase() + meal?.type?.slice(1)} • {meal?.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">£{meal?.costPerServing?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">per serving</p>
                </div>
              </div>

              <p className="text-sm text-foreground leading-relaxed">
                {meal?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Users" size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Servings</span>
                </div>
                <p className="text-lg font-bold text-foreground">{meal?.servings}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="Clock" size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Prep Time</span>
                </div>
                <p className="text-lg font-bold text-foreground">{meal?.prepTime} min</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <span className="text-xs font-medium text-muted-foreground">Compatible</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {meal?.compatibleResidents}/{meal?.totalResidents}
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="PoundSterling" size={16} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Total Cost</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  £{(meal?.costPerServing * meal?.servings)?.toFixed(2)}
                </p>
              </div>
            </div>

            {meal?.nutritionalInfo && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="Activity" size={16} className="text-primary" />
                  Nutritional Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {meal?.nutritionalInfo?.calories} kcal
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {meal?.nutritionalInfo?.protein}g
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {meal?.nutritionalInfo?.carbs}g
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-sm font-bold text-foreground mt-1">
                      {meal?.nutritionalInfo?.fat}g
                    </p>
                  </div>
                </div>
              </div>
            )}

            {meal?.dietaryRestrictions && meal?.dietaryRestrictions?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="Shield" size={16} className="text-primary" />
                  Dietary Information
                </h4>
                <div className="flex flex-wrap gap-2">
                  {meal?.dietaryRestrictions?.map((restriction, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-secondary/10 text-secondary text-sm font-medium rounded-md border border-secondary/20"
                    >
                      {restriction}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {meal?.allergens && meal?.allergens?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-error" />
                  Allergen Warnings
                </h4>
                <div className="flex flex-wrap gap-2">
                  {meal?.allergens?.map((allergen, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-error/10 text-error text-sm font-medium rounded-md border border-error/20"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {meal?.ingredients && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="ShoppingCart" size={16} className="text-primary" />
                  Ingredients
                </h4>
                <ul className="space-y-2">
                  {meal?.ingredients?.map((ingredient, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                      <Icon name="Check" size={14} className="text-success" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="destructive"
            iconName="Trash2"
            iconPosition="left"
            onClick={() => onDelete(meal?.id)}
          >
            Delete
          </Button>
          <Button
            variant="default"
            iconName="Edit"
            iconPosition="left"
            onClick={() => onEdit(meal?.id)}
          >
            Edit Meal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MealDetailModal;