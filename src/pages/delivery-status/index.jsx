import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { listDeliveryStatuses, getStatus, saveStatus, grantEditOverride, getMealScheduleForDateRange } from '../../services/deliveryService';
import ConfirmDeliveryModal from '../main-dashboard/components/ConfirmDeliveryModal';
import ConfirmedOrdersCalendar from './components/ConfirmedOrdersCalendar';

const mealTypes = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Supper'];

// Helper: lookup meal name from the detail payload map
const lookupMeal = (mealId, detail) => {
  if (!mealId) return '—';
  return detail?.mealsById?.[mealId]?.name || 'Unknown meal';
};

// Calculate total served including alternates and special meals
const calculateDetailTotal = (detail) => {
  const main = Number(detail?.servedCount || 0);
  const alternates = (detail?.alternates || []).reduce((sum, a) => sum + Number(a.residentCount || 0), 0);
  const specials = (detail?.specialMeals || []).reduce((sum, s) => sum + Number(s.residentCount || 0), 0);
  return main + alternates + specials;
};

const calculateAlternatesTotal = (detail) => {
  const alternates = (detail?.alternates || []).reduce((sum, a) => sum + Number(a.residentCount || 0), 0);
  const specials = (detail?.specialMeals || []).reduce((sum, s) => sum + Number(s.residentCount || 0), 0);
  return alternates + specials;
};

const InfoTile = ({ label, value, grow = false, subtle = false }) => (
  <div className={`${grow ? 'md:col-span-4 col-span-1' : ''} rounded-lg bg-muted/40 p-3 h-full`}>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-sm font-semibold ${subtle ? 'text-foreground' : ''}`}>{value ?? '—'}</div>
  </div>
);

const InfoPill = ({ label, value, wide = false }) => (
  <div className={`${wide ? 'min-w-[200px]' : ''} inline-flex flex-col px-3 py-2 rounded-lg bg-muted/60 border text-xs font-semibold text-foreground`}>
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm">{value ?? '—'}</span>
  </div>
);

function toISODate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString().slice(0,10);
}

const DeliveryStatusPage = () => {
  const { role, careHomeId, user, displayName, isAdmin, isCareHomeManager, isSuperAdmin, organizationId } = useAuth();
  const canEdit = role === 'staff' || isCareHomeManager;

  const [careHomes, setCareHomes] = useState([]);
  const [selectedCareHome, setSelectedCareHome] = useState(null);

  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  const [mealType, setMealType] = useState('All');
  const [delivered, setDelivered] = useState('All'); // All | Delivered | Not Delivered
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const [detail, setDetail] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalContext, setEditModalContext] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideProcessing, setOverrideProcessing] = useState(false);
  const [overrideContext, setOverrideContext] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Load care homes for admin/manager
  useEffect(() => {
    const run = async () => {
      // Load care homes for admins and care home managers
      if (isAdmin || isCareHomeManager) {
        try {
          let query = supabase.from('care_homes').select('id, name, organization_id').order('name');
          // If Super Admin is scoped to an organization, limit care homes to that organization
          if (isSuperAdmin && organizationId) {
            query = query.eq('organization_id', organizationId);
          }
          const { data, error } = await query;
          if (!error) setCareHomes(data || []);
        } catch (err) {
          console.error('Error loading care homes for admin:', err);
        }
      }
      
      // Staff and care home managers should only see their own care home
      if (!isAdmin) {
        setSelectedCareHome(careHomeId || null);
        return;
      }
      // Admin can see all care homes
      // Default to all care homes for admins only
      setSelectedCareHome(null);
    };
    run();
  }, [isAdmin, isCareHomeManager, careHomeId]);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    const deliveredFilter = delivered === 'Delivered' ? true : delivered === 'Not Delivered' ? false : undefined;
    const res = await listDeliveryStatuses({
      startDate,
      endDate,
      careHomeId: selectedCareHome,
      mealType,
      delivered: deliveredFilter,
      page,
      pageSize,
    });
    if (res.ok) {
      setRows(res.rows);
      setTotal(res.count || 0);
    }
    setIsLoading(false);
  }, [startDate, endDate, selectedCareHome, mealType, delivered, page, pageSize]);

  // Fetch status rows
  useEffect(() => {
    // Only fetch if care home is chosen (for staff/managers) or admin context is ready
    if (isAdmin || selectedCareHome) {
      fetchRows();
    }
  }, [fetchRows, isAdmin, selectedCareHome]);

  const openDetails = async (r) => {
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    const full = await getStatus(r.care_home_id, r.date, r.meal_type);
      const careHomeName = (isAdmin || isCareHomeManager) ? (careHomes.find(ch => String(ch.id) === String(r.care_home_id))?.name || 'Unknown') : 'Your Facility';
    setDetail(full ? { ...full, careHomeName } : {
      careHomeId: r.care_home_id,
      careHomeName,
      date: r.date,
      mealType: r.meal_type,
      delivered: r.delivered,
      servedCount: r.served_count,
      changedForAll: r.changed_for_all,
      newMainMealId: r.new_main_meal_id,
      newSideMealId: r.new_side_meal_id,
      changeReason: r.change_reason,
      confirmedBy: r.confirmed_by,
      confirmedByName: r.confirmed_by_name,
      confirmedAt: r.confirmed_at,
      mainMealName: r.main_meal_name,
      sideMealName: r.side_meal_name,
      alternates: [],
      specialMeals: [],
      mealsById: {},
    });
    setIsLoadingDetail(false);
  };

  const openEdit = async (r) => {
      // Check if can edit: same day, not already edited, OR has override permission
      const today = new Date().toISOString().slice(0, 10);
      const full = await getStatus(r.care_home_id, r.date, r.meal_type);
      
      // Check if second edit is allowed and hasn't been used yet
      const canDoSecondEdit = full?.allowSecondEdit && !full?.secondEditedAt;
      
      // Date validation: staff can only edit today, managers can edit today and past (not future)
      if (r.date > today && !canDoSecondEdit) {
        setErrorModal({
          isOpen: true,
          title: 'Cannot Edit Future Delivery',
          message: `You cannot edit delivery confirmations for future dates. This meal is scheduled for ${r.date}, but today is ${today}.`,
        });
        return;
      }
      
      // Staff can only edit today's records (unless override granted)
      if (role === 'staff' && r.date !== today && !canDoSecondEdit) {
        setErrorModal({
          isOpen: true,
          title: 'Cannot Edit Past Delivery',
          message: `Staff can only edit delivery confirmations from today (${today}). This meal is from ${r.date}. Contact your manager for assistance.`,
        });
        return;
      }
      
      if (r.edited_at && !canDoSecondEdit) {
        setErrorModal({
          isOpen: true,
          title: 'Edit Limit Reached',
          message: 'This confirmation has already been edited once and cannot be modified again. Contact an admin for override permission.',
        });
        return;
      }
    const careHomeName = (isAdmin || isCareHomeManager) ? (careHomes.find(ch => String(ch.id) === String(r.care_home_id))?.name || 'Unknown') : 'Your Facility';
    
    // Fetch scheduled meal info - if status exists, use it; otherwise fetch from meal schedule
    let scheduledMainId = null;
    let scheduledMainMeal = null;
    let scheduledSides = [];
    let scheduledDesserts = [];
    
    if (full && full.mealsById && Object.keys(full.mealsById).length > 0) {
      // Status exists, use enriched data from getStatus
      scheduledMainId = full.newMainMealId || r.new_main_meal_id || null;
      scheduledMainMeal = full.mealsById[scheduledMainId];
      
      const scheduledSideIds = full.newSideMealIds || [];
      const scheduledDessertIds = full.newDessertIds || [];
      
      scheduledSides = scheduledSideIds.map(id => full.mealsById[id]).filter(Boolean);
      scheduledDesserts = scheduledDessertIds.map(id => full.mealsById[id]).filter(Boolean);
    } else {
      // No status or unconfirmed - fetch scheduled meals from meal_schedule
      const dateObj = new Date(r.date + 'T00:00:00');
      const schedules = await getMealScheduleForDateRange([r.care_home_id], dateObj, dateObj);
      
      // Filter schedules for this specific meal type
      const mealSchedules = schedules.filter(s => 
        s.date === r.date && s.meal_type === r.meal_type
      );
      
      // Group by slot_kind
      const mainSchedule = mealSchedules.find(s => s.slot_kind === 'main');
      const sideSchedules = mealSchedules.filter(s => s.slot_kind === 'side');
      const dessertSchedules = mealSchedules.filter(s => s.slot_kind === 'dessert');
      
      if (mainSchedule) {
        scheduledMainId = mainSchedule.meal_id;
        scheduledMainMeal = mainSchedule.meal || { id: mainSchedule.meal_id, name: r.main_meal_name || 'Main Meal' };
      }
      
      scheduledSides = sideSchedules.map(s => s.meal || { id: s.meal_id, name: 'Side Dish' }).filter(Boolean);
      scheduledDesserts = dessertSchedules.map(s => s.meal || { id: s.meal_id, name: 'Dessert' }).filter(Boolean);
    }
    
    const scheduledInfo = {
      scheduledMainId,
      scheduledMainName: scheduledMainMeal?.name || r.main_meal_name || 'Main Meal',
      scheduledSides,
      scheduledDesserts
    };
    
    setEditModalContext({
      careHomeId: r.care_home_id,
      careHomeName,
      date: r.date,
      mealType: r.meal_type,
      initialStatus: full || null,
      scheduledInfo,
      isSecondEdit: canDoSecondEdit,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (payload) => {
    // Add isSecondEdit flag if this is using override permission
    if (editModalContext?.isSecondEdit) {
      payload.isSecondEdit = true;
    }
    const res = await saveStatus(payload);
    if (res?.ok) {
      setEditModalOpen(false);
      fetchRows(); // Refresh the table
      setSuccessToast({
        title: 'Delivery status updated',
        message: 'Changes saved successfully.',
      });
      setTimeout(() => setSuccessToast(null), 3200);
    } else {
      setErrorModal({
        isOpen: true,
        title: 'Save Failed',
        message: res?.error || 'Failed to save delivery status. Please try again.',
      });
    }
  };

  const openOverrideModal = (detailData) => {
    setOverrideContext(detailData);
    setOverridePassword('');
    setOverrideReason('');
    setOverrideModalOpen(true);
  };

  const handleGrantOverride = async () => {
    if (!overridePassword.trim()) {
      setErrorModal({
        isOpen: true,
        title: 'Password Required',
        message: 'Please enter your password to grant override permission.',
      });
      return;
    }
    if (!overrideReason.trim()) {
      setErrorModal({
        isOpen: true,
        title: 'Reason Required',
        message: 'Please provide a reason for granting override permission.',
      });
      return;
    }
    setOverrideProcessing(true);
    const res = await grantEditOverride(
      overrideContext.careHomeId,
      overrideContext.date,
      overrideContext.mealType,
      overridePassword,
      overrideReason
    );
    setOverrideProcessing(false);
    if (res?.ok) {
      setOverrideModalOpen(false);
      setIsDetailOpen(false);
      fetchRows();
      setSuccessToast({
        title: 'Override granted',
        message: 'Staff can now edit this record one more time.',
      });
      setTimeout(() => setSuccessToast(null), 3200);
    } else {
      setErrorModal({
        isOpen: true,
        title: 'Override Failed',
        message: res?.error || 'Failed to grant override permission. Please try again.',
      });
    }
  };

  const CareHomeName = ({ id }) => {
    if (!id) return <span>-</span>;
    if (!isAdmin && !isCareHomeManager) return <span>Your Facility</span>;
    const name = careHomes.find(ch => String(ch.id) === String(id))?.name;
    return <span>{name || id}</span>;
  };

  // Helper functions for date range filters
  const applyDateFilter = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const getDateFilter = (filterType) => {
    const today = new Date();
    const dateStr = (d) => d.toISOString().split('T')[0];

    switch (filterType) {
      case 'today': {
        const d = new Date(today);
        return { start: dateStr(d), end: dateStr(d) };
      }
      case 'yesterday': {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return { start: dateStr(d), end: dateStr(d) };
      }
      case 'last7': {
        const end = new Date(today);
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start: dateStr(start), end: dateStr(end) };
      }
      case 'lastMonth': {
        const end = new Date(today);
        const start = new Date(today);
        start.setMonth(start.getMonth() - 1);
        return { start: dateStr(start), end: dateStr(end) };
      }
      case 'tomorrow': {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return { start: dateStr(d), end: dateStr(d) };
      }
      case 'next7': {
        const start = new Date(today);
        const end = new Date(today);
        end.setDate(end.getDate() + 7);
        return { start: dateStr(start), end: dateStr(end) };
      }
      case 'next30': {
        const start = new Date(today);
        const end = new Date(today);
        end.setDate(end.getDate() + 30);
        return { start: dateStr(start), end: dateStr(end) };
      }
      default:
        return { start: '', end: '' };
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 pt-32">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <Icon name="ClipboardCheck" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Meal Delivery Status</h1>
              <p className="text-sm text-muted-foreground">View past and present delivery confirmations.</p>
            </div>
          </div>
          <button
            onClick={() => setCalendarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Icon name="CalendarCheck" size={18} />
            <span className="hidden sm:inline">Calendar View</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow p-4 mb-6">
          {/* Quick Filter Buttons */}
          <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Quick Filters</div>
            <div className="flex flex-wrap gap-2">
              {/* Past filters */}
              <button
                onClick={() => {
                  const f = getDateFilter('yesterday');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Yesterday
              </button>
              <button
                onClick={() => {
                  const f = getDateFilter('today');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition-colors border border-indigo-300 dark:border-indigo-700"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const f = getDateFilter('last7');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const f = getDateFilter('lastMonth');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Last Month
              </button>

              <div className="w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

              {/* Future filters */}
              <button
                onClick={() => {
                  const f = getDateFilter('tomorrow');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Tomorrow
              </button>
              <button
                onClick={() => {
                  const f = getDateFilter('next7');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Next 7 Days
              </button>
              <button
                onClick={() => {
                  const f = getDateFilter('next30');
                  applyDateFilter(f.start, f.end);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Next 30 Days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1">From</label>
              <input type="date" className="input" value={startDate} onChange={e => { setPage(1); setStartDate(e.target.value); }} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1">To</label>
              <input type="date" className="input" value={endDate} onChange={e => { setPage(1); setEndDate(e.target.value); }} />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1">Meal</label>
              <select className="input" value={mealType} onChange={e => { setPage(1); setMealType(e.target.value); }}>
                {mealTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-1">Status</label>
              <select className="input" value={delivered} onChange={e => { setPage(1); setDelivered(e.target.value); }}>
                <option>All</option>
                <option>Delivered</option>
                <option>Not Delivered</option>
              </select>
            </div>
            {isAdmin && (
              <div className="flex flex-col lg:col-span-2">
                <label className="text-xs font-semibold mb-1">Care Home</label>
                <select className="input" value={selectedCareHome || ''} onChange={e => { setPage(1); setSelectedCareHome(e.target.value || null); }}>
                  <option value="">All Care Homes</option>
                  {careHomes.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Meal</th>
                  {(isAdmin || isCareHomeManager) && <th className="px-4 py-3 text-left font-semibold">Care Home</th>}
                  <th className="px-4 py-3 text-left font-semibold">Delivered</th>
                  <th className="px-4 py-3 text-left font-semibold">Served</th>
                  <th className="px-4 py-3 text-left font-semibold">Changed For All</th>
                  <th className="px-4 py-3 text-left font-semibold">Confirmed By</th>
                  <th className="px-4 py-3 text-left font-semibold">Confirmed At</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={(isAdmin||isCareHomeManager)?9:8}>Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={(isAdmin||isCareHomeManager)?9:8}>No records found</td></tr>
                ) : (
                  (() => {
                    let lastDate = null;
                    return rows.map((r, idx) => {
                      const isNewDate = r.date !== lastDate;
                      const showDateHeader = isNewDate;
                      lastDate = r.date;
                      const rowDate = new Date(r.date + 'T00:00:00');
                      const today = new Date().toISOString().slice(0, 10);
                      const isToday = r.date === today;
                      const dayName = rowDate.toLocaleDateString('en-GB', { weekday: 'long' });
                      
                      // Create unique key for each row (use id if available, otherwise create composite key)
                      const rowKey = r.id || `${r.care_home_id}-${r.date}-${r.meal_type}`;
                      
                      return (
                        <React.Fragment key={rowKey}>
                          {showDateHeader && (
                            <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-t-2 border-slate-300">
                              <td colSpan={isAdmin ? 9 : 8} className="px-4 py-2">
                                <div className="flex items-center gap-3">
                                  <Icon name="Calendar" size={16} className="text-slate-600" />
                                  <span className="font-bold text-base text-slate-800">
                                    {rowDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </span>
                                  <span className="text-sm text-slate-600">({dayName})</span>
                                  {isToday && (
                                    <span className="ml-auto px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">TODAY</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className={`border-t hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-indigo-50/30' : ''}`}>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{r.date}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{r.meal_type}</div>
                              <div className="text-xs text-muted-foreground">
                                {r.main_meal_name || 'Unknown'}
                                {r.side_meal_name ? ` + ${r.side_meal_name}` : ''}
                              </div>
                            </td>
                            {(isAdmin || isCareHomeManager) && <td className="px-4 py-3"><CareHomeName id={r.care_home_id} /></td>}
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${r.delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {r.delivered ? 'Delivered' : 'Not Delivered'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{r.total_served ?? r.served_count ?? 0}</div>
                              {(r.alternates_count > 0 || r.specials_count > 0) && (
                                <div className="text-[10px] text-muted-foreground">
                                  Main: {r.served_count ?? 0}
                                  {r.alternates_count > 0 && ` · Alt: ${r.alternates_count}`}
                                  {r.specials_count > 0 && ` · Spcl: ${r.specials_count}`}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">{r.changed_for_all ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-3">{r.confirmed_by_name || (r.is_unconfirmed ? <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">PENDING</span> : '-')}</td>
                            <td className="px-4 py-3">{r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openDetails(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                                  <Icon name="Eye" size={14} /> View
                                </button>
                                {/* Only show Confirm/Edit if user is staff/manager AND belongs to the same care home */}
                                {canEdit && r.care_home_id === careHomeId && (
                                  <>
                                    {r.is_unconfirmed ? (
                                      /* Unconfirmed meal - show Confirm button for today and past (not future) */
                                      r.date <= today && (
                                        <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600">
                                          <Icon name="CheckCircle2" size={14} /> Confirm
                                        </button>
                                      )
                                    ) : (
                                      /* Confirmed meal - show Edit if allowed: managers can edit past dates, staff only today */
                                      (((isCareHomeManager && r.date <= today && !r.edited_at) || (role === 'staff' && r.date === today && !r.edited_at)) || (r.allow_second_edit && !r.second_edited_at)) && (
                                        <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90">
                                          <Icon name="Edit" size={14} /> Edit
                                          {r.allow_second_edit && !r.second_edited_at && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded bg-green-500 text-white text-[10px] font-bold">OVERRIDE</span>
                                          )}
                                        </button>
                                      )
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t bg-muted/30 text-sm">
            <div>
              {total} record{total !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-2 py-1 rounded border disabled:opacity-50">Prev</button>
              <span>Page {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-2 py-1 rounded border disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4" onClick={() => setIsDetailOpen(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivery Status</div>
                <h3 className="text-xl font-bold">Full Details</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${detail?.delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                  {detail?.delivered ? 'Delivered' : 'Not Delivered'}
                </span>
                <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-muted rounded-full">
                  <Icon name="X" size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {isLoadingDetail ? (
                <div className="text-muted-foreground">Loading details…</div>
              ) : detail ? (
                <div className="space-y-5 text-sm">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4">
                      <div className="text-xs uppercase tracking-wider text-indigo-600 font-bold mb-1">Total Served</div>
                      <div className="text-3xl font-black text-indigo-900">{calculateDetailTotal(detail)}</div>
                      <div className="text-xs text-indigo-600 mt-1">residents</div>
                    </div>
                    <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4">
                      <div className="text-xs uppercase tracking-wider text-emerald-600 font-bold mb-1">Main Meal</div>
                      <div className="text-3xl font-black text-emerald-900">{detail.servedCount ?? 0}</div>
                      <div className="text-xs text-emerald-600 mt-1">residents</div>
                    </div>
                    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 p-4">
                      <div className="text-xs uppercase tracking-wider text-violet-600 font-bold mb-1">Alternates & Special</div>
                      <div className="text-3xl font-black text-violet-900">{calculateAlternatesTotal(detail)}</div>
                      <div className="text-xs text-violet-600 mt-1">residents</div>
                    </div>
                  </div>

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <InfoTile label="Date" value={detail.date} />
                    <InfoTile label="Meal" value={detail.mealType} />
                    <InfoTile label="Care Home" value={detail.careHomeName || (isAdmin ? <CareHomeName id={detail.careHomeId} /> : 'Your Facility')} />
                    <InfoTile label="Changed For All" value={detail.changedForAll ? 'Yes' : 'No'} />
                    <InfoTile label="Confirmed By" value={detail.confirmedByName || '—'} />
                    <InfoTile label="Confirmed At" value={detail.confirmedAt ? new Date(detail.confirmedAt).toLocaleString() : '—'} />
                    <InfoTile label="Reason" value={detail.changeReason || '—'} grow />
                  </div>

                  {/* Meals Served Section */}
                  <div className="rounded-xl border-2 bg-slate-50 p-5 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Icon name="UtensilsCrossed" size={16} className="text-slate-600" />
                      <div className="font-bold text-base">Meals Served</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Main Meal</div>
                        <div className="text-lg font-bold text-slate-900">{detail.newMainMeal || detail.mainMealName || lookupMeal(detail.newMainMealId, detail)}</div>
                        <div className="text-xs text-slate-500 mt-1">Served to {detail.servedCount ?? 0} residents</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border-2 border-slate-200">
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 font-semibold">Side / Dessert</div>
                        {(() => {
                          const sideIds = Array.from(new Set([].concat(detail.newSideMealIds || detail.new_side_meal_ids || [], detail.newSideMealId ? [detail.newSideMealId] : []).filter(Boolean)));
                          const dessertIds = Array.from(new Set([].concat(detail.newDessertIds || detail.new_dessert_ids || [], detail.newDessertMealId ? [detail.newDessertMealId] : []).filter(Boolean)));
                          const sideNames = (sideIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          const dessertNames = (dessertIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          const primarySide = sideNames.length ? sideNames.join(', ') : (detail.newSideMeal || detail.sideMealName || lookupMeal(detail.newSideMealId, detail) || 'None');
                          return (
                            <div>
                              <div className="text-lg font-bold text-slate-900">{primarySide}</div>
                              {dessertNames.length > 0 && (
                                <div className="text-sm text-slate-500 mt-1">Dessert: {dessertNames.join(', ')}</div>
                              )}
                              <div className="text-xs text-slate-500 mt-1">Accompaniment</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {detail.specialMeals?.length > 0 && (
                    <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-amber-300">
                        <Icon name="Sparkles" size={16} className="text-amber-600" />
                        <div className="font-bold text-base text-amber-900">Special Meals</div>
                        <span className="ml-auto text-xs font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{detail.specialMeals.length} variation{detail.specialMeals.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-3">
                        {detail.specialMeals.map((s, idx) => {
                          const mainMeal = detail.mealsById?.[s.specialMealId];
                          const specialSideIds = s.specialSideMealIds || (s.specialSideMealId ? [s.specialSideMealId] : []);
                          const sideMeals = (specialSideIds || []).map(id => detail.mealsById?.[id]).filter(Boolean);
                          const sideCostTotal = sideMeals.reduce((sum, m) => sum + Number(m?.cost_per_person || 0), 0);
                          const specialDessertIds = Array.from(new Set([
                            s.specialDessertIds,
                            s.specialDessertId,
                            s.special_dessert_ids,
                            s.special_dessert_id,
                            s.specialDessertMealIds,
                            s.specialDessertMealId,
                          ].flatMap(v => Array.isArray(v) ? v : (v ? [v] : [])).filter(Boolean)));
                          const dessertMeals = (specialDessertIds || []).map(id => detail.mealsById?.[id]).filter(Boolean);
                          const dessertCostTotal = dessertMeals.reduce((sum, m) => sum + Number(m?.cost_per_person || 0), 0);
                          const cost = (Number(mainMeal?.cost_per_person || 0) + sideCostTotal + dessertCostTotal) * Number(s.residentCount || 0);
                          const sideNames = (specialSideIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          const dessertNames = (specialDessertIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          return (
                            <div key={idx} className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm">{s.residentCount || 0}</div>
                                  <div className="text-xs text-amber-700 font-semibold">resident{(s.residentCount || 0) !== 1 ? 's' : ''}</div>
                                </div>
                                {/* cost moved to Cost Breakdown section */}
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Main Meal</div>
                                  <div className="text-sm font-semibold text-slate-800">{lookupMeal(s.specialMealId, detail)}</div>
                                </div>
                                {sideNames.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Side Meal{sideNames.length>1? 's':''}</div>
                                    <div className="text-sm font-semibold text-slate-800">{sideNames.join(', ')}</div>
                                  </div>
                                )}
                                {dessertNames.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Dessert{dessertNames.length>1? 's':''}</div>
                                    <div className="text-sm font-semibold text-slate-800">{dessertNames.join(', ')}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Reason</div>
                                  <div className="text-sm text-slate-700 italic">{s.reason || '—'}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  

                  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-blue-300">
                      <Icon name="Users" size={16} className="text-blue-600" />
                      <div className="font-bold text-base text-blue-900">Resident Alternates</div>
                      {detail.alternates?.length > 0 && (
                        <span className="ml-auto text-xs font-bold bg-blue-200 text-blue-800 px-2 py-1 rounded-full">{detail.alternates.length} alternate{detail.alternates.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {detail.alternates?.length ? (
                      <div className="space-y-3">
                        {detail.alternates.map((a, idx) => {
                          const mainMeal = detail.mealsById?.[a.alternateMealId];
                          const altSideIds = a.alternateSideMealIds || (a.alternateSideMealId ? [a.alternateSideMealId] : []);
                          const sideMeals = (altSideIds || []).map(id => detail.mealsById?.[id]).filter(Boolean);
                          const sideCostTotal = sideMeals.reduce((sum, m) => sum + Number(m?.cost_per_person || 0), 0);
                          const altDessertIds = Array.from(new Set([
                            a.alternateDessertIds,
                            a.alternateDessertId,
                            a.alternate_dessert_ids,
                            a.alternate_dessert_id,
                            a.alternateDessertMealIds,
                            a.alternateDessertMealId,
                          ].flatMap(v => Array.isArray(v) ? v : (v ? [v] : [])).filter(Boolean)));
                          const dessertMeals = (altDessertIds || []).map(id => detail.mealsById?.[id]).filter(Boolean);
                          const dessertCostTotal = dessertMeals.reduce((sum, m) => sum + Number(m?.cost_per_person || 0), 0);
                          const cost = (Number(mainMeal?.cost_per_person || 0) + sideCostTotal + dessertCostTotal) * Number(a.residentCount || 0);
                          const sideNames = (altSideIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          const dessertNames = (altDessertIds || []).map(id => lookupMeal(id, detail)).filter(Boolean);
                          return (
                            <div key={idx} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-sm">{a.residentCount || 0}</div>
                                  <div className="text-xs text-blue-700 font-semibold">resident{(a.residentCount || 0) !== 1 ? 's' : ''}</div>
                                </div>
                                {/* cost moved to Cost Breakdown section */}
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Alternate Main Meal</div>
                                  <div className="text-sm font-semibold text-slate-800">{lookupMeal(a.alternateMealId, detail)}</div>
                                </div>
                                {sideNames.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Alternate Side Meal{sideNames.length>1? 's':''}</div>
                                    <div className="text-sm font-semibold text-slate-800">{sideNames.join(', ')}</div>
                                  </div>
                                )}
                                {dessertNames.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Alternate Dessert{dessertNames.length>1? 's':''}</div>
                                    <div className="text-sm font-semibold text-slate-800">{dessertNames.join(', ')}</div>
                                  </div>
                                )}
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Reason</div>
                                  <div className="text-sm text-slate-700 italic">{a.reason || '—'}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-blue-600/70 text-sm bg-white rounded-lg p-4 border border-blue-200 text-center">No alternates recorded for this meal.</div>
                    )}
                  </div>

                  {/* Quantity Served Stats */}
                  <div className="rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-300">
                      <Icon name="BarChart3" size={16} className="text-slate-700" />
                      <div className="font-bold text-base text-slate-900">Quantity Served Summary</div>
                    </div>
                    {(() => {
                      const mainQty = Number(detail.servedCount ?? detail.served_count ?? 0);
                      const sideMealCounts = detail.sideMealCounts || {};
                      const dessertCounts = detail.dessertCounts || {};
                      const mealsById = detail.mealsById || {};

                      // Get all side meals with their counts
                      const sideStats = Object.entries(sideMealCounts).map(([sideId, count]) => ({
                        id: sideId,
                        name: mealsById[sideId]?.name || lookupMeal(sideId, detail),
                        count: Number(count || 0),
                        percentage: mainQty > 0 ? Math.round((Number(count || 0) / mainQty) * 100) : 0,
                      }));

                      // Get all desserts with their counts
                      const dessertStats = Object.entries(dessertCounts).map(([dessertId, count]) => ({
                        id: dessertId,
                        name: mealsById[dessertId]?.name || lookupMeal(dessertId, detail),
                        count: Number(count || 0),
                        percentage: mainQty > 0 ? Math.round((Number(count || 0) / mainQty) * 100) : 0,
                      }));

                      return (
                        <div className="space-y-4">
                          {/* Main meal stat */}
                          <div className="bg-white rounded-lg p-4 border-2 border-indigo-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-indigo-900">Main Meal</div>
                              <div className="text-2xl font-black text-indigo-600">{mainQty}</div>
                            </div>
                            <div className="w-full bg-indigo-100 rounded-full h-2">
                              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                            <div className="text-xs text-indigo-600 mt-2">100% of residents served</div>
                          </div>

                          {/* Sides stats */}
                          {sideStats.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-bold text-blue-900 uppercase tracking-wide">Side Meals</div>
                              {sideStats.map(side => (
                                <div key={side.id} className="bg-white rounded-lg p-3 border border-blue-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium text-slate-800 truncate">{side.name}</div>
                                    <div className="flex items-baseline gap-2 ml-2">
                                      <div className="text-lg font-bold text-blue-600">{side.count}</div>
                                      <div className="text-xs text-slate-500">({side.percentage}%)</div>
                                    </div>
                                  </div>
                                  <div className="w-full bg-blue-100 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${side.percentage}%` }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Desserts stats */}
                          {dessertStats.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-sm font-bold text-pink-900 uppercase tracking-wide">Desserts</div>
                              {dessertStats.map(dessert => (
                                <div key={dessert.id} className="bg-white rounded-lg p-3 border border-pink-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="font-medium text-slate-800 truncate">{dessert.name}</div>
                                    <div className="flex items-baseline gap-2 ml-2">
                                      <div className="text-lg font-bold text-pink-600">{dessert.count}</div>
                                      <div className="text-xs text-slate-500">({dessert.percentage}%)</div>
                                    </div>
                                  </div>
                                  <div className="w-full bg-pink-100 rounded-full h-2">
                                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${dessert.percentage}%` }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {sideStats.length === 0 && dessertStats.length === 0 && (
                            <div className="text-center py-6 text-slate-500">
                              <Icon name="Info" size={20} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No individual side or dessert counts recorded</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Cost Breakdown (moved below Resident Alternates) - NEW LAYOUT with individual items */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Icon name="Calculator" size={16} className="text-slate-700" />
                      <div className="font-bold text-base">Cost Breakdown</div>
                    </div>
                    {(() => {
                      const mealsById = detail.mealsById || {};
                      const getMealById = (id) => mealsById[id] || null;
                      const dedupe = (arr) => Array.from(new Set([].concat(arr || []).filter(Boolean)));
                      const nameFor = (id) => mealsById[id]?.name || lookupMeal(id, detail) || '';

                      // Resolve main meal
                      let mainId = detail.newMainMealId || detail.new_main_meal_id || null;
                      if (!mainId && (detail.newMainMeal || detail.mainMealName)) {
                        const name = detail.newMainMeal || detail.mainMealName;
                        const found = Object.keys(mealsById).find(k => mealsById[k]?.name === name);
                        if (found) mainId = found;
                      }

                      const mainMeal = getMealById(mainId);
                      const mainBase = Number(mainMeal?.cost_per_person || 0);
                      const mainQty = Number(detail.servedCount ?? detail.served_count ?? 0);

                      const mainSideIds = dedupe(detail.newSideMealIds || detail.new_side_meal_ids || (detail.newSideMealId ? [detail.newSideMealId] : []));
                      const mainDessertIds = dedupe(detail.newDessertIds || detail.new_dessert_ids || (detail.newDessertMealId ? [detail.newDessertMealId] : []));

                      // Build individual side costs from sideMealCounts if available
                      const sideMealCounts = detail.sideMealCounts || {};
                      const sideCostBreakdown = {};
                      Object.entries(sideMealCounts).forEach(([sideId, count]) => {
                        const sideMeal = getMealById(sideId);
                        if (sideMeal) {
                          sideCostBreakdown[sideId] = {
                            cost: Number(sideMeal.cost_per_person || 0),
                            count: Number(count || 0),
                            subtotal: Number(sideMeal.cost_per_person || 0) * Number(count || 0),
                          };
                        }
                      });

                      // Build individual dessert costs from dessertCounts if available
                      const dessertCounts = detail.dessertCounts || {};
                      const dessertCostBreakdown = {};
                      Object.entries(dessertCounts).forEach(([dessertId, count]) => {
                        const dessertMeal = getMealById(dessertId);
                        if (dessertMeal) {
                          dessertCostBreakdown[dessertId] = {
                            cost: Number(dessertMeal.cost_per_person || 0),
                            count: Number(count || 0),
                            subtotal: Number(dessertMeal.cost_per_person || 0) * Number(count || 0),
                          };
                        }
                      });

                      // Only show sides/desserts that have explicit counts (don't use fallback to mainQty)
                      const sidesToDisplay = Object.entries(sideCostBreakdown);
                      const dessertsToDisplay = Object.entries(dessertCostBreakdown);

                      const mainMainSubtotal = mainBase * mainQty;
                      const sidesCostTotal = Object.values(sideCostBreakdown).reduce((s, info) => s + Number(info.subtotal || 0), 0);
                      const dessertsCostTotal = Object.values(dessertCostBreakdown).reduce((s, info) => s + Number(info.subtotal || 0), 0);

                      // Alternates
                      const alternateLines = (detail.alternates || []).map(a => {
                        const id = a.alternateMealId;
                        const meal = getMealById(id);
                        const base = Number(meal?.cost_per_person || 0);
                        const qty = Number(a.residentCount || 0);
                        const sideIds = dedupe(a.alternateSideMealIds || a.alternate_side_meal_ids || []);
                        const dessertIds = dedupe(a.alternateDessertIds || a.alternate_dessert_ids || []);
                        const sideCost = sideIds.reduce((s, sid) => s + Number(getMealById(sid)?.cost_per_person || 0), 0);
                        const dessertCost = dessertIds.reduce((s, did) => s + Number(getMealById(did)?.cost_per_person || 0), 0);
                        const unit = base + sideCost + dessertCost;
                        return { name: nameFor(id), unit, qty, subtotal: unit * qty };
                      });

                      // Specials
                      const specialLines = (detail.specialMeals || []).map(s => {
                        const id = s.specialMealId;
                        const meal = getMealById(id);
                        const base = Number(meal?.cost_per_person || 0);
                        const qty = Number(s.residentCount || 0);
                        const sideIds = dedupe(s.specialSideMealIds || s.special_side_meal_ids || []);
                        const dessertIds = dedupe(s.specialDessertIds || s.special_dessert_ids || []);
                        const sideCost = sideIds.reduce((s, sid) => s + Number(getMealById(sid)?.cost_per_person || 0), 0);
                        const dessertCost = dessertIds.reduce((s, did) => s + Number(getMealById(did)?.cost_per_person || 0), 0);
                        const unit = base + sideCost + dessertCost;
                        return { name: nameFor(id), unit, qty, subtotal: unit * qty };
                      });

                      const grandTotal = mainMainSubtotal + sidesCostTotal + dessertsCostTotal + alternateLines.reduce((s, l) => s + Number(l.subtotal || 0), 0) + specialLines.reduce((s, l) => s + Number(l.subtotal || 0), 0);

                      return (
                        <div className="text-sm space-y-2">
                          <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-slate-700 mb-2 bg-slate-50/80 rounded-md p-2">
                            <div>Item</div>
                            <div className="text-right">Unit Cost</div>
                            <div className="text-right">Qty Served</div>
                            <div className="text-right">Subtotal</div>
                            <div className="text-right">Notes</div>
                          </div>

                          {/* Main meal row */}
                          <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-slate-50/40 rounded-md transition-colors">
                            <div className="font-semibold text-indigo-700">
                              Main: {mainMeal?.name || nameFor(mainId) || '—'}
                            </div>
                            <div className="text-right">£{Number(mainBase || 0).toFixed(2)}</div>
                            <div className="text-right font-semibold">{mainQty}</div>
                            <div className="text-right font-semibold">£{Number(mainMainSubtotal || 0).toFixed(2)}</div>
                            <div className="text-right text-xs text-muted-foreground">Main residents</div>
                          </div>

                          {/* Individual side meals */}
                          {sidesToDisplay.length > 0 && (
                            <>
                              {sidesToDisplay.map(([sideId, sideInfo]) => {
                                const sideMeal = getMealById(sideId);
                                return (
                                  <div key={sideId} className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-50 hover:bg-blue-50/30 rounded-md transition-colors">
                                    <div className="font-medium text-blue-700 pl-4">
                                      Side: {sideMeal?.name || 'Side Meal'}
                                    </div>
                                    <div className="text-right">£{Number(sideInfo.cost || 0).toFixed(2)}</div>
                                    <div className="text-right font-semibold">{sideInfo.count}</div>
                                    <div className="text-right font-semibold">£{Number(sideInfo.subtotal || 0).toFixed(2)}</div>
                                    <div className="text-right text-xs text-muted-foreground">of {mainQty}</div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Individual desserts */}
                          {dessertsToDisplay.length > 0 && (
                            <>
                              {dessertsToDisplay.map(([dessertId, dessertInfo]) => {
                                const dessertMeal = getMealById(dessertId);
                                return (
                                  <div key={dessertId} className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-50 hover:bg-pink-50/30 rounded-md transition-colors">
                                    <div className="font-medium text-pink-700 pl-4">
                                      Dessert: {dessertMeal?.name || 'Dessert'}
                                    </div>
                                    <div className="text-right">£{Number(dessertInfo.cost || 0).toFixed(2)}</div>
                                    <div className="text-right font-semibold">{dessertInfo.count}</div>
                                    <div className="text-right font-semibold">£{Number(dessertInfo.subtotal || 0).toFixed(2)}</div>
                                    <div className="text-right text-xs text-muted-foreground">of {mainQty}</div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Main subtotal */}
                          <div className="grid grid-cols-5 gap-2 py-2 border-t border-slate-200 bg-indigo-50/40 rounded-md font-semibold">
                            <div className="col-span-3 text-right">Main Meal Total:</div>
                            <div className="text-right">£{Number(mainMainSubtotal || 0).toFixed(2)}</div>
                            <div></div>
                          </div>

                          {/* Alternates rows */}
                          {alternateLines.map((l, i) => (
                            <div key={`alt-${i}`} className="mt-2">
                              <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-amber-50/30 rounded-md transition-colors">
                                <div className="font-semibold text-amber-700">
                                  Alternate: {l.name}
                                </div>
                                <div className="text-right">£{Number(l.unit || 0).toFixed(2)}</div>
                                <div className="text-right font-semibold">{l.qty}</div>
                                <div className="text-right font-semibold">£{Number(l.subtotal || 0).toFixed(2)}</div>
                                <div className="text-right text-xs text-muted-foreground">Alternative residents</div>
                              </div>
                            </div>
                          ))}

                          {/* Special rows */}
                          {specialLines.map((l, i) => (
                            <div key={`spec-${i}`} className="mt-2">
                              <div className="grid grid-cols-5 gap-2 items-start py-2 border-t border-slate-100 hover:bg-emerald-50/30 rounded-md transition-colors">
                                <div className="font-semibold text-emerald-700">
                                  Special: {l.name}
                                </div>
                                <div className="text-right">£{Number(l.unit || 0).toFixed(2)}</div>
                                <div className="text-right font-semibold">{l.qty}</div>
                                <div className="text-right font-semibold">£{Number(l.subtotal || 0).toFixed(2)}</div>
                                <div className="text-right text-xs text-muted-foreground">Special diet residents</div>
                              </div>
                            </div>
                          ))}

                          <div className="mt-4 pt-3 border-t-2 border-slate-300 grid grid-cols-5 gap-2 text-base font-bold">
                            <div className="col-span-3 text-right">GRAND TOTAL:</div>
                            <div className="text-right text-indigo-700">£{Number(grandTotal || 0).toFixed(2)}</div>
                            <div></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {detail.editedAt && (
                    <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-amber-300">
                        <Icon name="Edit" size={14} className="text-amber-700" />
                        <div className="text-sm font-bold text-amber-800">First Edit History</div>
                      </div>
                      <div className="text-sm text-amber-700 space-y-1">
                        <div><span className="font-semibold">Edited At:</span> {new Date(detail.editedAt).toLocaleString()}</div>
                        <div><span className="font-semibold">Reason:</span> {detail.editReason || '—'}</div>
                      </div>
                    </div>
                  )}

                  {detail.allowSecondEdit && !detail.secondEditedAt && (
                    <div className="rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon name="ShieldCheck" size={16} className="text-green-700" />
                        <div className="text-sm font-bold text-green-800">Admin Override Granted</div>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <div><span className="font-semibold">Approved By:</span> {detail.secondEditAllowedByName || '—'}</div>
                        <div><span className="font-semibold">Granted At:</span> {detail.secondEditAllowedAt ? new Date(detail.secondEditAllowedAt).toLocaleString() : '—'}</div>
                        <div><span className="font-semibold">Reason:</span> {detail.secondEditAllowedReason || '—'}</div>
                        <div className="text-xs mt-2 bg-green-100 p-2 rounded border border-green-300">
                          <Icon name="Info" size={12} className="inline mr-1" />
                          Staff can now edit this record one more time.
                        </div>
                      </div>
                    </div>
                  )}

                  {detail.secondEditedAt && (
                    <div className="rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-pink-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-red-300">
                        <Icon name="AlertCircle" size={14} className="text-red-700" />
                        <div className="text-sm font-bold text-red-800">Second Edit History (Override Used)</div>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        <div><span className="font-semibold">Approved By:</span> {detail.secondEditAllowedByName || '—'}</div>
                        <div><span className="font-semibold">Edited By:</span> {detail.secondEditedByName || '—'}</div>
                        <div><span className="font-semibold">Edited At:</span> {new Date(detail.secondEditedAt).toLocaleString()}</div>
                        <div><span className="font-semibold">Reason:</span> {detail.secondEditReason || '—'}</div>
                        <div className="text-xs mt-2 bg-red-100 p-2 rounded border border-red-300">
                          <Icon name="Lock" size={12} className="inline mr-1" />
                          Override permission has been used. No further edits allowed.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">No details.</div>
              )}
            </div>
            <div className="p-4 border-t flex justify-between gap-2 bg-muted/40">
              <div className="flex gap-2">
                {isAdmin && detail && detail.editedAt && !detail.allowSecondEdit && !detail.secondEditedAt && (
                  <button 
                    className="px-4 py-2 rounded bg-orange-600 text-white font-semibold hover:bg-orange-700 flex items-center gap-2"
                    onClick={() => openOverrideModal(detail)}
                  >
                    <Icon name="ShieldAlert" size={16} />
                    Allow Override
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && detail && (((isCareHomeManager && detail.date <= new Date().toISOString().slice(0, 10) && !detail.editedAt) || (role === 'staff' && detail.date === new Date().toISOString().slice(0, 10) && !detail.editedAt)) || (detail.allowSecondEdit && !detail.secondEditedAt)) && (
                  <button className="px-4 py-2 rounded bg-accent text-accent-foreground" onClick={() => { setIsDetailOpen(false); openEdit({ care_home_id: detail.careHomeId, date: detail.date, meal_type: detail.mealType, edited_at: detail.editedAt }); }}>Edit</button>
                )}
                <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={() => setIsDetailOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10001] p-4" onClick={() => setOverrideModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center gap-3">
              <Icon name="ShieldAlert" size={22} className="text-orange-600" />
              <div>
                <h3 className="text-lg font-bold">Grant Edit Override</h3>
                <p className="text-xs text-muted-foreground">Allow staff to edit this record one more time</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <Icon name="AlertTriangle" size={14} className="inline mr-2" />
                This will allow staff to make <strong>one additional edit</strong> to this delivery record.
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Your Admin Password</label>
                <input
                  type="password"
                  value={overridePassword}
                  onChange={e => setOverridePassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Enter your password to confirm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Reason for Override</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Why is this override necessary?"
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-slate-50">
              <button 
                className="px-4 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                onClick={() => setOverrideModalOpen(false)}
                disabled={overrideProcessing}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
                onClick={handleGrantOverride}
                disabled={overrideProcessing}
              >
                {overrideProcessing ? 'Granting...' : 'Grant Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <ConfirmDeliveryModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        careHomeId={editModalContext?.careHomeId}
        careHomeName={editModalContext?.careHomeName}
        date={editModalContext?.date}
        mealType={editModalContext?.mealType}
        initialStatus={editModalContext?.initialStatus}
        scheduledInfo={editModalContext?.scheduledInfo}
        readOnly={false}
        onSave={handleSaveEdit}
        userId={user?.id}
        userName={displayName}
        userRole={role}
        isSecondEdit={editModalContext?.isSecondEdit || false}
      />

      {successToast && (
        <div className="fixed top-4 right-4 z-[9999] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 transition-transform duration-200">
          <div className="mt-0.5"><Icon name="CheckCircle2" size={18} /></div>
          <div>
            <div className="font-semibold text-sm">{successToast.title}</div>
            <div className="text-xs opacity-90">{successToast.message}</div>
          </div>
          <button className="ml-2 opacity-70 hover:opacity-100" onClick={() => setSuccessToast(null)}>
            <Icon name="X" size={14} />
          </button>
        </div>
      )}

      {/* Error Modal Dialog */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[20000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <Icon name="AlertCircle" size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{errorModal.title}</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{errorModal.message}</p>
            </div>
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Orders Calendar */}
      <ConfirmedOrdersCalendar
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        careHomeId={selectedCareHome}
        onViewOrder={(order) => {
          setCalendarOpen(false);
          openDetails(order);
        }}
      />
    </div>
  );
};

export default DeliveryStatusPage;
