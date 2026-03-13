import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../context/AuthContext';
import supabase from '../../services/supabaseClient';

const Expenses = () => {
  const { careHomeId } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchExpenses();
  }, [careHomeId]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_expenses')
        .select('*, activities(name)')
        .eq('care_home_id', careHomeId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
      
      // Calculate total
      const total = (data || []).reduce((sum, exp) => sum + (exp.amount || 0), 0);
      setTotalAmount(total);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Expenses</h1>
          <p className="text-muted-foreground mt-2">Track and manage activity expenses</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold text-foreground mt-1">£{totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <Icon name="TrendingUp" size={24} className="text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Number of Expenses</p>
              <p className="text-2xl font-bold text-foreground mt-1">{expenses.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Icon name="FileText" size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Expense</p>
              <p className="text-2xl font-bold text-foreground mt-1">£{expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00'}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Icon name="BarChart3" size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="TrendingUp" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No expenses recorded</h3>
          <p className="text-muted-foreground">Add expenses to track activity costs</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Activity</th>
                <th className="px-4 py-3 text-left font-semibold">Description</th>
                <th className="px-4 py-3 text-left font-semibold">Amount</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-muted/50 transition">
                  <td className="px-4 py-3">{expense.activities?.name}</td>
                  <td className="px-4 py-3">{expense.description}</td>
                  <td className="px-4 py-3 font-semibold">£{expense.amount?.toFixed(2) || '0.00'}</td>
                  <td className="px-4 py-3">{new Date(expense.expense_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      expense.approval_status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : expense.approval_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {expense.approval_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Expenses;
