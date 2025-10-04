// components/POS/InventoryTableRow.jsx - Updated with variant logic removed
import React from 'react';
import { Edit, Trash2, Package, Layers } from 'lucide-react';
import { TavariStyles } from '../../utils/TavariStyles';

const InventoryTableRow = ({ 
  item, 
  onEditItem, 
  onDeleteItem, 
  businessId,
  categories = [],
  stations = []
}) => {
  // Add safety check for item prop
  if (!item) {
    console.warn('InventoryTableRow: item prop is undefined');
    return null;
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'No Category';
  };

  const getStationNames = (stationIds) => {
    if (!stationIds || !Array.isArray(stationIds)) return 'No Stations';
    const stationNames = stationIds.map(id => {
      const station = stations.find(s => s.id === id);
      return station ? station.name : 'Unknown';
    });
    return stationNames.join(', ');
  };

  const getStockStatus = () => {
    // Add safety check for item.track_stock
    if (!item || typeof item.track_stock === 'undefined') {
      return { text: 'Not Tracked', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }

    if (!item.track_stock) {
      return { text: 'Not Tracked', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    }
    
    const currentStock = item.calculated_stock ?? item.stock_quantity ?? 0;
    const threshold = item.low_stock_threshold || 5;
    
    if (currentStock <= 0) {
      return { text: 'Out of Stock', color: 'text-red-700', bgColor: 'bg-red-100' };
    } else if (currentStock <= threshold) {
      return { text: 'Low Stock', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    } else {
      return { text: 'In Stock', color: 'text-green-700', bgColor: 'bg-green-100' };
    }
  };

  const stockStatus = getStockStatus();
  const hasModifiers = item.modifier_groups && item.modifier_groups.length > 0;

  const tableRowStyle = "hover:bg-gray-50 transition-colors";
  const tableCellStyle = "px-6 py-4 whitespace-nowrap";

  return (
    <tr className={tableRowStyle}>
      {/* Item Name with modifiers indicator */}
      <td className={tableCellStyle}>
        <div className="flex items-center">
          <Package className="w-5 h-5 text-gray-400 mr-3" />
          <div className="flex-1">
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-900">{item.name || 'Unknown Item'}</div>
              {hasModifiers && (
                <div className="ml-2 inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                  <Layers className="w-3 h-3 mr-1" />
                  M
                </div>
              )}
            </div>
            {item.description && (
              <div className="text-sm text-gray-500">{item.description}</div>
            )}
          </div>
        </div>
      </td>

      {/* SKU */}
      <td className={`${tableCellStyle} text-sm text-gray-500`}>
        {item.sku || '—'}
      </td>

      {/* Category */}
      <td className={`${tableCellStyle} text-sm text-gray-500`}>
        {getCategoryName(item.category_id)}
      </td>

      {/* Price */}
      <td className={`${tableCellStyle} text-sm font-medium text-gray-900`}>
        ${parseFloat(item.price || 0).toFixed(2)}
      </td>

      {/* Cost */}
      <td className={`${tableCellStyle} text-sm text-gray-500`}>
        ${parseFloat(item.cost || 0).toFixed(2)}
      </td>

      {/* Stock Status */}
      <td className={tableCellStyle}>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
          {stockStatus.text}
        </span>
        {item.track_stock && (
          <div className="text-xs text-gray-400 mt-1">
            Qty: {item.calculated_stock ?? item.stock_quantity ?? 0}
          </div>
        )}
      </td>

      {/* Stations */}
      <td className={`${tableCellStyle} text-sm text-gray-500`}>
        {getStationNames(item.station_ids)}
      </td>

      {/* Actions */}
      <td className={`${tableCellStyle} text-right text-sm font-medium`}>
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEditItem(item)}
            className="text-indigo-600 hover:text-indigo-900 transition-colors"
            title="Edit item"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteItem(item.id)}
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default InventoryTableRow;