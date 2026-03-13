import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import supabase from '../../../services/supabaseClient';

const MealForm = ({ meal, onClose, onSave, userRole, staffCareHomeId, staffCareHomeName, adminCareHomes = [] }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Breakfast',
    description: '',
    ingredients: [{ name: '', amount: '', unit: 'g' }],
    allergens: [],
    customAllergen: '',
    careHomeId: null, // null = global, number = specific care home
    preparationInstructions: '',
    costPerPerson: '',
    imageUrl: '',
    nutritionalInfo: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      fiber: '',
      sodium: '',
    },
    customNutrition: [],
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [customNutritionName, setCustomNutritionName] = useState('');
  const [customNutritionValue, setCustomNutritionValue] = useState('');
  const [customNutritionUnit, setCustomNutritionUnit] = useState('g');

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (meal) {
      setFormData({
        name: meal.name || '',
        type: meal.type || 'Breakfast',
        description: meal.description || '',
        ingredients: (() => {
          try {
            if (Array.isArray(meal.ingredients)) {
              return meal.ingredients.map(i => ({
                name: i.name || '',
                amount: i.amount ?? i.quantity ?? '',
                unit: i.unit || 'g'
              }));
            }
            if (typeof meal.ingredients === 'string' && meal.ingredients.trim()) {
              const parsed = JSON.parse(meal.ingredients);
              if (Array.isArray(parsed)) {
                return parsed.map(i => ({
                  name: i.name || '',
                  amount: i.amount ?? i.quantity ?? '',
                  unit: i.unit || 'g'
                }));
              }
              return meal.ingredients
                .split(/\n|,/)
                .map(item => ({ name: item.trim(), amount: '', unit: 'g' }))
                .filter(i => i.name);
            }
          } catch (err) {
            console.warn('Failed to parse ingredients, falling back:', err);
          }
          return [{ name: '', amount: '', unit: 'g' }];
        })(),
        allergens: meal.allergens || [],
        customAllergen: '',
        careHomeId: meal.care_home_id ?? meal.careHomeId ?? null,
        preparationInstructions: meal.preparation_instructions || meal.preparationInstructions || '',
        costPerPerson: meal.cost_per_person ?? meal.costPerPerson ?? '',
        imageUrl: meal.image_url || meal.imageUrl || '',
        nutritionalInfo: {
          calories: meal.nutritional_info?.calories ?? meal.nutritionalInfo?.calories ?? '',
          protein: meal.nutritional_info?.protein ?? meal.nutritionalInfo?.protein ?? '',
          carbs: meal.nutritional_info?.carbs ?? meal.nutritionalInfo?.carbs ?? '',
          fat: meal.nutritional_info?.fat ?? meal.nutritionalInfo?.fat ?? '',
          fiber: meal.nutritional_info?.fiber ?? meal.nutritionalInfo?.fiber ?? '',
          sodium: meal.nutritional_info?.sodium ?? meal.nutritionalInfo?.sodium ?? '',
        },
        customNutrition: meal.custom_nutrition || meal.customNutrition || [],
      });
      if (meal.image_url) {
        setImagePreview(meal.image_url);
      }
    } else {
      // For staff users, default careHomeId to their assigned home
      if (userRole === 'staff' && staffCareHomeId) {
        setFormData(prev => ({ ...prev, careHomeId: staffCareHomeId }));
      }
    }
  }, [meal]);

  const [careHomes, setCareHomes] = useState(adminCareHomes);
  useEffect(() => {
    // Prefer list from parent; if empty and admin, fetch here as fallback
    if (adminCareHomes && adminCareHomes.length > 0) {
      setCareHomes(adminCareHomes);
      return;
    }
    const loadCareHomes = async () => {
      if (userRole === 'admin') {
        try {
          const { data, error } = await supabase
            .from('care_homes')
            .select('id, name')
            .order('name', { ascending: true });
          if (error) throw error;
          setCareHomes(data || []);
        } catch (err) {
          console.error('Error loading care homes:', err);
        }
      }
    };
    loadCareHomes();
  }, [userRole, adminCareHomes]);

  const allergensList = [
    'Gluten', 'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 
    'Peanuts', 'Soy', 'Wheat', 'Sesame', 'Mustard', 'Celery'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNutritionalChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      nutritionalInfo: {
        ...prev.nutritionalInfo,
        [name]: value
      }
    }));
  };

  const handleAllergenToggle = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  const handleAddCustomAllergen = () => {
    if (formData.customAllergen.trim() && !formData.allergens.includes(formData.customAllergen.trim())) {
      setFormData(prev => ({
        ...prev,
        allergens: [...prev.allergens, prev.customAllergen.trim()],
        customAllergen: ''
      }));
    }
  };

  const handleRemoveAllergen = (allergen) => {
    setFormData(prev => ({
      ...prev,
      allergens: prev.allergens.filter(a => a !== allergen)
    }));
  };

  const handleAddCustomNutrition = () => {
    if (customNutritionName.trim() && customNutritionValue) {
      setFormData(prev => ({
        ...prev,
        customNutrition: [
          ...prev.customNutrition,
          { name: customNutritionName.trim(), value: customNutritionValue, unit: customNutritionUnit }
        ]
      }));
      setCustomNutritionName('');
      setCustomNutritionValue('');
      setCustomNutritionUnit('g');
    }
  };

  const handleRemoveCustomNutrition = (index) => {
    setFormData(prev => ({
      ...prev,
      customNutrition: prev.customNutrition.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => {
      const next = Array.isArray(prev.ingredients) ? [...prev.ingredients] : [];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, ingredients: next };
    });
  };

  const addIngredientRow = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { name: '', amount: '', unit: 'g' }],
    }));
  };

  const removeIngredientRow = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index),
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setUploadError('');
    if (!file) {
      setImageFile(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    
    // Basic validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Meal name is required';
    if (!formData.costPerPerson) newErrors.costPerPerson = 'Cost per person is required';

    const cleanedIngredients = (formData.ingredients || []).map(i => ({
      name: (i.name || '').trim(),
      amount: parseFloat(String(i.amount || '').replace(/,/g, '.')),
      unit: (i.unit || '').trim()
    })).filter(i => i.name);

    if (cleanedIngredients.length === 0) newErrors.ingredients = 'Add at least one ingredient';
    if (cleanedIngredients.some(i => !i.amount || isNaN(i.amount) || i.amount <= 0)) newErrors.ingredients = 'Add a numeric amount per serving for each ingredient';
    if (cleanedIngredients.some(i => !i.unit)) newErrors.ingredients = 'Select a unit for each ingredient';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let finalImageUrl = formData.imageUrl || null;

    if (imageFile) {
      try {
        setIsUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `meal-${Date.now()}.${fileExt}`;
        const filePath = `meals/${fileName}`;

        const { data: uploadData, error: uploadErrorResp } = await supabase.storage
          .from('meal-images')
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

        if (uploadErrorResp) throw uploadErrorResp;

        const { data: publicData } = supabase.storage
          .from('meal-images')
          .getPublicUrl(uploadData.path);

        finalImageUrl = publicData.publicUrl;
        setIsUploading(false);
      } catch (err) {
        console.error('Image upload failed:', err);
        setUploadError('Image upload failed. Please try again.');
        setIsUploading(false);
        return;
      }
    }

    onSave({ ...formData, ingredients: cleanedIngredients, imageUrl: finalImageUrl });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full my-8 mt-32" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Icon name={meal ? 'Edit' : 'Plus'} size={24} />
              {meal ? 'Edit Meal' : 'Add New Meal'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Icon name="X" size={24} className="text-slate-700 dark:text-slate-300" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Meal Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                  } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all`}
                  placeholder="e.g., Traditional Full English Breakfast"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Meal Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Supper">Supper</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Special">Special</option>
                  <option value="Festive">Festive</option>
                  <option value="Side">Side</option>
                </select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                Meal Image
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a photo of the meal. PNG or JPG under 2MB works best.
              </p>
              <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="w-full lg:w-1/2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-200"
                  />
                  {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
                  {isUploading && <p className="text-xs text-slate-500 mt-1">Uploading image...</p>}
                </div>
                <div className="w-full lg:w-1/2">
                  {imagePreview ? (
                    <div className="relative h-48 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40">
                      <img src={imagePreview} alt="Meal preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-48 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Icon name="Image" size={28} />
                        <span className="text-sm">No image selected</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Care Home Display / Selector */}
            {userRole === 'admin' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Care Home
                </label>
                <select
                  name="careHomeId"
                  value={formData.careHomeId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, careHomeId: e.target.value ? e.target.value : null }))}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                >
                  <option value="">Global (All Care Homes)</option>
                  {careHomes.map(home => (
                    <option key={home.id} value={home.id}>{home.name}</option>
                  ))}
                </select>
                {careHomes.length === 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">No care homes found. Ensure your account has access and the care_homes table has data.</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Select a specific care home or leave as Global for all homes
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Care Home
                </label>
                <div className="px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white">
                  {staffCareHomeName || 'Assigned care home only'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You can add meals only for your assigned care home.
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                placeholder="Brief description of the meal..."
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Cost Per Person (£) *
              </label>
              <input
                type="number"
                step="0.01"
                name="costPerPerson"
                value={formData.costPerPerson}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border-2 ${
                  errors.costPerPerson ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                } bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all`}
                placeholder="0.00"
              />
              {errors.costPerPerson && <p className="text-red-500 text-xs mt-1">{errors.costPerPerson}</p>}
            </div>

            {/* Ingredients */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ingredients</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Add each ingredient with quantity per serving.</p>
              </div>

              <div className="space-y-2 mb-3">
                {(formData.ingredients || []).map((ing, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3"
                  >
                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Ingredient</label>
                      <input
                        type="text"
                        value={ing.name}
                        onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                        placeholder="e.g., Chicken breast"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Amount / serving</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ing.amount}
                        onChange={(e) => handleIngredientChange(idx, 'amount', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                        placeholder="e.g., 120"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Unit</label>
                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">L</option>
                        <option value="pcs">pcs</option>
                        <option value="slices">slices</option>
                        <option value="cups">cups</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                        <option value="portions">portions</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="w-full md:w-auto px-3 py-2 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                        disabled={(formData.ingredients || []).length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add Ingredient Button */}
              <button
                type="button"
                onClick={addIngredientRow}
                className="w-full px-3 py-2.5 rounded-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
              >
                <Icon name="Plus" size={16} /> Add ingredient
              </button>

              {errors.ingredients && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><Icon name="AlertTriangle" size={14} /> {errors.ingredients}</p>}
            </div>

            {/* Allergens */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Allergens
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {allergensList.map((allergen) => (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => handleAllergenToggle(allergen)}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                      formData.allergens.includes(allergen)
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {allergen}
                  </button>
                ))}
              </div>
              
              {/* Selected Allergens with Remove */}
              {formData.allergens.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Selected:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium flex items-center gap-2"
                      >
                        {allergen}
                        <button
                          type="button"
                          onClick={() => handleRemoveAllergen(allergen)}
                          className="hover:bg-red-600 rounded-full p-0.5"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Custom Allergen */}
              <div className="flex gap-2">
                <input
                  type="text"
                  name="customAllergen"
                  value={formData.customAllergen}
                  onChange={handleChange}
                  placeholder="Add custom allergen..."
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAllergen())}
                />
                <button
                  type="button"
                  onClick={handleAddCustomAllergen}
                  className="px-4 py-2 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all flex items-center gap-2"
                >
                  <Icon name="Plus" size={16} />
                  Add
                </button>
              </div>
            </div>

            {/* Nutritional Information */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Nutritional Information (per serving)
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'calories', label: 'Calories', unit: 'kcal' },
                  { name: 'protein', label: 'Protein', unit: 'g' },
                  { name: 'carbs', label: 'Carbohydrates', unit: 'g' },
                  { name: 'fat', label: 'Fat', unit: 'g' },
                  { name: 'fiber', label: 'Fiber', unit: 'g' },
                  { name: 'sodium', label: 'Sodium', unit: 'mg' },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {field.label} ({field.unit})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name={field.name}
                      value={formData.nutritionalInfo[field.name]}
                      onChange={handleNutritionalChange}
                      className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              
              {/* Custom Nutrition Fields */}
              {formData.customNutrition.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Custom Nutrition:</p>
                  <div className="space-y-2">
                    {formData.customNutrition.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                        <span className="flex-1 text-sm text-slate-900 dark:text-white">
                          {item.name}: {item.value}{item.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomNutrition(index)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add Custom Nutrition */}
              <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Add Custom Nutrition Field</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={customNutritionName}
                    onChange={(e) => setCustomNutritionName(e.target.value)}
                    placeholder="Name (e.g., Vitamin C)"
                    className="px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={customNutritionValue}
                    onChange={(e) => setCustomNutritionValue(e.target.value)}
                    placeholder="Value"
                    className="px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <div className="flex gap-2">
                    <select
                      value={customNutritionUnit}
                      onChange={(e) => setCustomNutritionUnit(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="g">g</option>
                      <option value="mg">mg</option>
                      <option value="mcg">mcg</option>
                      <option value="kcal">kcal</option>
                      <option value="%">%</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCustomNutrition}
                      className="px-3 py-2 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-all"
                    >
                      <Icon name="Plus" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preparation Instructions */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Preparation Instructions
              </label>
              <textarea
                name="preparationInstructions"
                value={formData.preparationInstructions}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
                placeholder="Step-by-step preparation instructions..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Icon name="Save" size={20} />
              {meal ? 'Update Meal' : 'Save Meal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MealForm;
