import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ConfirmedOrdersCalendar = ({ isOpen, onClose, careHomeId, onViewOrder }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load confirmed orders for the current month
  useEffect(() => {
    if (!isOpen) return;
    
    const loadConfirmedOrders = async () => {
      setLoading(true);
      try {
        const { listDeliveryStatuses } = await import('../../../services/deliveryService');
        
        // Get start and end of current month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        // Fetch all delivery statuses for the month
        const result = await listDeliveryStatuses({
          careHomeId: careHomeId || null,
          startDate: startStr,
          endDate: endStr,
          page: 1,
          pageSize: 1000,
          delivered: null,
          mealType: 'All'
        });
        
        // Filter to only show today and past meals (not future scheduled)
        const today = new Date().toISOString().split('T')[0];
        const filteredOrders = (result.rows || []).filter(order => order.date <= today);
        setConfirmedOrders(filteredOrders);
      } catch (err) {
        console.error('Error loading confirmed orders:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadConfirmedOrders();
  }, [isOpen, currentDate, careHomeId]);
  
  if (!isOpen) return null;
  
  const formatMonthYear = () => {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric'
    }).format(currentDate);
  };
  
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get days in current month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, orders: [] });
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      const ordersForDay = confirmedOrders.filter(order => order.date === dateStr);
      days.push({ date: day, dateStr, orders: ordersForDay });
    }
    
    return days;
  };
  
  const getOrdersByMealType = (orders) => {
    const grouped = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Supper: []
    };
    
    orders.forEach(order => {
      const type = order.meal_type;
      if (grouped[type]) {
        grouped[type].push(order);
      }
    });
    
    return grouped;
  };
  
  const getMealTypeColor = (type) => {
    const colors = {
      Breakfast: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      Lunch: { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      Dinner: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      Supper: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
    };
    return colors[type] || colors.Breakfast;
  };
  
  const getMealTypeIcon = (type) => {
    const icons = {
      Breakfast: 'Coffee',
      Lunch: 'UtensilsCrossed',
      Dinner: 'Soup',
      Supper: 'Moon'
    };
    return icons[type] || 'UtensilsCrossed';
  };
  
  const days = getDaysInMonth();
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[20000] flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                <Icon name="CalendarCheck" size={24} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Meal Delivery Calendar</h2>
                <p className="text-sm text-muted-foreground">Overview of scheduled and confirmed meal deliveries</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Icon name="X" size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
        
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronLeft"
                onClick={() => navigateMonth('prev')}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                iconName="ChevronRight"
                onClick={() => navigateMonth('next')}
              />
              <h3 className="text-lg font-semibold text-foreground ml-2">
                {formatMonthYear()}
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {confirmedOrders.length} meal{confirmedOrders.length !== 1 ? 's' : ''} this month
              </div>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {days.map((day, idx) => {
                const isToday = day.dateStr === today;
                const hasMeals = day.date && day.orders.length > 0;
                
                return (
                  <div
                    key={idx}
                    className={`min-h-[140px] rounded-xl border-2 p-2 transition-all ${
                      day.date
                        ? isToday
                          ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-700 shadow-md'
                          : hasMeals
                            ? 'bg-card border-slate-300 dark:border-slate-700 hover:shadow-lg hover:border-indigo-300'
                            : 'bg-card border-slate-200 dark:border-slate-800'
                        : 'bg-transparent border-transparent'
                    }`}
                  >
                    {day.date && (
                      <>
                        <div className={`text-sm font-bold mb-2 flex items-center justify-between ${isToday ? 'text-indigo-600' : 'text-foreground'}`}>
                          <span>{day.date}</span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">TODAY</span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {Object.entries(getOrdersByMealType(day.orders)).map(([mealType, orders]) => {
                            if (orders.length === 0) return null;
                            const colors = getMealTypeColor(mealType);
                            const icon = getMealTypeIcon(mealType);
                            return (
                              <button
                                key={mealType}
                                onClick={() => onViewOrder && onViewOrder(orders[0])}
                                className={`w-full text-left px-2 py-1.5 rounded-lg border ${colors.border} ${colors.light} hover:shadow-md transition-all group`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Icon name={icon} size={12} className={colors.text} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold truncate">{mealType}</div>
                                    <div className="text-[10px] opacity-75">
                                      {orders[0].confirmed_at 
                                        ? `${orders[0].total_served || orders[0].served_count || 0} served` 
                                        : 'Not confirmed'}
                                    </div>
                                  </div>
                                  {orders[0].confirmed_at ? (
                                    orders[0].delivered ? (
                                      <Icon name="CheckCircle2" size={12} className="text-emerald-600" />
                                    ) : (
                                      <Icon name="Clock" size={12} className="text-amber-600" />
                                    )
                                  ) : (
                                    <Icon name="AlertCircle" size={12} className="text-red-600" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm font-semibold text-foreground">Meal Types:</div>
            {['Breakfast', 'Lunch', 'Dinner', 'Supper'].map(type => {
              const colors = getMealTypeColor(type);
              const icon = getMealTypeIcon(type);
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded border ${colors.border} ${colors.light} flex items-center justify-center`}>
                    <Icon name={icon} size={12} className={colors.text} />
                  </div>
                  <span className="text-sm text-foreground">{type}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmedOrdersCalendar;
