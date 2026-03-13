import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Header from '../../../components/navigation/Header';

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    totalResidents: 0,
    mealsScheduledToday: 0,
    residentAlertsCount: 0,
    dietaryCompliance: 0,
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      type: 'meal_added',
      description: 'Breakfast menu updated',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'UtensilsCrossed',
    },
    {
      id: 2,
      type: 'resident_update',
      description: 'Dietary preference updated for John Smith',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: 'User',
    },
    {
      id: 3,
      type: 'allergen_alert',
      description: 'Allergen alert: Nut allergy for Mrs. Johnson',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      icon: 'AlertTriangle',
    },
  ]);

  const [upcomingMeals, setUpcomingMeals] = useState([
    {
      id: 1,
      mealType: 'Breakfast',
      mealName: 'Traditional Full English',
      date: new Date(),
      time: '08:00 AM',
      residentCount: 22,
      icon: '🍳',
    },
    {
      id: 2,
      mealType: 'Lunch',
      mealName: 'Roast Chicken with Vegetables',
      date: new Date(),
      time: '12:30 PM',
      residentCount: 24,
      icon: '🥗',
    },
    {
      id: 3,
      mealType: 'Dinner',
      mealName: "Shepherd's Pie",
      date: new Date(),
      time: '18:00 PM',
      residentCount: 23,
      icon: '🍽️',
    },
  ]);

  const getMealIcon = (type) => {
    switch (type) {
      case 'Breakfast': return '🍳';
      case 'Lunch': return '🥗';
      case 'Dinner': return '🍽️';
      case 'Supper': return '🫖';
      default: return '🍴';
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
            <Icon name="LayoutDashboard" size={32} />
            Care Home Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Welcome back! Here's an overview of your care home activities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Residents */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Total Residents
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalResidents}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Icon name="Users" size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Today's Meals */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Meals Scheduled Today
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.mealsScheduledToday}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <Icon name="UtensilsCrossed" size={24} className="text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Resident Alerts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Dietary Alerts
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.residentAlertsCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Icon name="AlertTriangle" size={24} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Compliance Score */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Dietary Compliance
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.dietaryCompliance}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle2" size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Meals */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Icon name="Calendar" size={20} />
              Today's Meals
            </h2>

            <div className="space-y-3">
              {upcomingMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{meal.icon}</span>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {meal.mealName}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {meal.mealType} • {meal.time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {meal.residentCount}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      residents
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Icon name="Activity" size={20} />
              Recent Activity
            </h2>

            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
