import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';

const IngredientsTable = ({ ingredients }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');

  const sortedIngredients = useMemo(() => {
    let sortableItems = [...ingredients];

    if (searchTerm) {
      sortableItems = sortableItems?.filter(item =>
        item?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase())
      );
    }

    if (sortConfig?.key) {
      sortableItems?.sort((a, b) => {
        if (a?.[sortConfig?.key] < b?.[sortConfig?.key]) {
          return sortConfig?.direction === 'asc' ? -1 : 1;
        }
        if (a?.[sortConfig?.key] > b?.[sortConfig?.key]) {
          return sortConfig?.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems;
  }, [ingredients, sortConfig, searchTerm]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) {
      return <Icon name="ChevronsUpDown" size={14} className="opacity-40" />;
    }
    return sortConfig?.direction === 'asc' ? 
      <Icon name="ChevronUp" size={14} /> : 
      <Icon name="ChevronDown" size={14} />;
  };

  const totalCost = sortedIngredients?.reduce((sum, item) => sum + item?.cost, 0);

  return (
    <div className="bg-card rounded-lg card-elevation-1">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Ingredient Breakdown</h2>
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">£{totalCost?.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="relative">
          <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
                onClick={() => requestSort('name')}
              >
                <div className="flex items-center gap-2">
                  Ingredient
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
                onClick={() => requestSort('quantity')}
              >
                <div className="flex items-center gap-2">
                  Quantity
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors"
                onClick={() => requestSort('cost')}
              >
                <div className="flex items-center gap-2">
                  Cost
                  {getSortIcon('cost')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Allergens
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedIngredients?.map((ingredient, index) => (
              <tr key={index} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon name="Package" size={18} color="var(--color-primary)" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{ingredient?.name}</div>
                      <div className="text-xs text-muted-foreground">{ingredient?.category}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{ingredient?.quantity} {ingredient?.unit}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">£{ingredient?.cost?.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{ingredient?.supplier}</div>
                  <div className="text-xs text-muted-foreground">Stock: {ingredient?.stockLevel}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {ingredient?.allergens?.length > 0 ? (
                      ingredient?.allergens?.map((allergen, idx) => (
                        <span key={idx} className="px-2 py-1 bg-error/10 text-error text-xs font-medium rounded">
                          {allergen}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedIngredients?.length === 0 && (
        <div className="p-8 text-center">
          <Icon name="Search" size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No ingredients found matching your search</p>
        </div>
      )}
    </div>
  );
};

export default IngredientsTable;