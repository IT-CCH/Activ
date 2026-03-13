import React, { useEffect, useState } from 'react';
import Icon from '../../../components/AppIcon';
import supabase from '../../../services/supabaseClient';

const MealsList = ({ searchQuery, filterType, filterCareHome, onEdit, onView, onDelete, userRole, staffCareHomeId, refreshSignal }) => {
  const [careHomes, setCareHomes] = useState([]);
  const [meals, setMeals] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ data: homes }, { data: mealsData }] = await Promise.all([
          supabase.from('care_homes').select('id, name').order('name', { ascending: true }),
          supabase.from('meals').select('*').order('created_at', { ascending: false })
        ]);
        setCareHomes(homes || []);
        setMeals(mealsData || []);
      } catch (err) {
        console.error('Error loading meals/care homes:', err);
      }
    };
    loadData();
  }, [refreshSignal]);

  const filteredMeals = meals.filter(meal => {
    const query = searchQuery.toLowerCase();
    const mealCareHomeId = meal.care_home_id === null ? null : String(meal.care_home_id);
    const staffHomeId = staffCareHomeId ? String(staffCareHomeId) : null;

    const matchesSearch = meal.name.toLowerCase().includes(query) ||
                         meal.description?.toLowerCase().includes(query) ||
                         (Array.isArray(meal.allergens) && meal.allergens.some(a => a.toLowerCase().includes(query)));
    const matchesType = filterType === 'All' || meal.type === filterType;
    
    // Staff can only see: 1) Global meals (care_home_id === null) OR 2) Their own care home meals
    const matchesCareHome = userRole === 'admin' || 
                           mealCareHomeId === null || 
                           (staffHomeId !== null && mealCareHomeId === staffHomeId);
    
    // Admin care home filter
    let matchesCareHomeFilter = true;
    if (userRole === 'admin' && filterCareHome && filterCareHome !== 'All') {
      if (filterCareHome === 'Global') {
        matchesCareHomeFilter = mealCareHomeId === null;
      } else {
        matchesCareHomeFilter = mealCareHomeId === String(filterCareHome);
      }
    }
    
    return matchesSearch && matchesType && matchesCareHome && matchesCareHomeFilter;
  });

  const getMealIcon = (type) => {
    switch (type) {
      case 'Breakfast': return '🍳';
      case 'Lunch': return '🥗';
        // Dinner removed
      case 'Supper': return '🫖';
      case 'Side': return '🥔';
      default: return '🍴';
    }
  };

  const getMealColor = (type) => {
    switch (type) {
      case 'Breakfast': return 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700';
      case 'Lunch': return 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700';
        // Dinner removed
      case 'Supper': return 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700';
      case 'Side': return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700';
      default: return 'bg-slate-50 dark:bg-slate-950/20 border-slate-300 dark:border-slate-700';
    }
  };

  if (filteredMeals.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center">
        <Icon name="UtensilsCrossed" size={48} className="mx-auto mb-4 text-slate-400 dark:text-slate-600" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No meals found</h3>
        <p className="text-slate-600 dark:text-slate-400">
          {searchQuery ? 'Try adjusting your search or filter criteria' : 'Click "Add New Meal" to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredMeals.map((meal) => (
        <div
          key={meal.id}
          className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border-2 ${getMealColor(meal.type)} hover:shadow-xl transition-all`}
        >
          {/* Image */}
          <div className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
            {meal.image_url ? (
              <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-6xl">{getMealIcon(meal.type)}</span>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {meal.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {meal.type}
                  </span>
                  {meal.care_home_id ? (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <Icon name="Building2" size={12} />
                      {careHomes.find(h => h.id === meal.care_home_id)?.name}
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                      <Icon name="Globe" size={12} />
                      Global
                    </span>
                  )}
                </div>
              </div>
            </div>

            {meal.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                {meal.description}
              </p>
            )}

            {/* Cost */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                £{Number(meal.cost_per_person || 0).toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">per person</span>
            </div>

            {/* Nutritional Info */}
            {meal.nutritional_info && (
              <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Calories</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{meal.nutritional_info.calories}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Protein</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{meal.nutritional_info.protein}g</p>
                </div>
              </div>
            )}

            {/* Allergens */}
            {meal.allergens && meal.allergens.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Allergens:</p>
                <div className="flex flex-wrap gap-1">
                  {meal.allergens.slice(0, 3).map((allergen) => (
                    <span
                      key={allergen}
                      className="px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    >
                      {allergen}
                    </span>
                  ))}
                  {meal.allergens.length > 3 && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      +{meal.allergens.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              {(userRole === 'admin' || meal.care_home_id !== null) && (
                <button
                  onClick={() => onEdit(meal)}
                  className="flex-1 px-4 py-2 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-all flex items-center justify-center gap-2"
                >
                  <Icon name="Edit" size={16} />
                  Edit
                </button>
              )}
              <button
                onClick={() => onView(meal)}
                className={`px-4 py-2 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2 ${
                  userRole === 'staff' && meal.care_home_id === null ? 'flex-1' : ''
                }`}
              >
                <Icon name="Eye" size={16} />
                View
              </button>
              {(userRole === 'admin' || meal.care_home_id !== null) && (
                <button
                  onClick={() => onDelete(meal)}
                  className="px-4 py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all flex items-center gap-2"
                >
                  <Icon name="Trash2" size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MealsList;
