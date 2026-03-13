import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import Header from '../../components/navigation/Header';
import Icon from '../../components/AppIcon';
import CalendarToolbar from './components/CalendarToolbar';
import MealCard from './components/MealCard';
import CalendarSidebar from './components/CalendarSidebar';
import CalendarFilters from './components/CalendarFilters';
import MealDetailModal from './components/MealDetailModal';
import MenuManagementPanel from './components/MenuManagementPanel';

const FoodCalendarView = () => {
  const navigate = useNavigate();
  const { role, careHomeId, isAdmin, isCareHomeManager, isSuperAdmin, organizationId } = useAuth();
  const [availableMeals, setAvailableMeals] = useState([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [currentView, setCurrentView] = useState('management'); // 'management' or 'planning'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [currentCareHome, setCurrentCareHome] = useState(null);
  const [careHomeName, setCareHomeName] = useState('');
  const [careHomes, setCareHomes] = useState([]);
  const [filters, setFilters] = useState({
    dietary: 'all',
    cost: 'all',
    complexity: 'all',
    status: 'all'
  });

  // Load care homes for admins so we can label which care home created a meal
  useEffect(() => {
    const loadCareHomes = async () => {
      if (!isAdmin) return;

      try {
        let query = supabase.from('care_homes').select('id, name, organization_id').order('name', { ascending: true });
        if (isSuperAdmin && organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query;

        if (error) throw error;

        setCareHomes(data || []);

        // If nothing is selected yet, default to the first care home
        if (!currentCareHome && data && data.length > 0) {
          setCurrentCareHome(data[0].id);
        }
      } catch (err) {
        console.error('Error loading care homes:', err);
      }
    };

    loadCareHomes();
  }, [role]);

  // Fetch care home name for staff and care home manager users
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
          if (data) {
            setCareHomeName(data.name);
            setCurrentCareHome(careHomeId);
          }
        } catch (err) {
          console.error('Error fetching care home:', err);
        }
      }
    };

    fetchCareHomeName();
  }, [role, careHomeId]);

  // Load available meals from Supabase for the "Available Meals" panel
  useEffect(() => {
    const loadMeals = async () => {
      try {
        setIsLoadingMeals(true);
        let query = supabase.from('meals').select('*').order('name', { ascending: true });

        // Filter by current care home: show global meals + care home specific meals
        if (currentCareHome) {
          query = query.or(`care_home_id.is.null,care_home_id.eq.${currentCareHome}`);
        } else {
          // No care home selected: show only global meals (safety fallback)
          query = query.is('care_home_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Normalize shape for the panel
        const normalized = (data || []).map((meal) => ({
          id: meal.id,
          name: meal.name,
          type: meal.type || meal.meal_type || 'Other',
          description: meal.description,
          care_home_id: meal.care_home_id,
          allergens: meal.allergens || [],
          image: meal.image_url,
          costPerServing: meal.cost_per_person || 0,
        }));

        setAvailableMeals(normalized);
      } catch (err) {
        console.error('Error loading meals for calendar:', err);
      } finally {
        setIsLoadingMeals(false);
      }
    };

    loadMeals();
  }, [currentCareHome]);

  const [preparationChecklist, setPreparationChecklist] = useState([
  {
    id: 1,
    task: "Prepare ingredients for Roast Chicken",
    meal: "Lunch",
    time: "11:00",
    completed: true
  },
  {
    id: 2,
    task: "Thaw fish for dinner service",
    meal: "Dinner",
    time: "14:00",
    completed: true
  },
  {
    id: 3,
    task: "Prepare vegetarian alternative",
    meal: "Lunch",
    time: "11:30",
    completed: false
  },
  {
    id: 4,
    task: "Check allergen labels on new stock",
    meal: "All Meals",
    time: "09:00",
    completed: false
  },
  {
    id: 5,
    task: "Prepare pureed meals for residents",
    meal: "Lunch",
    time: "11:45",
    completed: false
  }]
  );

  const mealCycle = {
    currentWeek: 2,
    totalWeeks: 3,
    currentDay: 4
  };

  const dietaryAlerts = [
  {
    id: 1,
    resident: "Margaret Thompson",
    message: "New gluten allergy recorded - requires meal modification",
    meal: "Lunch",
    date: "12/12/2025",
    severity: "high"
  },
  {
    id: 2,
    resident: "John Davies",
    message: "Requires liquidized texture for all meals",
    meal: "All Meals",
    date: "12/12/2025",
    severity: "high"
  },
  {
    id: 3,
    resident: "Sarah Williams",
    message: "Dairy-free alternative needed for dessert",
    meal: "Dinner",
    date: "13/12/2025",
    severity: "medium"
  },
  {
    id: 4,
    resident: "Robert Brown",
    message: "Low sodium diet - check seasoning levels",
    meal: "Lunch",
    date: "13/12/2025",
    severity: "medium"
  }];


  const cycleAnalytics = {
    completionRate: 87,
    onTimeMeals: 156,
    delayedMeals: 12,
    avgCostPerMeal: 2.85,
    budgetStatus: 'under'
  };

  const mealsData = [
  {
    id: 1,
    name: "Traditional Roast Chicken with Vegetables",
    type: "lunch",
    time: "12:30",
    date: new Date(2025, 11, 12),
    image: "https://images.unsplash.com/photo-1711322746956-f2519fd29553",
    imageAlt: "Golden roasted whole chicken with crispy skin surrounded by colorful roasted vegetables including carrots, potatoes, and Brussels sprouts on white serving platter",
    costPerServing: 3.45,
    servings: 45,
    compatibleResidents: 42,
    totalResidents: 45,
    status: "confirmed",
    dietaryRestrictions: ["Gluten Free", "Dairy Free"],
    allergens: ["Celery"],
    preparationStatus: { completed: 8, total: 10 },
    prepTime: 90,
    description: "Classic British roast chicken served with seasonal roasted vegetables, rich gravy, and Yorkshire puddings. A comforting traditional meal loved by residents.",
    nutritionalInfo: {
      calories: 485,
      protein: 42,
      carbs: 35,
      fat: 18
    },
    ingredients: [
    "Free-range chicken (1.5kg)",
    "Carrots (500g)",
    "Potatoes (1kg)",
    "Brussels sprouts (400g)",
    "Onions (2 large)",
    "Chicken stock (500ml)",
    "Fresh herbs (thyme, rosemary)"]

  },
  {
    id: 2,
    name: "Vegetarian Lasagne with Garden Salad",
    type: "lunch",
    time: "12:30",
    date: new Date(2025, 11, 12),
    image: "https://images.unsplash.com/photo-1646339485884-c38c3c3398b2",
    imageAlt: "Layered vegetarian lasagne with golden cheese topping in white ceramic baking dish, showing rich tomato sauce and melted cheese layers with fresh basil garnish",
    costPerServing: 2.85,
    servings: 38,
    compatibleResidents: 35,
    totalResidents: 38,
    status: "pending",
    dietaryRestrictions: ["Vegetarian"],
    allergens: ["Gluten", "Dairy", "Eggs"],
    preparationStatus: { completed: 5, total: 8 },
    prepTime: 75,
    description: "Hearty vegetarian lasagne with layers of pasta, rich tomato sauce, mixed vegetables, and creamy béchamel. Served with fresh garden salad.",
    nutritionalInfo: {
      calories: 420,
      protein: 18,
      carbs: 52,
      fat: 16
    },
    ingredients: [
    "Lasagne sheets (500g)",
    "Tomatoes (1kg)",
    "Courgettes (3 medium)",
    "Aubergine (2 medium)",
    "Ricotta cheese (400g)",
    "Mozzarella (300g)",
    "Fresh basil"]

  },
  {
    id: 3,
    name: "Grilled Salmon with New Potatoes",
    type: "dinner",
    time: "17:30",
    date: new Date(2025, 11, 12),
    image: "https://images.unsplash.com/photo-1572438611934-1e0470fef552",
    imageAlt: "Perfectly grilled salmon fillet with crispy golden skin on white plate, accompanied by baby new potatoes with herbs and steamed green beans with lemon wedge",
    costPerServing: 4.25,
    servings: 45,
    compatibleResidents: 40,
    totalResidents: 45,
    status: "confirmed",
    dietaryRestrictions: ["Gluten Free", "Dairy Free"],
    allergens: ["Fish"],
    preparationStatus: { completed: 10, total: 10 },
    prepTime: 45,
    description: "Fresh Atlantic salmon fillet grilled to perfection, served with buttered new potatoes and seasonal green vegetables. Rich in omega-3 fatty acids.",
    nutritionalInfo: {
      calories: 520,
      protein: 38,
      carbs: 42,
      fat: 22
    },
    ingredients: [
    "Salmon fillets (180g each)",
    "New potatoes (1.2kg)",
    "Green beans (600g)",
    "Butter (100g)",
    "Lemon (3 whole)",
    "Fresh dill",
    "Olive oil"]

  },
  {
    id: 4,
    name: "Beef Stew with Dumplings",
    type: "lunch",
    time: "12:30",
    date: new Date(2025, 11, 13),
    image: "https://images.unsplash.com/photo-1664741319755-920c2c616bdb",
    imageAlt: "Hearty beef stew in rustic ceramic bowl with tender meat chunks, carrots, and potatoes in rich brown gravy, topped with fluffy white dumplings and fresh parsley",
    costPerServing: 3.15,
    servings: 45,
    compatibleResidents: 43,
    totalResidents: 45,
    status: "modified",
    dietaryRestrictions: [],
    allergens: ["Gluten", "Celery"],
    preparationStatus: { completed: 3, total: 12 },
    prepTime: 180,
    description: "Traditional British beef stew with tender chunks of beef, root vegetables, and fluffy dumplings in rich gravy. A warming winter favorite.",
    nutritionalInfo: {
      calories: 565,
      protein: 35,
      carbs: 48,
      fat: 24
    },
    ingredients: [
    "Stewing beef (2kg)",
    "Carrots (800g)",
    "Potatoes (1.5kg)",
    "Onions (4 large)",
    "Beef stock (1.5L)",
    "Self-raising flour (300g)",
    "Suet (150g)"]

  },
  {
    id: 5,
    name: "Chicken Curry with Rice",
    type: "dinner",
    time: "17:30",
    date: new Date(2025, 11, 13),
    image: "https://images.unsplash.com/photo-1716551028663-eb6435eca4b4",
    imageAlt: "Creamy chicken curry with tender pieces in golden yellow sauce served in white bowl alongside fluffy basmati rice, garnished with fresh coriander leaves",
    costPerServing: 2.95,
    servings: 45,
    compatibleResidents: 38,
    totalResidents: 45,
    status: "pending",
    dietaryRestrictions: ["Gluten Free"],
    allergens: ["Dairy"],
    preparationStatus: { completed: 0, total: 9 },
    prepTime: 60,
    description: "Mild and creamy chicken curry made with tender chicken pieces, aromatic spices, and coconut milk. Served with fluffy basmati rice and naan bread.",
    nutritionalInfo: {
      calories: 495,
      protein: 32,
      carbs: 58,
      fat: 14
    },
    ingredients: [
    "Chicken breast (2kg)",
    "Basmati rice (1kg)",
    "Coconut milk (800ml)",
    "Curry powder (50g)",
    "Onions (3 large)",
    "Tomatoes (600g)",
    "Fresh coriander"]

  },
  {
    id: 6,
    name: "Fish and Chips with Mushy Peas",
    type: "lunch",
    time: "12:30",
    date: new Date(2025, 11, 14),
    image: "https://images.unsplash.com/photo-1549665949-684477524ea1",
    imageAlt: "Classic British fish and chips with golden battered cod fillet and crispy chips on white plate, served with bright green mushy peas and lemon wedge",
    costPerServing: 3.65,
    servings: 45,
    compatibleResidents: 42,
    totalResidents: 45,
    status: "confirmed",
    dietaryRestrictions: [],
    allergens: ["Fish", "Gluten"],
    preparationStatus: { completed: 6, total: 8 },
    prepTime: 50,
    description: "Traditional British fish and chips featuring crispy battered cod, golden chips, and mushy peas. A Friday favorite among residents.",
    nutritionalInfo: {
      calories: 625,
      protein: 35,
      carbs: 68,
      fat: 26
    },
    ingredients: [
    "Cod fillets (180g each)",
    "Potatoes (2kg)",
    "Plain flour (400g)",
    "Beer (500ml)",
    "Marrowfat peas (1kg)",
    "Vegetable oil (2L)",
    "Lemon (4 whole)"]

  }];


  const handleNavigate = (action) => {
    const newDate = new Date(currentDate);

    if (currentView === 'day') {
      if (action === 'PREV') newDate?.setDate(newDate?.getDate() - 1);
      if (action === 'NEXT') newDate?.setDate(newDate?.getDate() + 1);
      if (action === 'TODAY') setCurrentDate(new Date());else
      setCurrentDate(newDate);
    } else if (currentView === 'week') {
      if (action === 'PREV') newDate?.setDate(newDate?.getDate() - 7);
      if (action === 'NEXT') newDate?.setDate(newDate?.getDate() + 7);
      if (action === 'TODAY') setCurrentDate(new Date());else
      setCurrentDate(newDate);
    } else if (currentView === 'month') {
      if (action === 'PREV') newDate?.setMonth(newDate?.getMonth() - 1);
      if (action === 'NEXT') newDate?.setMonth(newDate?.getMonth() + 1);
      if (action === 'TODAY') setCurrentDate(new Date());else
      setCurrentDate(newDate);
    }
  };

  const handleMealClick = (meal) => {
    setSelectedMeal(meal);
    setIsModalOpen(true);
  };

  const handleChecklistToggle = (itemId) => {
    setPreparationChecklist((prev) =>
    prev?.map((item) =>
    item?.id === itemId ? { ...item, completed: !item?.completed } : item
    )
    );
  };

  const handleAlertClick = (alert) => {
    console.log('Alert clicked:', alert);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      dietary: 'all',
      cost: 'all',
      complexity: 'all',
      status: 'all'
    });
  };

  const handleExport = () => {
    console.log('Exporting calendar data...');
  };

  const handleEditMeal = (mealId) => {
    navigate('/meal-detail-view', { state: { mealId } });
  };

  const handleDeleteMeal = (mealId) => {
    console.log('Deleting meal:', mealId);
    setIsModalOpen(false);
  };

  const getFilteredMeals = () => {
    return mealsData?.filter((meal) => {
      if (filters?.dietary !== 'all') {
        const hasRestriction = meal?.dietaryRestrictions?.some(
          (restriction) => restriction?.toLowerCase()?.includes(filters?.dietary?.toLowerCase())
        );
        if (!hasRestriction) return false;
      }

      if (filters?.cost !== 'all') {
        const cost = meal?.costPerServing;
        if (filters?.cost === 'under-2' && cost >= 2) return false;
        if (filters?.cost === '2-3' && (cost < 2 || cost >= 3)) return false;
        if (filters?.cost === '3-4' && (cost < 3 || cost >= 4)) return false;
        if (filters?.cost === 'over-4' && cost < 4) return false;
      }

      if (filters?.status !== 'all' && meal?.status !== filters?.status) {
        return false;
      }

      return true;
    });
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek?.getDay();
    const diff = startOfWeek?.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek?.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date?.setDate(startOfWeek?.getDate() + i);
      days?.push(date);
    }
    return days;
  };

  const getMealsForDate = (date) => {
    return getFilteredMeals()?.filter((meal) => {
      const mealDate = new Date(meal.date);
      return mealDate?.getDate() === date?.getDate() &&
      mealDate?.getMonth() === date?.getMonth() && mealDate?.getFullYear() === date?.getFullYear();
    });
  };

  const renderDayView = () => {
    const meals = getMealsForDate(currentDate);

    return (
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {new Intl.DateTimeFormat('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })?.format(currentDate)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {meals?.length} meal{meals?.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        {meals?.length === 0 ?
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Icon name="CalendarOff" size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Meals Scheduled</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no meals scheduled for this date. Add a new meal to get started.
            </p>
          </div> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meals?.map((meal) =>
          <MealCard key={meal?.id} meal={meal} onClick={handleMealClick} />
          )}
          </div>
        }
      </div>);

  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {weekDays?.map((date, index) => {
            const meals = getMealsForDate(date);
            const isToday =
            date?.getDate() === new Date()?.getDate() &&
            date?.getMonth() === new Date()?.getMonth() &&
            date?.getFullYear() === new Date()?.getFullYear();

            return (
              <div key={index} className="min-h-[400px]">
                <div className={`mb-3 pb-2 border-b ${isToday ? 'border-primary' : 'border-border'}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {new Intl.DateTimeFormat('en-GB', { weekday: 'short' })?.format(date)}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {date?.getDate()}
                  </p>
                </div>
                <div className="space-y-3">
                  {meals?.length === 0 ?
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Icon name="CalendarOff" size={24} className="text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">No meals</p>
                    </div> :

                  meals?.map((meal) =>
                  <MealCard key={meal?.id} meal={meal} onClick={handleMealClick} />
                  )
                  }
                </div>
              </div>);

          })}
        </div>
      </div>);

  };

  const renderMonthView = () => {
    const year = currentDate?.getFullYear();
    const month = currentDate?.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay?.getDay();
    const daysInMonth = lastDay?.getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days?.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days?.push(new Date(year, month, i));
    }

    return (
      <div className="p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']?.map((day) =>
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days?.map((date, index) => {
            if (!date) {
              return <div key={index} className="aspect-square" />;
            }

            const meals = getMealsForDate(date);
            const isToday =
            date?.getDate() === new Date()?.getDate() &&
            date?.getMonth() === new Date()?.getMonth() &&
            date?.getFullYear() === new Date()?.getFullYear();

            return (
              <div
                key={index}
                className={`aspect-square border rounded-lg p-2 cursor-pointer hover:shadow-md transition-all duration-200 ${
                isToday ? 'border-primary bg-primary/5' : 'border-border bg-card'}`
                }
                onClick={() => {
                  setCurrentDate(date);
                  setCurrentView('day');
                }}>

                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {date?.getDate()}
                </div>
                <div className="space-y-1">
                  {meals?.slice(0, 2)?.map((meal) =>
                  <div
                    key={meal?.id}
                    className="text-xs px-1 py-0.5 bg-primary/10 text-primary rounded truncate">

                      {meal?.name}
                    </div>
                  )}
                  {meals?.length > 2 &&
                  <div className="text-xs text-muted-foreground">
                      +{meals?.length - 2} more
                    </div>
                  }
                </div>
              </div>);

          })}
        </div>
      </div>);

  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="main-content">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* View Toggle */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
            <div className="flex gap-2 bg-card border border-border rounded-xl p-1">
              <button
                onClick={() => setCurrentView('management')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  currentView === 'management'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                📋 Menu Setup
              </button>
            </div>
          </div>

          {/* Menu Management Panel */}
          {currentView === 'management' && (
            <MenuManagementPanel
              careHomes={careHomes}
              currentCareHome={currentCareHome}
              onCareHomeChange={setCurrentCareHome}
              userRole={isAdmin ? 'admin' : role}
              careHomeName={careHomeName}
              availableMeals={availableMeals}
              isLoadingMeals={isLoadingMeals}
              onMenuSave={(schedule, careHomeId) => {
                console.log('Menu saved for care home:', careHomeId, schedule);
              }}
            />
          )}

          {/* Original Planning View - REMOVED */}

        </div>
      </div>

      {isModalOpen && (
        <MealDetailModal
          meal={selectedMeal}
          onClose={() => setIsModalOpen(false)}
          onEdit={handleEditMeal}
          onDelete={handleDeleteMeal} />
      )}
    </div>);

};

export default FoodCalendarView;