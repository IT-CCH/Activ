import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ExpenseTable = ({ expenses }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig?.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) return 'ChevronsUpDown';
    return sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown';
  };

  const filteredExpenses = expenses?.filter(expense =>
    expense?.item?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    expense?.category?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    expense?.supplier?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );

  const sortedExpenses = [...filteredExpenses]?.sort((a, b) => {
    if (sortConfig?.key === 'amount') {
      return sortConfig?.direction === 'asc' ? a?.amount - b?.amount : b?.amount - a?.amount;
    }
    if (sortConfig?.key === 'date') {
      return sortConfig?.direction === 'asc' 
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    }
    const aValue = a?.[sortConfig?.key]?.toLowerCase();
    const bValue = b?.[sortConfig?.key]?.toLowerCase();
    if (sortConfig?.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const totalPages = Math.ceil(sortedExpenses?.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = sortedExpenses?.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Item', 'Category', 'Supplier', 'Amount', 'Meal Type'],
      ...sortedExpenses?.map(exp => [
        exp?.date,
        exp?.item,
        exp?.category,
        exp?.supplier,
        exp?.amount?.toFixed(2),
        exp?.mealType
      ])
    ]?.map(row => row?.join(','))?.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL?.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-report-${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
    a?.click();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-elevation-1">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-semibold text-foreground">Detailed Expense Report</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="search"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-full sm:w-64"
          />
          <Button
            variant="outline"
            iconName="Download"
            iconPosition="left"
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Date
                  <Icon name={getSortIcon('date')} size={16} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('item')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Item
                  <Icon name={getSortIcon('item')} size={16} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Category
                  <Icon name={getSortIcon('category')} size={16} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('supplier')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Supplier
                  <Icon name={getSortIcon('supplier')} size={16} />
                </button>
              </th>
              <th className="text-left py-3 px-4">
                <button
                  onClick={() => handleSort('mealType')}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Meal Type
                  <Icon name={getSortIcon('mealType')} size={16} />
                </button>
              </th>
              <th className="text-right py-3 px-4">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center justify-end gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors ml-auto"
                >
                  Amount
                  <Icon name={getSortIcon('amount')} size={16} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedExpenses?.map((expense) => (
              <tr key={expense?.id} className="border-b border-border hover:bg-muted transition-colors">
                <td className="py-3 px-4 text-sm text-foreground">{expense?.date}</td>
                <td className="py-3 px-4 text-sm text-foreground font-medium">{expense?.item}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                    {expense?.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{expense?.supplier}</td>
                <td className="py-3 px-4 text-sm text-muted-foreground">{expense?.mealType}</td>
                <td className="py-3 px-4 text-sm text-foreground font-semibold text-right">
                  £{expense?.amount?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedExpenses?.length)} of {sortedExpenses?.length} entries
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <Icon name="ChevronLeft" size={16} />
          </Button>
          <span className="text-sm text-foreground px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <Icon name="ChevronRight" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseTable;