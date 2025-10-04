// src/components/Reports/TopItemsReport.jsx
import React, { useState } from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const TopItemsReport = ({ 
  data, 
  dateRange, 
  customDateStart, 
  customDateEnd, 
  compareToLastYear, 
  selectedEmployee,
  employees,
  onExport,
  onEmail 
}) => {
  
  const [viewMode, setViewMode] = useState('revenue'); // 'revenue' or 'quantity'
  const [showCount, setShowCount] = useState(10);

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;

  // Calculate comprehensive item statistics
  const itemStats = {};
  
  data.rawData?.sales?.forEach(sale => {
    if (sale.pos_sale_items) {
      sale.pos_sale_items.forEach(item => {
        const key = item.name || 'Unknown Item';
        if (!itemStats[key]) {
          itemStats[key] = {
            name: key,
            totalQuantity: 0,
            totalRevenue: 0,
            transactionCount: 0,
            averagePrice: 0,
            category: item.category_id || 'Uncategorized'
          };
        }
        
        const quantity = Number(item.quantity) || 0;
        const revenue = Number(item.total_price) || 0;
        
        itemStats[key].totalQuantity += quantity;
        itemStats[key].totalRevenue += revenue;
        itemStats[key].transactionCount += 1;
      });
    }
  });

  // Calculate average prices
  Object.values(itemStats).forEach(item => {
    item.averagePrice = item.totalQuantity > 0 ? (item.totalRevenue / item.totalQuantity) : 0;
  });

  const allItems = Object.values(itemStats);
  
  // Sort by selected metric
  const sortedByRevenue = [...allItems].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const sortedByQuantity = [...allItems].sort((a, b) => b.totalQuantity - a.totalQuantity);
  
  const topItemsByRevenue = sortedByRevenue.slice(0, showCount);
  const bottomItemsByRevenue = sortedByRevenue.slice(-showCount).reverse();
  
  const topItemsByQuantity = sortedByQuantity.slice(0, showCount);
  const bottomItemsByQuantity = sortedByQuantity.slice(-showCount).reverse();

  // Get current display data based on view mode
  const topItems = viewMode === 'revenue' ? topItemsByRevenue : topItemsByQuantity;
  const bottomItems = viewMode === 'revenue' ? bottomItemsByRevenue : bottomItemsByQuantity;

  // Calculate category performance
  const categoryStats = {};
  allItems.forEach(item => {
    const category = item.category || 'Uncategorized';
    if (!categoryStats[category]) {
      categoryStats[category] = {
        name: category,
        totalRevenue: 0,
        totalQuantity: 0,
        itemCount: 0
      };
    }
    categoryStats[category].totalRevenue += item.totalRevenue;
    categoryStats[category].totalQuantity += item.totalQuantity;
    categoryStats[category].itemCount += 1;
  });

  const topCategories = Object.values(categoryStats)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Top/Bottom Selling Items Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `View Mode,${viewMode === 'revenue' ? 'Revenue' : 'Quantity'}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csvContent += `TOP ${showCount} ITEMS BY ${viewMode.toUpperCase()}\n`;
      csvContent += "Rank,Item Name,Quantity Sold,Revenue,Avg Price,Transactions\n";
      topItems.forEach((item, index) => {
        csvContent += `${index + 1},${item.name},${item.totalQuantity},${item.totalRevenue.toFixed(2)},${item.averagePrice.toFixed(2)},${item.transactionCount}\n`;
      });
      
      csvContent += `\nBOTTOM ${showCount} ITEMS BY ${viewMode.toUpperCase()}\n`;
      csvContent += "Rank,Item Name,Quantity Sold,Revenue,Avg Price,Transactions\n";
      bottomItems.forEach((item, index) => {
        csvContent += `${index + 1},${item.name},${item.totalQuantity},${item.totalRevenue.toFixed(2)},${item.averagePrice.toFixed(2)},${item.transactionCount}\n`;
      });
      
      if (topCategories.length > 0) {
        csvContent += "\nTOP CATEGORIES BY REVENUE\n";
        csvContent += "Rank,Category,Revenue,Quantity,Items\n";
        topCategories.forEach((cat, index) => {
          csvContent += `${index + 1},${cat.name},${cat.totalRevenue.toFixed(2)},${cat.totalQuantity},${cat.itemCount}\n`;
        });
      }
      
      return csvContent;
    },
    
    excel: () => {
      return exportData.csv();
    },
    
    pdf: () => {
      return null;
    }
  };

  const emailContent = () => ({
    subject: `Top/Bottom Items Report - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Top/Bottom Selling Items Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
View Mode: ${viewMode === 'revenue' ? 'Revenue' : 'Quantity'}
Generated: ${new Date().toLocaleString()}

TOP ${showCount} ITEMS BY ${viewMode.toUpperCase()}:
${topItems.map((item, index) => 
  `${index + 1}. ${item.name} - ${item.totalQuantity} sold, ${formatCurrency(item.totalRevenue)} revenue`
).join('\n')}

BOTTOM ${showCount} ITEMS BY ${viewMode.toUpperCase()}:
${bottomItems.map((item, index) => 
  `${index + 1}. ${item.name} - ${item.totalQuantity} sold, ${formatCurrency(item.totalRevenue)} revenue`
).join('\n')}

${topCategories.length > 0 ? `
TOP CATEGORIES:
${topCategories.map((cat, index) => 
  `${index + 1}. ${cat.name} - ${formatCurrency(cat.totalRevenue)} revenue (${cat.itemCount} items)`
).join('\n')}
` : ''}

Use this data to optimize inventory, pricing, and menu placement decisions.
    `.trim()
  });

  const getDateRangeText = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return { start: today.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return { start: yesterday.toLocaleDateString(), end: yesterday.toLocaleDateString() };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart.toLocaleDateString(), end: today.toLocaleDateString() };
      case 'custom':
        return { 
          start: customDateStart ? new Date(customDateStart).toLocaleDateString() : today.toLocaleDateString(),
          end: customDateEnd ? new Date(customDateEnd).toLocaleDateString() : today.toLocaleDateString()
        };
      default:
        return { start: today.toLocaleDateString(), end: today.toLocaleDateString() };
    }
  };

  const getEmployeeName = () => {
    if (selectedEmployee === 'all') return 'All Employees';
    const employee = employees.find(e => e.id === selectedEmployee);
    return employee ? (employee.full_name || employee.email) : 'Unknown Employee';
  };

  const handleExport = (format) => {
    const content = exportData[format]();
    if (content) {
      onExport(content, format, 'top-items');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'top-items');
  };

  const styles = {
    container: {
      ...TavariStyles.layout.card,
      padding: TavariStyles.spacing.lg,
      marginBottom: TavariStyles.spacing.lg
    },
    
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.lg,
      paddingBottom: TavariStyles.spacing.md,
      borderBottom: `2px solid ${TavariStyles.colors.primary}`
    },
    
    title: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900
    },
    
    actions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    
    actionButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      fontSize: TavariStyles.typography.fontSize.xs
    },
    
    exportButton: {
      ...TavariStyles.components.button.variants.secondary
    },
    
    emailButton: {
      ...TavariStyles.components.button.variants.primary
    },
    
    controls: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg,
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    
    label: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      color: TavariStyles.colors.gray700
    },
    
    select: TavariStyles.components.form.select,
    
    section: {
      marginBottom: TavariStyles.spacing.xl
    },
    
    sectionTitle: {
      fontSize: TavariStyles.typography.fontSize.md,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.md,
      paddingBottom: TavariStyles.spacing.sm,
      borderBottom: `1px solid ${TavariStyles.colors.gray300}`
    },
    
    itemsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: TavariStyles.spacing.sm
    },
    
    itemRow: {
      display: 'grid',
      gridTemplateColumns: 'auto 2fr auto auto auto auto',
      gap: TavariStyles.spacing.md,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      alignItems: 'center'
    },
    
    topItemRow: {
      backgroundColor: TavariStyles.colors.green50,
      border: `1px solid ${TavariStyles.colors.green200}`
    },
    
    bottomItemRow: {
      backgroundColor: TavariStyles.colors.red50,
      border: `1px solid ${TavariStyles.colors.red200}`
    },
    
    rank: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray600,
      minWidth: '30px'
    },
    
    itemName: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    quantity: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      textAlign: 'right'
    },
    
    revenue: {
      fontSize: TavariStyles.typography.fontSize.base,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary,
      textAlign: 'right'
    },
    
    avgPrice: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      textAlign: 'right'
    },
    
    transactions: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      textAlign: 'right'
    },
    
    categorySection: {
      marginTop: TavariStyles.spacing.xl
    },
    
    categoryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    
    categoryCard: {
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.blue50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.blue200}`
    },
    
    categoryName: {
      fontSize: TavariStyles.typography.fontSize.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue900,
      marginBottom: TavariStyles.spacing.xs
    },
    
    categoryRevenue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue700
    },
    
    categoryStats: {
      fontSize: TavariStyles.typography.fontSize.xs,
      color: TavariStyles.colors.blue600,
      marginTop: TavariStyles.spacing.xs
    },
    
    noDataMessage: {
      textAlign: 'center',
      padding: TavariStyles.spacing.xl,
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic',
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    }
  };

  const hasItemData = allItems.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Top/Bottom Selling Items</h3>
        <div style={styles.actions}>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </button>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('excel')}
          >
            Export Excel
          </button>
          <button 
            style={{...styles.actionButton, ...styles.exportButton}}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </button>
          <button 
            style={{...styles.actionButton, ...styles.emailButton}}
            onClick={handleEmail}
          >
            Email Report
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Sort by:</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={styles.select}
          >
            <option value="revenue">Revenue</option>
            <option value="quantity">Quantity Sold</option>
          </select>
        </div>
        
        <div style={styles.controlGroup}>
          <span style={styles.label}>Show:</span>
          <select
            value={showCount}
            onChange={(e) => setShowCount(Number(e.target.value))}
            style={styles.select}
          >
            <option value={5}>Top/Bottom 5</option>
            <option value={10}>Top/Bottom 10</option>
            <option value={15}>Top/Bottom 15</option>
            <option value={20}>Top/Bottom 20</option>
          </select>
        </div>
      </div>

      {!hasItemData ? (
        <div style={styles.noDataMessage}>
          No item sales data found for the selected period and filters.
        </div>
      ) : (
        <>
          {/* Top Performers */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              Top {showCount} Items by {viewMode === 'revenue' ? 'Revenue' : 'Quantity'}
            </h4>
            <div style={styles.itemsList}>
              {topItems.map((item, index) => (
                <div key={index} style={{...styles.itemRow, ...styles.topItemRow}}>
                  <div style={styles.rank}>#{index + 1}</div>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.quantity}>{item.totalQuantity} sold</div>
                  <div style={styles.revenue}>{formatCurrency(item.totalRevenue)}</div>
                  <div style={styles.avgPrice}>{formatCurrency(item.averagePrice)} avg</div>
                  <div style={styles.transactions}>{item.transactionCount} orders</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Performers */}
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>
              Bottom {showCount} Items by {viewMode === 'revenue' ? 'Revenue' : 'Quantity'}
            </h4>
            <div style={styles.itemsList}>
              {bottomItems.map((item, index) => (
                <div key={index} style={{...styles.itemRow, ...styles.bottomItemRow}}>
                  <div style={styles.rank}>#{index + 1}</div>
                  <div style={styles.itemName}>{item.name}</div>
                  <div style={styles.quantity}>{item.totalQuantity} sold</div>
                  <div style={styles.revenue}>{formatCurrency(item.totalRevenue)}</div>
                  <div style={styles.avgPrice}>{formatCurrency(item.averagePrice)} avg</div>
                  <div style={styles.transactions}>{item.transactionCount} orders</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Performance */}
          {topCategories.length > 0 && (
            <div style={styles.categorySection}>
              <h4 style={styles.sectionTitle}>Top Categories by Revenue</h4>
              <div style={styles.categoryGrid}>
                {topCategories.map((category, index) => (
                  <div key={index} style={styles.categoryCard}>
                    <div style={styles.categoryName}>{category.name}</div>
                    <div style={styles.categoryRevenue}>{formatCurrency(category.totalRevenue)}</div>
                    <div style={styles.categoryStats}>
                      {category.totalQuantity} items sold • {category.itemCount} products
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TopItemsReport;