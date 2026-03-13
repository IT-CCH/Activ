import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/navigation/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import MealImageSection from './components/MealImageSection';
import IngredientsTable from './components/IngredientsTable';
import NutritionalChart from './components/NutritionalChart';
import ResidentCompatibility from './components/ResidentCompatibility';
import PreparationChecklist from './components/PreparationChecklist';
import AuditTrail from './components/AuditTrail';
import QuickActions from './components/QuickActions';

const MealDetailView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('ingredients');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const mealData = {
    id: 'meal-001',
    name: 'Roasted Chicken with Seasonal Vegetables',
    description: 'Tender roasted chicken breast served with a medley of roasted root vegetables, rich gravy, and fresh herbs. Suitable for most dietary requirements with modification options available.',
    image: "https://images.unsplash.com/photo-1672787380751-112b3fe7a9e4",
    imageAlt: 'Beautifully plated roasted chicken breast with golden-brown skin served alongside colorful roasted carrots, parsnips, and green beans on white ceramic plate with herb garnish',
    totalCost: 3.45,
    prepTime: 45,
    calories: 485,
    servings: 45,
    difficulty: 'Medium',
    isNew: false,
    isPopular: true
  };

  const ingredients = [
  {
    name: 'Chicken Breast',
    category: 'Protein',
    quantity: 5,
    unit: 'kg',
    cost: 32.50,
    supplier: 'Farmhouse Poultry Ltd',
    stockLevel: 'In Stock',
    allergens: []
  },
  {
    name: 'Carrots',
    category: 'Vegetables',
    quantity: 3,
    unit: 'kg',
    cost: 4.20,
    supplier: 'Fresh Veg Direct',
    stockLevel: 'In Stock',
    allergens: []
  },
  {
    name: 'Potatoes',
    category: 'Vegetables',
    quantity: 4,
    unit: 'kg',
    cost: 5.60,
    supplier: 'Fresh Veg Direct',
    stockLevel: 'Low Stock',
    allergens: []
  },
  {
    name: 'Onions',
    category: 'Vegetables',
    quantity: 1.5,
    unit: 'kg',
    cost: 2.10,
    supplier: 'Fresh Veg Direct',
    stockLevel: 'In Stock',
    allergens: []
  },
  {
    name: 'Butter',
    category: 'Dairy',
    quantity: 0.5,
    unit: 'kg',
    cost: 3.75,
    supplier: 'Dairy Fresh Co',
    stockLevel: 'In Stock',
    allergens: ['Dairy']
  },
  {
    name: 'Chicken Stock',
    category: 'Condiments',
    quantity: 2,
    unit: 'litres',
    cost: 4.80,
    supplier: 'Quality Foods Ltd',
    stockLevel: 'In Stock',
    allergens: ['Celery']
  },
  {
    name: 'Fresh Herbs',
    category: 'Herbs',
    quantity: 0.2,
    unit: 'kg',
    cost: 6.40,
    supplier: 'Herb Garden Supplies',
    stockLevel: 'In Stock',
    allergens: []
  },
  {
    name: 'Olive Oil',
    category: 'Oils',
    quantity: 0.3,
    unit: 'litres',
    cost: 5.25,
    supplier: 'Mediterranean Imports',
    stockLevel: 'In Stock',
    allergens: []
  }];


  const nutritionalInfo = {
    calories: 485,
    protein: 42,
    carbs: 38,
    fat: 18,
    fiber: 6,
    vitamins: {
      vitaminA: 85,
      vitaminC: 65,
      vitaminD: 45,
      calcium: 55,
      iron: 70
    }
  };

  const compatibilityData = {
    summary: {
      compatible: 38,
      warning: 5,
      incompatible: 2
    },
    residents: [
    {
      id: 1,
      name: 'Margaret Thompson',
      room: '101',
      status: 'compatible',
      dietaryRestrictions: ['Low Sodium'],
      allergens: [],
      medicalConditions: [],
      modifications: null
    },
    {
      id: 2,
      name: 'Robert Wilson',
      room: '102',
      status: 'warning',
      dietaryRestrictions: ['Diabetic', 'Low Fat'],
      allergens: [],
      medicalConditions: [
      { name: 'Type 2 Diabetes', requirement: 'Reduce potato portion, increase vegetables' }],

      modifications: 'Reduce carbohydrate content by 30%, increase vegetable portion'
    },
    {
      id: 3,
      name: 'Elizabeth Davies',
      room: '103',
      status: 'warning',
      dietaryRestrictions: ['Pureed Diet'],
      allergens: [],
      medicalConditions: [
      { name: 'Dysphagia', requirement: 'All food must be pureed to smooth consistency' }],

      modifications: 'Puree all components separately, ensure smooth texture throughout'
    },
    {
      id: 4,
      name: 'James Anderson',
      room: '104',
      status: 'incompatible',
      dietaryRestrictions: ['Vegetarian', 'Dairy Free'],
      allergens: ['Dairy'],
      medicalConditions: [],
      modifications: 'Substitute chicken with plant-based protein, use dairy-free butter alternative'
    },
    {
      id: 5,
      name: 'Patricia Brown',
      room: '105',
      status: 'warning',
      dietaryRestrictions: ['Gluten Free', 'Low Sodium'],
      allergens: ['Celery'],
      medicalConditions: [],
      modifications: 'Use gluten-free stock alternative, reduce salt content'
    }]

  };

  const preparationChecklist = [
  {
    id: 1,
    name: 'Preparation & Mise en Place',
    estimatedTime: 15,
    notes: 'Ensure all ingredients are at room temperature before starting',
    tasks: [
    {
      id: 1,
      description: 'Wash and peel all vegetables',
      notes: 'Check for any damaged produce',
      completed: true,
      completedBy: 'Sarah Mitchell',
      completedAt: '09:15',
      critical: false
    },
    {
      id: 2,
      description: 'Cut vegetables into uniform pieces',
      notes: 'Ensure consistent sizing for even cooking',
      completed: true,
      completedBy: 'Sarah Mitchell',
      completedAt: '09:30',
      critical: false
    },
    {
      id: 3,
      description: 'Season chicken breasts',
      notes: 'Use low-sodium seasoning for dietary requirements',
      completed: false,
      critical: true
    }]

  },
  {
    id: 2,
    name: 'Cooking Process',
    estimatedTime: 45,
    notes: 'Monitor oven temperature throughout cooking',
    tasks: [
    {
      id: 4,
      description: 'Preheat oven to 180°C',
      notes: 'Verify temperature with oven thermometer',
      completed: false,
      critical: true
    },
    {
      id: 5,
      description: 'Sear chicken breasts in pan',
      notes: 'Achieve golden-brown color on both sides',
      completed: false,
      critical: false
    },
    {
      id: 6,
      description: 'Roast vegetables in oven',
      notes: 'Toss halfway through cooking time',
      completed: false,
      critical: false
    },
    {
      id: 7,
      description: 'Finish chicken in oven',
      notes: 'Internal temperature must reach 75°C',
      completed: false,
      critical: true
    }]

  },
  {
    id: 3,
    name: 'Plating & Service',
    estimatedTime: 10,
    notes: 'Ensure plates are warmed before service',
    tasks: [
    {
      id: 8,
      description: 'Rest chicken for 5 minutes',
      notes: 'Allows juices to redistribute',
      completed: false,
      critical: false
    },
    {
      id: 9,
      description: 'Plate components attractively',
      notes: 'Follow portion control guidelines',
      completed: false,
      critical: false
    },
    {
      id: 10,
      description: 'Add gravy and garnish',
      notes: 'Check temperature before service',
      completed: false,
      critical: true
    }]

  }];


  const auditLogs = [
  {
    id: 1,
    action: 'created',
    user: 'Chef Michael Roberts',
    timestamp: '10/12/2025 08:30',
    description: 'Initial meal plan created for 3-week cycle rotation',
    critical: false
  },
  {
    id: 2,
    action: 'ingredient_changed',
    user: 'Kitchen Manager Sarah Mitchell',
    timestamp: '10/12/2025 09:15',
    description: 'Chicken supplier changed due to stock availability',
    changes: [
    { from: 'Premium Poultry Co', to: 'Farmhouse Poultry Ltd' }],

    reason: 'Original supplier out of stock, alternative approved by procurement',
    critical: false
  },
  {
    id: 3,
    action: 'cost_updated',
    user: 'Finance Team',
    timestamp: '10/12/2025 10:00',
    description: 'Ingredient costs updated based on latest supplier pricing',
    changes: [
    { from: '£3.25', to: '£3.45' }],

    critical: false
  },
  {
    id: 4,
    action: 'modified',
    user: 'Healthcare Coordinator Jane Williams',
    timestamp: '10/12/2025 11:30',
    description: 'Dietary modifications added for residents with special requirements',
    reason: 'New resident admission with dysphagia requires pureed option',
    critical: true
  },
  {
    id: 5,
    action: 'approved',
    user: 'Care Home Manager David Thompson',
    timestamp: '10/12/2025 14:00',
    description: 'Meal plan approved for service on 12/12/2025',
    critical: false
  }];


  const handleAction = (action, mealId, data) => {
    console.log(`Action: ${action}`, { mealId, data });

    switch (action) {
      case 'approve':alert('Meal approved successfully! Notification sent to kitchen staff.');
        break;
      case 'reject':alert('Meal rejected. Kitchen staff will be notified to prepare alternative.');
        break;
      case 'modify':
        alert(`Modification request submitted: ${data?.reason}`);
        break;
      case 'substitute':
        alert(`Ingredient substitution requested: ${data?.original} → ${data?.substitute}`);
        break;
      case 'export':
        alert('Preparation guide exported successfully!');
        break;
      default:
        break;
    }
  };

  const handleUpdateStatus = (stageId, taskId) => {
    console.log('Task status updated:', { stageId, taskId });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="main-content">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => navigate('/food-calendar-view')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">

              <Icon name="ArrowLeft" size={16} />
              Back to Calendar
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Meal Detail Analysis</h1>
                <p className="text-muted-foreground">Comprehensive meal information and preparation workflow</p>
              </div>
              <Button
                variant="default"
                iconName="Zap"
                iconPosition="left"
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="hidden lg:flex">

                Quick Actions
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <MealImageSection meal={mealData} />

              <div className="lg:hidden">
                <div className="bg-card rounded-lg p-2 flex gap-2 overflow-x-auto">
                  {['ingredients', 'nutrition', 'compatibility', 'preparation', 'audit']?.map((tab) =>
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab ?
                    'bg-primary text-primary-foreground' :
                    'text-muted-foreground hover:bg-muted'}`
                    }>

                      {tab?.charAt(0)?.toUpperCase() + tab?.slice(1)}
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden lg:block">
                <IngredientsTable ingredients={ingredients} />
              </div>

              <div className="hidden lg:block">
                <NutritionalChart nutritionalInfo={nutritionalInfo} />
              </div>

              <div className="hidden lg:block">
                <AuditTrail auditLogs={auditLogs} />
              </div>

              <div className="lg:hidden">
                {activeTab === 'ingredients' && <IngredientsTable ingredients={ingredients} />}
                {activeTab === 'nutrition' && <NutritionalChart nutritionalInfo={nutritionalInfo} />}
                {activeTab === 'compatibility' && <ResidentCompatibility compatibilityData={compatibilityData} />}
                {activeTab === 'preparation' && <PreparationChecklist checklist={preparationChecklist} onUpdateStatus={handleUpdateStatus} />}
                {activeTab === 'audit' && <AuditTrail auditLogs={auditLogs} />}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="hidden lg:block">
                <QuickActions mealId={mealData?.id} onAction={handleAction} />
              </div>

              <ResidentCompatibility compatibilityData={compatibilityData} />

              <PreparationChecklist checklist={preparationChecklist} onUpdateStatus={handleUpdateStatus} />
            </div>
          </div>

          <div className="lg:hidden fixed bottom-4 right-4 z-50">
            <Button
              variant="default"
              iconName="Zap"
              size="lg"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="rounded-full shadow-lg">

              Actions
            </Button>
          </div>

          {showQuickActions &&
          <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4">
              <div className="w-full max-w-md">
                <QuickActions mealId={mealData?.id} onAction={handleAction} />
                <Button
                variant="outline"
                onClick={() => setShowQuickActions(false)}
                fullWidth
                className="mt-4">

                  Close
                </Button>
              </div>
            </div>
          }
        </div>
      </main>
    </div>);

};

export default MealDetailView;