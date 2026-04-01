import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/AppIcon';
import Header from '../../components/navigation/Header';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';
import { writeAuditLog } from '../../services/activityAuditService';

const ActivityExpenses = () => {
  const { user, careHomeId, isAdmin, isSuperAdmin, isOrgAdmin, isCareHomeManager } = useAuth();
  const canViewAllHomes = isSuperAdmin || isOrgAdmin || isAdmin;
  const [expenses, setExpenses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [careHomes, setCareHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Multi-care-home support
  const [selectedCareHomeId, setSelectedCareHomeId] = useState(canViewAllHomes ? 'all' : (careHomeId || ''));

  const emptyForm = {
    activity_id: '',
    description: '',
    expense_category: 'supplies',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    vendor: '',
    notes: '',
    care_home_id: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);

  // Budget feature
  const [monthlyBudget, setMonthlyBudget] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  const categories = ['equipment', 'supplies', 'refreshments', 'transport', 'venue', 'services', 'other'];
  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'budget', label: 'Budget Allocation' },
    { value: 'petty_cash', label: 'Petty Cash' },
  ];

  const isAllCareHomesSelected = canViewAllHomes && selectedCareHomeId === 'all';

  const isImageReceipt = (url = '') => /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|#|$)/i.test(url);
  const isPdfReceipt = (url = '') => /\.pdf(\?|#|$)/i.test(url);

  // Data loading
  useEffect(() => {
    fetchCareHomes();
  }, []);

  useEffect(() => {
    if (!canViewAllHomes && careHomeId && !selectedCareHomeId) setSelectedCareHomeId(careHomeId);
  }, [careHomeId, canViewAllHomes, selectedCareHomeId]);

  useEffect(() => {
    if (selectedCareHomeId) {
      fetchExpenses();
      fetchActivities();
      fetchBudget();
    }
  }, [selectedCareHomeId]);

  const fetchCareHomes = async () => {
    try {
      const { data, error } = await supabase.from('care_homes').select('id, name').order('name');
      if (error) throw error;
      setCareHomes(data || []);
      if (canViewAllHomes) {
        setSelectedCareHomeId((current) => current || 'all');
      } else if (!selectedCareHomeId && data?.length > 0) {
        setSelectedCareHomeId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching care homes:', err);
    }
  };

  const fetchBudget = useCallback(async () => {
    try {
      const effectiveId = selectedCareHomeId || careHomeId;
      if (!effectiveId || effectiveId === 'all') {
        // For 'all' care homes, sum all budgets
        const { data, error } = await supabase
          .from('expense_budgets')
          .select('monthly_budget');
        if (error) throw error;
        const total = (data || []).reduce((sum, b) => sum + Number(b.monthly_budget || 0), 0);
        setMonthlyBudget(total > 0 ? total : null);
      } else {
        const { data, error } = await supabase
          .from('expense_budgets')
          .select('monthly_budget')
          .eq('care_home_id', effectiveId)
          .maybeSingle();
        if (error) throw error;
        setMonthlyBudget(data?.monthly_budget ? Number(data.monthly_budget) : null);
      }
    } catch (err) {
      // Table may not exist yet — silently ignore
      console.warn('Budget fetch skipped:', err.message);
      setMonthlyBudget(null);
    }
  }, [selectedCareHomeId, careHomeId]);

  const saveBudget = async () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount < 0) return;
    setBudgetSaving(true);
    try {
      const effectiveId = selectedCareHomeId === 'all' ? null : (selectedCareHomeId || careHomeId);
      if (!effectiveId) {
        alert('Please select a specific care home to set a budget.');
        return;
      }
      const { error } = await supabase
        .from('expense_budgets')
        .upsert(
          { care_home_id: effectiveId, monthly_budget: amount, updated_by: user?.id, updated_at: new Date().toISOString() },
          { onConflict: 'care_home_id' }
        );
      if (error) throw error;
      setMonthlyBudget(amount);
      setShowBudgetModal(false);
      setBudgetInput('');
    } catch (err) {
      console.error('Error saving budget:', err);
      alert(`Failed to save budget: ${err.message || err.details || JSON.stringify(err)}\n\nIf the table is missing, run the SQL migration file in Supabase.`);
    } finally {
      setBudgetSaving(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const effectiveId = selectedCareHomeId || careHomeId;
      let query = supabase.from('activities').select('id, name').order('name');
      if (effectiveId && effectiveId !== 'all') {
        query = query.or(`care_home_id.eq.${effectiveId},care_home_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveId = selectedCareHomeId || careHomeId;
      let query = supabase
        .from('activity_expenses')
        .select('*, activities ( id, name )')
        .order('expense_date', { ascending: false });

      if (effectiveId && effectiveId !== 'all') {
        query = query.eq('care_home_id', effectiveId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCareHomeId, careHomeId]);

  // Receipt upload helper
  const uploadReceipt = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const effectiveId = selectedCareHomeId || careHomeId || 'general';
    const filePath = `${effectiveId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('expense-receipts')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(filePath);

    return { filePath, publicUrl: urlData.publicUrl };
  };

  const deleteReceipt = async (url) => {
    if (!url) return;
    try {
      const parts = url.split('/expense-receipts/');
      if (parts.length === 2) {
        await supabase.storage.from('expense-receipts').remove([parts[1]]);
      }
    } catch (err) {
      console.error('Error deleting receipt:', err);
    }
  };

  // Form handlers
  const openNewForm = () => {
    setEditingExpense(null);
    setFormData({
      ...emptyForm,
      care_home_id: isAllCareHomesSelected ? '' : (selectedCareHomeId || careHomeId || ''),
    });
    setReceiptFile(null);
    setReceiptPreview(null);
    setShowForm(true);
  };

  const openEditForm = (expense) => {
    setEditingExpense(expense);
    setFormData({
      activity_id: expense.activity_id || '',
      description: expense.description || '',
      expense_category: expense.expense_category || 'supplies',
      amount: expense.amount?.toString() || '',
      expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
      payment_method: expense.payment_method || 'cash',
      vendor: expense.vendor || '',
      notes: expense.notes || '',
      care_home_id: expense.care_home_id || selectedCareHomeId || '',
    });
    setReceiptFile(null);
    setReceiptPreview(expense.receipt_url || null);
    setShowForm(true);
    setSelectedExpense(null);
  };

  const handleReceiptSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let receipt_url = editingExpense?.receipt_url || null;
      let receipt_stored = editingExpense?.receipt_stored || false;

      if (receiptFile) {
        setUploading(true);
        if (receipt_url) await deleteReceipt(receipt_url);
        const uploaded = await uploadReceipt(receiptFile);
        receipt_url = uploaded.publicUrl;
        receipt_stored = true;
        setUploading(false);
      }

      const effectiveCareHomeId = formData.care_home_id || (isAllCareHomesSelected ? '' : selectedCareHomeId) || careHomeId;

      if (!effectiveCareHomeId) {
        throw new Error('Please select a care home for this expense.');
      }

      const payload = {
        care_home_id: effectiveCareHomeId,
        activity_id: formData.activity_id || null,
        description: formData.description,
        expense_category: formData.expense_category,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        vendor: formData.vendor || null,
        notes: formData.notes || null,
        receipt_url,
        receipt_stored,
        submitted_by: user?.id || null,
        approval_status: 'approved',
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('activity_expenses')
          .update(payload)
          .eq('id', editingExpense.id);
        if (error) throw error;
        writeAuditLog({ tableName: 'activity_expenses', recordId: editingExpense.id, action: 'UPDATE', newValues: payload });
      } else {
        const { data: inserted, error } = await supabase
          .from('activity_expenses')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (inserted?.id) writeAuditLog({ tableName: 'activity_expenses', recordId: inserted.id, action: 'INSERT', newValues: inserted });
      }

      setShowForm(false);
      setEditingExpense(null);
      setReceiptFile(null);
      setReceiptPreview(null);
      await fetchExpenses();
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Failed to save expense: ' + err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      if (expense.receipt_url) await deleteReceipt(expense.receipt_url);
      const { error } = await supabase.from('activity_expenses').delete().eq('id', expense.id);
      if (error) throw error;
      writeAuditLog({ tableName: 'activity_expenses', recordId: expense.id, action: 'DELETE', oldValues: { description: expense.description, amount: expense.amount } });
      setSelectedExpense(null);
      await fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      alert('Failed to delete expense: ' + err.message);
    }
  };

  // Filtering
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      !searchTerm ||
      (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.activities?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || expense.expense_category === categoryFilter;

    let matchesDate = true;
    if (dateRangeFilter !== 'all') {
      const expenseDate = new Date(expense.expense_date);
      const today = new Date();
      switch (dateRangeFilter) {
        case 'today':
          matchesDate = expenseDate.toDateString() === today.toDateString();
          break;
        case 'this-week': {
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          matchesDate = expenseDate >= startOfWeek && expenseDate <= endOfWeek;
          break;
        }
        case 'this-month': {
          matchesDate =
            expenseDate.getMonth() === today.getMonth() &&
            expenseDate.getFullYear() === today.getFullYear();
          break;
        }
        case 'last-30': {
          const thirtyAgo = new Date(today);
          thirtyAgo.setDate(today.getDate() - 30);
          matchesDate = expenseDate >= thirtyAgo;
          break;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Stats
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const thisMonthTotal = expenses
    .filter((e) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const categoryBreakdown = {};
  expenses.forEach((e) => {
    const cat = e.expense_category || 'other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(e.amount || 0);
  });
  const topCategory = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0];

  // Helpers
  const getCategoryInfo = (category) => {
    const info = {
      equipment: { icon: 'Package', color: 'text-blue-600', bg: 'bg-blue-100' },
      supplies: { icon: 'ShoppingBag', color: 'text-purple-600', bg: 'bg-purple-100' },
      refreshments: { icon: 'Coffee', color: 'text-amber-600', bg: 'bg-amber-100' },
      transport: { icon: 'Car', color: 'text-green-600', bg: 'bg-green-100' },
      venue: { icon: 'Building', color: 'text-indigo-600', bg: 'bg-indigo-100' },
      services: { icon: 'Users', color: 'text-pink-600', bg: 'bg-pink-100' },
      other: { icon: 'MoreHorizontal', color: 'text-gray-600', bg: 'bg-gray-100' },
    };
    return info[category] || info.other;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setDateRangeFilter('all');
  };
  const hasActiveFilters = searchTerm || categoryFilter !== 'all' || dateRangeFilter !== 'all';

  // Render
  if (loading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading expenses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Header />

      <motion.main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Activity Expenses
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track and manage activity-related expenses</p>
          </div>
          <div className="flex items-center gap-3">
            {(canViewAllHomes || isCareHomeManager) && selectedCareHomeId !== 'all' && (
              <motion.button
                onClick={() => {
                  setBudgetInput(monthlyBudget?.toString() || '');
                  setShowBudgetModal(true);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon name="Target" size={20} />
                Set Budget
              </motion.button>
            )}
            <motion.button
              onClick={() => (showForm ? setShowForm(false) : openNewForm())}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon name={showForm ? 'X' : 'Plus'} size={20} />
              {showForm ? 'Cancel' : 'Log Expense'}
            </motion.button>
          </div>
        </motion.div>

        {/* Care Home Selector */}
        {canViewAllHomes && careHomes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCareHomeId('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedCareHomeId === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              All Care Homes
            </button>
            {careHomes.map((home) => (
              <button
                key={home.id}
                onClick={() => setSelectedCareHomeId(home.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedCareHomeId === home.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                {home.name}
              </button>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Icon name="Receipt" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-800">{`\u00a3${totalExpenses.toFixed(2)}`}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl">
                <Icon name="Calendar" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-800">{`\u00a3${thisMonthTotal.toFixed(2)}`}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                <Icon name="Hash" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Entries</p>
                <p className="text-2xl font-bold text-gray-800">{expenses.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                <Icon name="TrendingUp" size={24} className="text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Top Category</p>
                <p className="text-lg font-bold text-gray-800 capitalize">{topCategory?.[0] || '\u2014'}</p>
                {topCategory && <p className="text-xs text-gray-500">{`\u00a3${topCategory[1].toFixed(2)}`}</p>}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Budget Progress Bar */}
        {monthlyBudget != null && monthlyBudget > 0 && (
          <motion.div
            className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            {(() => {
              const budgetUsedPct = Math.min((thisMonthTotal / monthlyBudget) * 100, 100);
              const remaining = monthlyBudget - thisMonthTotal;
              const isOverBudget = remaining < 0;
              const barColor = budgetUsedPct >= 90 ? 'from-red-500 to-rose-500' : budgetUsedPct >= 75 ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-green-500';
              const textColor = budgetUsedPct >= 90 ? 'text-red-600' : budgetUsedPct >= 75 ? 'text-amber-600' : 'text-emerald-600';
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="Target" size={20} className="text-emerald-600" />
                      <span className="font-semibold text-gray-700">Monthly Budget</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {`\u00a3${thisMonthTotal.toFixed(2)} of \u00a3${monthlyBudget.toFixed(2)}`}
                      </span>
                      <span className={`text-sm font-bold ${textColor}`}>
                        {isOverBudget ? `\u00a3${Math.abs(remaining).toFixed(2)} over budget` : `\u00a3${remaining.toFixed(2)} remaining`}
                      </span>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${budgetUsedPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>0%</span>
                    <span>{`${Math.round(budgetUsedPct)}% used`}</span>
                    <span>100%</span>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* Add / Edit Expense Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50 mb-8"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Icon name="PlusCircle" size={24} className="text-purple-600" />
                {editingExpense ? 'Edit Expense' : 'Log New Expense'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity (Optional)</label>
                    <select
                      value={formData.activity_id}
                      onChange={(e) => setFormData({ ...formData, activity_id: e.target.value })}
                      className="w-full px-4 py-2.5 text-gray-800 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">{'\u2014 General / No Activity \u2014'}</option>
                      {activities.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {canViewAllHomes && careHomes.length > 1 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Care Home</label>
                      <select
                        value={formData.care_home_id}
                        onChange={(e) => setFormData({ ...formData, care_home_id: e.target.value })}
                        className="w-full px-4 py-2.5 text-gray-800 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                      >
                        <option value="">Select care home</option>
                        {careHomes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      className="w-full px-4 py-2.5 text-gray-800 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g., Paint supplies for art class"
                      className="w-full px-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vendor / Supplier</label>
                    <input
                      type="text"
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="e.g., Amazon, Tesco, Local Store"
                      className="w-full px-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{'Amount (\u00a3)'}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.expense_category}
                      onChange={(e) => setFormData({ ...formData, expense_category: e.target.value })}
                      className="w-full px-4 py-2.5 text-gray-800 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="w-full px-4 py-2.5 text-gray-800 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      {paymentMethods.map((pm) => (
                        <option key={pm.value} value={pm.value}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt (Optional)
                  </label>
                  <div className="flex items-start gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-colors"
                    >
                      <Icon name="Upload" size={28} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 font-medium">
                        {receiptFile ? receiptFile.name : 'Click to upload receipt image or PDF'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleReceiptSelect}
                      />
                    </div>

                    {(receiptPreview || (editingExpense?.receipt_url && !receiptFile)) && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        {(receiptPreview || '').startsWith('data:image') || (receiptPreview || '').match(/\.(jpg|jpeg|png|gif|webp)/) ? (
                          <img
                            src={receiptPreview || editingExpense?.receipt_url}
                            alt="Receipt preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <Icon name="FileText" size={32} className="text-gray-400" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <Icon name="X" size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        {uploading ? 'Uploading receipt...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Icon name="Check" size={18} />
                        {editingExpense ? 'Update Expense' : 'Submit Expense'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingExpense(null);
                    }}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-sm border border-white/50 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search expenses, activities, vendors..."
                className="w-full pl-10 pr-4 py-2.5 text-gray-800 placeholder-gray-400 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/80 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="last-30">Last 30 Days</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Icon name="X" size={16} />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        <div className="mb-4 text-gray-600">
          {`Showing ${filteredExpenses.length} of ${expenses.length} expenses`}
        </div>

        {/* Expenses List */}
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {filteredExpenses.map((expense, idx) => {
            const categoryInfo = getCategoryInfo(expense.expense_category);
            return (
              <motion.div
                key={expense.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-white/50 overflow-hidden hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * Math.min(idx, 10) }}
                whileHover={{ scale: 1.003 }}
              >
                <div className="flex items-center p-5">
                  <div className={`p-3 rounded-xl ${categoryInfo.bg} mr-4 flex-shrink-0`}>
                    <Icon name={categoryInfo.icon} size={24} className={categoryInfo.color} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{expense.description}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                      {expense.activities?.name && (
                        <span className="flex items-center gap-1">
                          <Icon name="Activity" size={14} />
                          {expense.activities.name}
                        </span>
                      )}
                      {expense.vendor && (
                        <span className="flex items-center gap-1">
                          <Icon name="Store" size={14} />
                          {expense.vendor}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Icon name="Calendar" size={14} />
                        {new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {expense.receipt_url && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Icon name="Paperclip" size={14} />
                          Receipt
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right mx-6 flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-800">{`\u00a3${Number(expense.amount || 0).toFixed(2)}`}</p>
                    <p className="text-xs text-gray-500 capitalize">{(expense.payment_method || '').replace('_', ' ')}</p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setSelectedExpense(expense)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Icon name="Eye" size={18} />
                    </button>
                  </div>
                </div>

                {expense.notes && (
                  <div className="px-5 pb-4 pt-0">
                    <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <Icon name="MessageSquare" size={12} className="inline mr-2" />
                      {expense.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {filteredExpenses.length === 0 && !loading && (
          <motion.div className="text-center py-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Icon name="Receipt" size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No expenses found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or log a new expense</p>
            <button
              onClick={openNewForm}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Log First Expense
            </button>
          </motion.div>
        )}
      </motion.main>

      {/* Expense Detail Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedExpense(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{selectedExpense.description}</h2>
                    <p className="text-purple-100 mt-1">{selectedExpense.activities?.name || 'General Expense'}</p>
                  </div>
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <Icon name="X" size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                <div className="text-center px-8 py-4 bg-purple-50 rounded-xl mb-6">
                  <p className="text-3xl font-bold text-purple-600">{`\u00a3${Number(selectedExpense.amount || 0).toFixed(2)}`}</p>
                  <p className="text-sm text-gray-500">Amount</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Category</p>
                    <p className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                      <Icon
                        name={getCategoryInfo(selectedExpense.expense_category).icon}
                        size={16}
                        className={getCategoryInfo(selectedExpense.expense_category).color}
                      />
                      {selectedExpense.expense_category}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                    <p className="font-semibold text-gray-800 capitalize">
                      {(selectedExpense.payment_method || '').replace('_', ' ')}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Expense Date</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedExpense.expense_date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {selectedExpense.vendor && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Vendor</p>
                      <p className="font-semibold text-gray-800">{selectedExpense.vendor}</p>
                    </div>
                  )}
                </div>

                {selectedExpense.receipt_url && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Icon name="Paperclip" size={16} />
                      Receipt
                    </h4>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {isImageReceipt(selectedExpense.receipt_url) ? (
                        <img
                          src={selectedExpense.receipt_url}
                          alt="Receipt"
                          className="w-full max-h-[32rem] object-contain bg-gray-50"
                        />
                      ) : isPdfReceipt(selectedExpense.receipt_url) ? (
                        <div className="bg-gray-50">
                          <iframe
                            src={selectedExpense.receipt_url}
                            title="Receipt PDF"
                            className="w-full h-[32rem]"
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 space-y-3">
                          <div className="flex items-center gap-3">
                            <Icon name="FileText" size={24} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">Preview not available for this file type</span>
                          </div>
                          <a
                            href={selectedExpense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-purple-600 hover:underline font-medium"
                          >
                            <Icon name="ExternalLink" size={16} />
                            Open Receipt File
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedExpense.notes && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-2">Notes</p>
                    <p className="text-gray-800">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
                <button
                  onClick={() => openEditForm(selectedExpense)}
                  className="px-5 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                >
                  <Icon name="Pencil" size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedExpense)}
                  className="px-5 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  <Icon name="Trash2" size={16} />
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBudgetModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name="Target" size={24} />
                    <h2 className="text-xl font-bold">Set Monthly Budget</h2>
                  </div>
                  <button
                    onClick={() => setShowBudgetModal(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <Icon name="X" size={20} />
                  </button>
                </div>
                <p className="text-emerald-100 text-sm mt-2">
                  {careHomes.find(h => h.id === selectedCareHomeId)?.name || 'Selected Care Home'}
                </p>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Budget Amount (\u00a3)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full px-4 py-3 text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                  autoFocus
                />
                {monthlyBudget != null && (
                  <p className="text-sm text-gray-500 mt-2">
                    Current budget: \u00a3{monthlyBudget.toFixed(2)}
                  </p>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveBudget}
                    disabled={budgetSaving || !budgetInput}
                    className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {budgetSaving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
                    ) : (
                      <><Icon name="Check" size={18} /> Save Budget</>
                    )}
                  </button>
                  <button
                    onClick={() => setShowBudgetModal(false)}
                    className="px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActivityExpenses;
