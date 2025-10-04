// src/components/Reports/ProductMixReport.jsx
import React, { useState } from 'react';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { TavariStyles } from '../../utils/TavariStyles';

const ProductMixReport = ({ 
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
  
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'ProductMixReport'
  });

  const [viewMode, setViewMode] = useState('revenue'); // 'revenue', 'quantity', 'margin'
  const [groupBy, setGroupBy] = useState('category'); // 'category', 'individual'

  const formatCurrency = (amount) => `$${(amount || 0).toFixed(2)}`;
  const formatPercentage = (percent) => `${(percent || 0).toFixed(1)}%`;

  // Calculate product mix analysis from sales data
  const analyzeProductMix = () => {
    if (!data.rawData?.sales?.length) {
      return { items: [], categories: [], totalRevenue: 0, totalQuantity: 0 };
    }

    const itemStats = {};
    const categoryStats = {};
    let totalRevenue = 0;
    let totalQuantity = 0;

    // Process all sale items
    data.rawData.sales.forEach(sale => {
      if (sale.pos_sale_items) {
        sale.pos_sale_items.forEach(item => {
          const itemName = item.name || 'Unknown Item';
          const categoryId = item.category_id || 'uncategorized';
          const quantity = Number(item.quantity) || 0;
          const revenue = Number(item.total_price) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          const estimatedCost = unitPrice * 0.3; // Estimate 30% cost ratio
          const margin = revenue - (estimatedCost * quantity);

          totalRevenue += revenue;
          totalQuantity += quantity;

          // Track individual items
          if (!itemStats[itemName]) {
            itemStats[itemName] = {
              name: itemName,
              categoryId,
              totalQuantity: 0,
              totalRevenue: 0,
              totalMargin: 0,
              transactionCount: 0,
              averagePrice: 0
            };
          }

          itemStats[itemName].totalQuantity += quantity;
          itemStats[itemName].totalRevenue += revenue;
          itemStats[itemName].totalMargin += margin;
          itemStats[itemName].transactionCount += 1;

          // Track categories
          if (!categoryStats[categoryId]) {
            categoryStats[categoryId] = {
              id: categoryId,
              name: categoryId === 'uncategorized' ? 'Uncategorized' : 'Category',
              totalQuantity: 0,
              totalRevenue: 0,
              totalMargin: 0,
              itemCount: new Set(),
              transactionCount: 0
            };
          }

          categoryStats[categoryId].totalQuantity += quantity;
          categoryStats[categoryId].totalRevenue += revenue;
          categoryStats[categoryId].totalMargin += margin;
          categoryStats[categoryId].itemCount.add(itemName);
          categoryStats[categoryId].transactionCount += 1;
        });
      }
    });

    // Calculate percentages and average prices
    Object.values(itemStats).forEach(item => {
      item.revenuePercent = totalRevenue > 0 ? (item.totalRevenue / totalRevenue * 100) : 0;
      item.quantityPercent = totalQuantity > 0 ? (item.totalQuantity / totalQuantity * 100) : 0;
      item.marginPercent = item.totalRevenue > 0 ? (item.totalMargin / item.totalRevenue * 100) : 0;
      item.averagePrice = item.totalQuantity > 0 ? (item.totalRevenue / item.totalQuantity) : 0;
    });

    Object.values(categoryStats).forEach(category => {
      category.revenuePercent = totalRevenue > 0 ? (category.totalRevenue / totalRevenue * 100) : 0;
      category.quantityPercent = totalQuantity > 0 ? (category.totalQuantity / totalQuantity * 100) : 0;
      category.marginPercent = category.totalRevenue > 0 ? (category.totalMargin / category.totalRevenue * 100) : 0;
      category.averagePrice = category.totalQuantity > 0 ? (category.totalRevenue / category.totalQuantity) : 0;
      category.uniqueItems = category.itemCount.size;
    });

    return {
      items: Object.values(itemStats),
      categories: Object.values(categoryStats),
      totalRevenue,
      totalQuantity
    };
  };

  const mixData = analyzeProductMix();

  // Sort data based on view mode
  const getSortedData = () => {
    const dataSource = groupBy === 'category' ? mixData.categories : mixData.items;
    
    return [...dataSource].sort((a, b) => {
      switch (viewMode) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'quantity':
          return b.totalQuantity - a.totalQuantity;
        case 'margin':
          return b.totalMargin - a.totalMargin;
        default:
          return b.totalRevenue - a.totalRevenue;
      }
    });
  };

  const sortedData = getSortedData();

  // Calculate performance insights
  const topPerformer = sortedData[0];
  const averageRevenue = sortedData.length > 0 ? 
    (sortedData.reduce((sum, item) => sum + item.totalRevenue, 0) / sortedData.length) : 0;

  const exportData = {
    csv: () => {
      const { start, end } = getDateRangeText();
      let csvContent = "data:text/csv;charset=utf-8,";
      
      csvContent += "Product Mix Analysis Report\n";
      csvContent += `Period,${start} to ${end}\n`;
      csvContent += `Employee Filter,${getEmployeeName()}\n`;
      csvContent += `View Mode,${viewMode}\n`;
      csvContent += `Group By,${groupBy}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n\n`;
      
      if (groupBy === 'category') {
        csvContent += "CATEGORY ANALYSIS\n";
        csvContent += "Rank,Category,Revenue,Revenue %,Quantity,Quantity %,Margin,Margin %,Items,Avg Price\n";
        sortedData.forEach((item, index) => {
          csvContent += `${index + 1},${item.name || item.id},${item.totalRevenue.toFixed(2)},${item.revenuePercent.toFixed(1)}%,${item.totalQuantity},${item.quantityPercent.toFixed(1)}%,${item.totalMargin.toFixed(2)},${item.marginPercent.toFixed(1)}%,${item.uniqueItems || 1},${item.averagePrice.toFixed(2)}\n`;
        });
      } else {
        csvContent += "INDIVIDUAL ITEM ANALYSIS\n";
        csvContent += "Rank,Item Name,Revenue,Revenue %,Quantity,Quantity %,Margin,Margin %,Avg Price,Transactions\n";
        sortedData.forEach((item, index) => {
          csvContent += `${index + 1},${item.name},${item.totalRevenue.toFixed(2)},${item.revenuePercent.toFixed(1)}%,${item.totalQuantity},${item.quantityPercent.toFixed(1)}%,${item.totalMargin.toFixed(2)},${item.marginPercent.toFixed(1)}%,${item.averagePrice.toFixed(2)},${item.transactionCount}\n`;
        });
      }
      
      csvContent += `\nSUMMARY\n`;
      csvContent += `Total Revenue,${formatCurrency(mixData.totalRevenue)}\n`;
      csvContent += `Total Quantity,${mixData.totalQuantity}\n`;
      csvContent += `${groupBy === 'category' ? 'Categories' : 'Items'} Analyzed,${sortedData.length}\n`;
      csvContent += `Top Performer,${topPerformer?.name || 'N/A'}\n`;
      csvContent += `Average Revenue per ${groupBy === 'category' ? 'Category' : 'Item'},${formatCurrency(averageRevenue)}\n`;
      
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
    subject: `Product Mix Analysis - ${getDateRangeText().start} to ${getDateRangeText().end}`,
    body: `
Product Mix Analysis Report

Period: ${getDateRangeText().start} to ${getDateRangeText().end}
Employee Filter: ${getEmployeeName()}
View Mode: ${viewMode}
Group By: ${groupBy}
Generated: ${new Date().toLocaleString()}

SUMMARY:
- Total Revenue: ${formatCurrency(mixData.totalRevenue)}
- Total Quantity: ${mixData.totalQuantity}
- ${groupBy === 'category' ? 'Categories' : 'Items'} Analyzed: ${sortedData.length}
- Top Performer: ${topPerformer?.name || 'N/A'} (${formatCurrency(topPerformer?.totalRevenue || 0)})

TOP 5 BY ${viewMode.toUpperCase()}:
${sortedData.slice(0, 5).map((item, index) => 
  `${index + 1}. ${item.name || item.id} - ${formatCurrency(item.totalRevenue)} (${formatPercentage(item.revenuePercent)})`
).join('\n')}

This analysis helps optimize product offerings and identify high-performing categories or items.
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
      onExport(content, format, 'product-mix');
    }
  };

  const handleEmail = () => {
    const content = emailContent();
    onEmail(content, exportData.csv(), 'product-mix');
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
      borderBottom: `2px solid ${TavariStyles.colors.info}`
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
    
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md,
      marginBottom: TavariStyles.spacing.lg,
      padding: TavariStyles.spacing.md,
      backgroundColor: TavariStyles.colors.blue50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.blue200}`
    },
    
    summaryItem: {
      textAlign: 'center'
    },
    
    summaryValue: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.blue700,
      marginBottom: TavariStyles.spacing.xs
    },
    
    summaryLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.blue600,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    
    tableContainer: {
      overflowX: 'auto',
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: TavariStyles.colors.white
    },
    
    tableHeader: {
      backgroundColor: TavariStyles.colors.gray100,
      borderBottom: `2px solid ${TavariStyles.colors.gray300}`
    },
    
    tableHeaderCell: {
      padding: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.xs,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray700,
      textTransform: 'uppercase',
      textAlign: 'left',
      borderRight: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    tableHeaderCellNumber: {
      textAlign: 'right'
    },
    
    tableRow: {
      borderBottom: `1px solid ${TavariStyles.colors.gray200}`
    },
    
    topTableRow: {
      backgroundColor: TavariStyles.colors.green50
    },
    
    tableCell: {
      padding: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm,
      borderRight: `1px solid ${TavariStyles.colors.gray200}`,
      verticalAlign: 'middle'
    },
    
    tableCellNumber: {
      textAlign: 'right',
      fontFamily: 'monospace'
    },
    
    rank: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray600,
      textAlign: 'center'
    },
    
    itemName: {
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray900
    },
    
    revenue: {
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.primary
    },
    
    percentage: {
      color: TavariStyles.colors.gray600
    },
    
    margin: {
      color: TavariStyles.colors.success
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

  if (!auth.selectedBusinessId || !auth.authUser) {
    return (
      <div style={styles.container}>
        <div style={styles.noDataMessage}>Loading product mix analysis...</div>
      </div>
    );
  }

  const hasData = sortedData.length > 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Product Mix Analysis</h3>
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
          <span style={styles.label}>View by:</span>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={styles.select}
          >
            <option value="revenue">Revenue</option>
            <option value="quantity">Quantity Sold</option>
            <option value="margin">Profit Margin</option>
          </select>
        </div>
        
        <div style={styles.controlGroup}>
          <span style={styles.label}>Group by:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            style={styles.select}
          >
            <option value="category">Category</option>
            <option value="individual">Individual Items</option>
          </select>
        </div>
      </div>

      {!hasData ? (
        <div style={styles.noDataMessage}>
          No sales data found for the selected period and filters.
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{formatCurrency(mixData.totalRevenue)}</div>
              <div style={styles.summaryLabel}>Total Revenue</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{mixData.totalQuantity}</div>
              <div style={styles.summaryLabel}>Total Quantity</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{sortedData.length}</div>
              <div style={styles.summaryLabel}>{groupBy === 'category' ? 'Categories' : 'Items'}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{topPerformer?.name || 'N/A'}</div>
              <div style={styles.summaryLabel}>Top Performer</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryValue}>{formatCurrency(averageRevenue)}</div>
              <div style={styles.summaryLabel}>Average Revenue</div>
            </div>
          </div>

          {/* Analysis Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Rank</th>
                  <th style={styles.tableHeaderCell}>{groupBy === 'category' ? 'Category' : 'Item Name'}</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Revenue</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Revenue %</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Quantity</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Quantity %</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Margin</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Margin %</th>
                  <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Avg Price</th>
                  {groupBy === 'category' && <th style={{...styles.tableHeaderCell, ...styles.tableHeaderCellNumber}}>Items</th>}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, index) => (
                  <tr 
                    key={item.name || item.id}
                    style={{
                      ...styles.tableRow,
                      ...(index === 0 ? styles.topTableRow : {})
                    }}
                  >
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.rank}}>
                      {index + 1}
                    </td>
                    <td style={{...styles.tableCell, ...styles.itemName}}>
                      {item.name || item.id}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.revenue}}>
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.percentage}}>
                      {formatPercentage(item.revenuePercent)}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber}}>
                      {item.totalQuantity}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.percentage}}>
                      {formatPercentage(item.quantityPercent)}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.margin}}>
                      {formatCurrency(item.totalMargin)}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber, ...styles.margin}}>
                      {formatPercentage(item.marginPercent)}
                    </td>
                    <td style={{...styles.tableCell, ...styles.tableCellNumber}}>
                      {formatCurrency(item.averagePrice)}
                    </td>
                    {groupBy === 'category' && (
                      <td style={{...styles.tableCell, ...styles.tableCellNumber}}>
                        {item.uniqueItems || 1}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductMixReport;