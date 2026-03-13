import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import supabase from '../../services/supabaseClient';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import MealForm from './components/MealForm';
import MealsList from './components/MealsList';

const MealsManagement = () => {
  usePageTitle('Meals Management');
  const { role, careHomeId, user, isAdmin, isCareHomeManager, isSuperAdmin, organizationId } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterCareHome, setFilterCareHome] = useState('All');
  const [viewingMeal, setViewingMeal] = useState(null);
  const [careHomeName, setCareHomeName] = useState('');
  const [refreshMealsTick, setRefreshMealsTick] = useState(0);
  const [adminCareHomes, setAdminCareHomes] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [isBulkUploading, setIsBulkUploading] = useState(false);

  useEffect(() => {
    const fetchCareHomeName = async () => {
      if ((role === 'staff' || isCareHomeManager) && careHomeId) {
        try {
          const { data, error } = await supabase
            .from('care_homes')
            .select('name')
            .eq('id', careHomeId)
            .single();
          if (error) throw error;
          setCareHomeName(data?.name || '');
        } catch (err) {
          console.error('Error fetching care home name:', err);
        }
      }
    };
    fetchCareHomeName();
  }, [role, careHomeId]);

  useEffect(() => {
    const fetchAdminCareHomes = async () => {
      if (isAdmin) {
        try {
          let query = supabase.from('care_homes').select('id, name, organization_id').order('name', { ascending: true });
          // If Super Admin is scoped to an organization, limit care homes
          if (isSuperAdmin && organizationId) {
            query = query.eq('organization_id', organizationId);
          }
          const { data, error } = await query;
          if (error) throw error;
          setAdminCareHomes(data || []);
        } catch (err) {
          console.error('Error loading admin care homes:', err);
        }
      } else {
        setAdminCareHomes([]);
      }
    };
    fetchAdminCareHomes();
  }, [role]);

  const handleAddNew = () => {
    setEditingMeal(null);
    setShowForm(true);
  };

  const handleEdit = (meal) => {
    setViewingMeal(null);
    setEditingMeal(meal);
    setShowForm(true);
  };

  const handleView = (meal) => {
    setViewingMeal(meal);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMeal(null);
  };

  const handleCloseView = () => {
    setViewingMeal(null);
  };

  const handleDelete = (meal) => {
    if (!meal?.id) return;
    const allowed = isAdmin || meal.care_home_id === careHomeId || meal.care_home_id == null;
    if (!allowed) {
      setSaveError('You can only delete meals for your assigned care home.');
      return;
    }
    setDeleteTarget(meal);
    setDeletePassword('');
    setDeleteError('');
  };

  const confirmDelete = async (e) => {
    e.preventDefault();
    if (!deleteTarget?.id) return;
    if (!user?.email) {
      setDeleteError('Unable to verify user. Please re-login.');
      return;
    }
    if (!deletePassword) {
      setDeleteError('Password is required to delete.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (authError) {
        setDeleteError(authError.message || 'Password verification failed.');
        setIsDeleting(false);
        return;
      }

      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;

      setRefreshMealsTick(t => t + 1);
      setSaveSuccess('Meal deleted successfully.');
      setTimeout(() => setSaveSuccess(''), 2000);
      setDeleteTarget(null);
      setDeletePassword('');
      // Defensive cleanup in case a backdrop DOM node was left behind
      try { const { cleanupOverlays } = await import('../../utils/overlayCleanup'); cleanupOverlays(); } catch (_) {}
    } catch (err) {
      console.error('Error deleting meal:', err);
      setDeleteError(err?.message || 'Failed to delete meal.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (mealData) => {
    setSaveError('');
    setSaveSuccess('');
    // Ensure staff and care home managers can only save for their assigned care home
    const payload = (role === 'staff' || role === 'Staff' || role === 'Care Home Manager') ? { ...mealData, careHomeId } : mealData;
    try {
      const mealPayload = {
        name: payload.name,
        type: payload.type,
        description: payload.description,
        ingredients: JSON.stringify(payload.ingredients || []),
        allergens: payload.allergens,
        preparation_instructions: payload.preparationInstructions,
        cost_per_person: Number(payload.costPerPerson) || 0,
        nutritional_info: payload.nutritionalInfo || {},
        custom_nutrition: payload.customNutrition || [],
        care_home_id: payload.careHomeId || null,
        image_url: payload.imageUrl || null,
      };

      let error;
      if (editingMeal?.id) {
        // Update existing meal
        const { error: updateError } = await supabase
          .from('meals')
          .update(mealPayload)
          .eq('id', editingMeal.id)
          .select('*');
        error = updateError;
      } else {
        // Insert new meal
        const { error: insertError } = await supabase
          .from('meals')
          .insert([mealPayload])
          .select('*');
        error = insertError;
      }

      if (error) throw error;
      setShowForm(false);
      setEditingMeal(null);
      setRefreshMealsTick(t => t + 1);
      setSaveSuccess(editingMeal?.id ? 'Meal updated successfully.' : 'Meal saved successfully.');
      setShowSaveAnimation(true);
      setTimeout(() => {
        setShowSaveAnimation(false);
        setSaveSuccess('');
      }, 3000);
      // Defensive cleanup (remove any orphaned backdrop nodes)
      try { const { cleanupOverlays } = await import('../../utils/overlayCleanup'); cleanupOverlays(); } catch (_) {}
    } catch (err) {
      console.error('Error saving meal:', err);
      setSaveError(err?.message || 'Failed to save meal. Check Supabase logs.');
    }
  };

  const downloadTemplate = (scope) => {
    const headers = ['name', 'type', 'description', 'ingredients', 'allergens', 'preparation_instructions', 'cost_per_person', 'calories', 'protein'];
    const fileHeaders = scope === 'care_home' ? [...headers, 'care_home_id'] : headers;

    const sampleGlobal = [
      'Shepherds Pie,Lunch,Comforting beef and potato pie,beef|potato|carrot|peas,celery|milk,Bake at 180C for 25 mins,3.25,520,28',
      'Porridge,Breakfast,Warm oats with toppings,oats|milk|berries,milk,Stovetop on medium heat for 8 mins,0.85,310,9'
    ];
    const sampleCareHome = [
      'Fish Pie,Supper,Creamy white fish pie,cod|potato|peas|cream,fish|milk,Bake at 180C for 30 mins,3.75,540,31,CARE_HOME_ID_HERE',
      'Fruit Salad,Side,Seasonal mixed fruit,apple|pear|grapes,none,Chill before serving,1.10,120,2,CARE_HOME_ID_HERE'
    ];

    const rows = scope === 'care_home' ? sampleCareHome : sampleGlobal;
    const csvContent = [fileHeaders.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', scope === 'care_home' ? 'meals-care-home-template.csv' : 'meals-global-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return headers.reduce((acc, header, idx) => {
        acc[header] = values[idx] ?? '';
        return acc;
      }, {});
    });
  };

  const normalizeMealRow = (row, scope) => {
    if (!row.name || !row.type) {
      throw new Error('Each row must include name and type.');
    }

    const toNumberOrNull = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const ingredientList = row.ingredients ? row.ingredients.split('|').map((i) => i.trim()).filter(Boolean) : [];
    const allergenList = row.allergens ? row.allergens.split('|').map((a) => a.trim()).filter(Boolean) : [];
    const cost = toNumberOrNull(row.cost_per_person);
    const calories = toNumberOrNull(row.calories);
    const protein = toNumberOrNull(row.protein);

    let customNutrition = null;
    if (row.custom_nutrition) {
      try {
        customNutrition = JSON.parse(row.custom_nutrition);
      } catch (err) {
        console.warn('Could not parse custom_nutrition, storing as text');
        customNutrition = row.custom_nutrition;
      }
    }

    let careHomeValue = null;
    if (scope === 'care_home') {
      careHomeValue = (role === 'Care Home Manager' || role === 'Staff') ? careHomeId : row.care_home_id || null;
      if (!careHomeValue) {
        throw new Error('care_home_id is required for per-care-home uploads.');
      }
    }

    return {
      name: row.name,
      type: row.type,
      description: row.description || null,
      ingredients: ingredientList,
      allergens: allergenList,
      preparation_instructions: row.preparation_instructions || null,
      cost_per_person: Number.isFinite(cost) ? cost : 0,
      nutritional_info: calories !== null || protein !== null ? { calories: calories || 0, protein: protein || 0 } : {},
      care_home_id: scope === 'care_home' ? careHomeValue : null,
      custom_nutrition: customNutrition ?? [],
    };
  };

  const handleBulkUpload = async (event, scope) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBulkError('');
    setBulkSuccess('');

    if (scope === 'global' && !isAdmin) {
      setBulkError('Only admins can upload global meals.');
      return;
    }
    if (scope === 'care_home' && !(isAdmin || isCareHomeManager)) {
      setBulkError('You do not have permission to upload meals.');
      return;
    }

    try {
      setIsBulkUploading(true);
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        throw new Error('No rows found in CSV.');
      }

      const mealsPayload = rows.map((row) => normalizeMealRow(row, scope));

      const { error } = await supabase.from('meals').insert(mealsPayload).select('*');
      if (error) throw error;

      setBulkSuccess(`Uploaded ${mealsPayload.length} meals successfully.`);
      setRefreshMealsTick((t) => t + 1);
    } catch (err) {
      console.error('Bulk upload failed:', err);
      setBulkError(err?.message || 'Bulk upload failed.');
    } finally {
      setIsBulkUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      {/* Animated Save Notification */}
      {showSaveAnimation && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[20020] animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-6 py-4 rounded-full shadow-2xl backdrop-blur-sm">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-lg">Meal Added!</p>
              <p className="text-green-50 text-sm">Your meal has been successfully added to the system</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-32">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Icon name="UtensilsCrossed" size={32} />
                Meals Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Manage your meal database with nutritional information, allergens, and preparation details
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="px-6 py-3 rounded-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Icon name="Plus" size={20} />
              Add New Meal
            </button>
          </div>
        </div>

        {(isAdmin || isCareHomeManager) && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6 border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 flex items-center justify-center">
                  <Icon name="Upload" size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bulk upload meals</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Download a CSV template, fill it out, and upload to add multiple meals at once.</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isAdmin && (
                  <button
                    onClick={() => downloadTemplate('global')}
                    className="px-4 py-2 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                  >
                    <Icon name="Download" size={16} />
                    Global template
                  </button>
                )}
                <button
                  onClick={() => downloadTemplate('care_home')}
                  className="px-4 py-2 rounded-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-2"
                >
                  <Icon name="Download" size={16} />
                  Care home template
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAdmin && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">A</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Global meals</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">Only admins can create meals without a care home.</p>
                    </div>
                  </div>
                  <label className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 border-dashed ${isBulkUploading ? 'border-slate-300 dark:border-slate-600' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-600 dark:hover:border-indigo-400'} cursor-pointer transition-all bg-white dark:bg-slate-800`}>
                    <div className="flex items-center gap-3">
                      <Icon name="FileUp" size={18} className="text-indigo-600 dark:text-indigo-300" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Upload global CSV</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Columns: name, type, description, ingredients, allergens, prep, cost, calories, protein</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200">CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      disabled={isBulkUploading}
                      onChange={(e) => handleBulkUpload(e, 'global')}
                    />
                  </label>
                </div>
              )}

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 font-bold">B</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Per care home meals</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Uploads will be scoped to {(role === 'Care Home Manager' || role === 'Staff') ? 'your care home' : 'the care_home_id column'}.</p>
                  </div>
                </div>
                <label className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 border-dashed ${isBulkUploading ? 'border-slate-300 dark:border-slate-600' : 'border-emerald-300 hover:border-emerald-400 dark:border-emerald-800 dark:hover:border-emerald-500'} cursor-pointer transition-all bg-white dark:bg-slate-800`}>
                  <div className="flex items-center gap-3">
                    <Icon name="Home" size={18} className="text-emerald-600 dark:text-emerald-300" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Upload care home CSV</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Columns include care_home_id (auto-filled for managers).</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200">CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    disabled={isBulkUploading}
                    onChange={(e) => handleBulkUpload(e, 'care_home')}
                  />
                </label>
              </div>
            </div>

            {(bulkError || bulkSuccess) && (
              <div className="mt-4 space-y-2">
                {bulkError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                    <Icon name="AlertTriangle" size={18} />
                    <span className="text-sm font-medium">{bulkError}</span>
                  </div>
                )}
                {bulkSuccess && (
                  <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-200">
                    <Icon name="CheckCircle" size={18} />
                    <span className="text-sm font-medium">{bulkSuccess}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meals by name, ingredients, or allergens..."
                className="w-full px-4 py-3 pl-12 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all"
              />
              <Icon name="Search" size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {['All', 'Breakfast', 'Lunch', 'Supper', 'Desserts', 'Special', 'Festive', 'Side'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-3 rounded-lg font-bold text-sm transition-all ${
                    filterType === type
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Care Home Filter for Admin */}
                {isAdmin && adminCareHomes.length > 0 && (
            <div className="mt-4 bg-gradient-to-r from-emerald-50 via-white to-sky-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/70 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                    <Icon name="Building2" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filter by care home</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Switch between global meals or a specific facility.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                  {adminCareHomes.length} options
                </span>
              </div>
              <div className="relative">
                <select
                  value={filterCareHome}
                  onChange={(e) => setFilterCareHome(e.target.value)}
                  className="appearance-none w-full lg:w-[28rem] px-4 py-3 pr-12 rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-200/60 dark:focus:ring-emerald-900/50 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <option value="All">🌐 All meals</option>
                  <option value="Global">🌍 Global meals only</option>
                  {adminCareHomes.map((home) => (
                    <option key={home.id} value={home.id}>🏠 {home.name}</option>
                  ))}
                </select>
                <Icon name="ChevronDown" size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          )}

          {(saveError || saveSuccess) && (
            <div className="space-y-2">
              {saveError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                  <Icon name="AlertTriangle" size={18} />
                  <span className="text-sm font-medium">{saveError}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3 dark:border-green-900/40 dark:bg-green-950/40 dark:text-green-200">
                  <Icon name="CheckCircle" size={18} />
                  <span className="text-sm font-medium">{saveSuccess}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Meals List */}
        <MealsList
          searchQuery={searchQuery}
          filterType={filterType}
          filterCareHome={filterCareHome}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          userRole={isAdmin ? 'admin' : role}
          staffCareHomeId={careHomeId}
          refreshSignal={refreshMealsTick}
        />
      </div>

      {/* Meal Form Modal */}
      {showForm && (
        <MealForm
          meal={editingMeal}
          onClose={handleCloseForm}
          onSave={handleSave}
          userRole={isAdmin ? 'admin' : role}
          staffCareHomeId={careHomeId}
          staffCareHomeName={careHomeName}
          adminCareHomes={adminCareHomes}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-200">
                <Icon name="Trash2" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete meal</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Enter your password to confirm deleting "{deleteTarget.name}". This cannot be undone.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={confirmDelete}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800 transition-all"
                  placeholder="Enter your password"
                  autoFocus
                />
                {deleteError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <Icon name="AlertTriangle" size={14} /> {deleteError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setDeletePassword(''); setDeleteError(''); }}
                  className="px-4 py-3 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className={`px-5 py-3 rounded-lg font-bold text-white flex items-center gap-2 transition-all ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {isDeleting && <span className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />}
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Meal View Modal */}
      {viewingMeal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={handleCloseView}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-8 mt-32" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{viewingMeal.name}</h2>
              <button
                onClick={handleCloseView}
                className="text-white hover:opacity-80 transition-all"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Image */}
              <div className="h-64 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg flex items-center justify-center">
                {viewingMeal.image_url ? (
                  <img src={viewingMeal.image_url} alt={viewingMeal.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-8xl">
                    {viewingMeal.type === 'Breakfast' ? '🍳' :
                     viewingMeal.type === 'Lunch' ? '🥗' :
                     viewingMeal.type === 'Dinner' ? '🍽️' :
                     viewingMeal.type === 'Supper' ? '🫖' :
                     viewingMeal.type === 'Side' ? '🥔' : '🍴'}
                  </span>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Meal Type</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.type}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cost Per Person</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">£{viewingMeal.cost_per_person?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {/* Description */}
              {viewingMeal.description && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Description</p>
                  <p className="text-slate-700 dark:text-slate-300">{viewingMeal.description}</p>
                </div>
              )}

              {/* Ingredients */}
              {viewingMeal.ingredients && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">Ingredients (per serving)</p>
                  {(() => {
                    try {
                      const ingredients = typeof viewingMeal.ingredients === 'string' 
                        ? JSON.parse(viewingMeal.ingredients)
                        : Array.isArray(viewingMeal.ingredients) ? viewingMeal.ingredients : [];
                      if (ingredients.length === 0) return null;
                      return (
                        <ul className="space-y-2">
                          {ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3">
                              <Icon name="Dot" size={16} className="text-indigo-500 flex-shrink-0" />
                              <span className="text-slate-700 dark:text-slate-300">
                                <strong>{ing.name}</strong> - {ing.amount} {ing.unit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      );
                    } catch (err) {
                      return <p className="text-red-500 text-xs">Error parsing ingredients</p>;
                    }
                  })()}
                </div>
              )}

              {/* Preparation Instructions */}
              {viewingMeal.preparation_instructions && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Preparation Instructions</p>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewingMeal.preparation_instructions}</p>
                </div>
              )}

              {/* Nutritional Info */}
              {viewingMeal.nutritional_info && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">Nutritional Information</p>
                  <div className="grid grid-cols-3 gap-3">
                    {viewingMeal.nutritional_info.calories && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Calories</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.calories}</p>
                      </div>
                    )}
                    {viewingMeal.nutritional_info.protein && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Protein</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.protein}g</p>
                      </div>
                    )}
                    {viewingMeal.nutritional_info.carbs && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Carbs</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.carbs}g</p>
                      </div>
                    )}
                    {viewingMeal.nutritional_info.fat && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Fat</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.fat}g</p>
                      </div>
                    )}
                    {viewingMeal.nutritional_info.fiber && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Fiber</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.fiber}g</p>
                      </div>
                    )}
                    {viewingMeal.nutritional_info.sodium && (
                      <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-600 dark:text-slate-400">Sodium</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{viewingMeal.nutritional_info.sodium}mg</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {viewingMeal.allergens && viewingMeal.allergens.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-3">Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingMeal.allergens.map((allergen) => (
                      <span
                        key={allergen}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Care Home Info */}
              <div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Available For</p>
                {viewingMeal.care_home_id ? (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 w-fit">
                    <Icon name="Building2" size={12} />
                    {viewingMeal.care_home_id}
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1 w-fit">
                    <Icon name="Globe" size={12} />
                    Global
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
                <button
                  onClick={handleCloseView}
                  className={`px-4 py-3 rounded-lg font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all ${
                    role === 'staff' && viewingMeal.care_home_id === null ? 'flex-1' : 'flex-1'
                  }`}
                >
                  Close
                </button>
                  {(isAdmin || viewingMeal.care_home_id !== null) && (
                  <button
                    onClick={() => handleEdit(viewingMeal)}
                    className="flex-1 px-4 py-3 rounded-lg font-bold bg-indigo-500 hover:bg-indigo-600 text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Icon name="Edit" size={16} />
                    Edit Meal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  );
};

export default MealsManagement;
