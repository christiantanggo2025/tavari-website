// components/POS/InventoryTable.jsx - Updated with variant logic removed
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';
import InventoryTableRow from './InventoryTableRow';

const InventoryTable = ({
  inventory = [],
  categories = [],
  stations = [],
  taxCalc,
  searchTerm,
  onEditItem,
  onDeleteItem,
  businessId
}) => {
  const styles = {
    tableContainer: {
      ...TavariStyles.components.table.container,
      flex: 1,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.lg,
      boxShadow: TavariStyles.shadows.sm,
      overflow: 'hidden'
    },
    table: {
      ...TavariStyles.components.table.table,
      width: '100%'
    },
    headerRow: {
      ...TavariStyles.components.table.headerRow,
      backgroundColor: TavariStyles.colors.primary,
      color: TavariStyles.colors.white,
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    th: {
      ...TavariStyles.components.table.th,
      borderBottom: `2px solid ${TavariStyles.colors.primaryDark}`,
      color: TavariStyles.colors.white,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      fontSize: TavariStyles.typography.fontSize.sm,
      textAlign: 'left',
      padding: `${TavariStyles.spacing.md} ${TavariStyles.spacing.lg}`,
      whiteSpace: 'nowrap'
    },
    emptyCell: {
      padding: TavariStyles.spacing['5xl'],
      textAlign: 'center',
      color: TavariStyles.colors.gray500,
      fontStyle: 'italic'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: TavariStyles.spacing['5xl'],
      color: TavariStyles.colors.gray500
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: TavariStyles.spacing.lg,
      opacity: 0.3
    },
    emptyTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      marginBottom: TavariStyles.spacing.sm,
      color: TavariStyles.colors.gray600
    },
    emptyDescription: {
      fontSize: TavariStyles.typography.fontSize.base,
      color: TavariStyles.colors.gray500,
      textAlign: 'center',
      maxWidth: '400px',
      lineHeight: 1.5
    }
  };

  const EmptyState = () => (
    <tr>
      <td colSpan="8" style={styles.emptyCell}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📦</div>
          <h3 style={styles.emptyTitle}>
            {searchTerm ? 'No items match your search' : 'No inventory items found'}
          </h3>
          <p style={styles.emptyDescription}>
            {searchTerm 
              ? `Try adjusting your search terms or filters to find what you're looking for.`
              : `Start building your inventory by adding your first product using the form above.`
            }
          </p>
        </div>
      </td>
    </tr>
  );

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.headerRow}>
            <th style={styles.th}>Name</th>
            <th style={{ ...styles.th, width: '120px' }}>SKU</th>
            <th style={{ ...styles.th, width: '150px' }}>Category</th>
            <th style={{ ...styles.th, width: '100px' }}>Price</th>
            <th style={{ ...styles.th, width: '100px' }}>Cost</th>
            <th style={{ ...styles.th, width: '120px' }}>Stock Status</th>
            <th style={{ ...styles.th, width: '150px' }}>Stations</th>
            <th style={{ ...styles.th, width: '150px', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inventory.length === 0 ? (
            <EmptyState />
          ) : (
            inventory.map((item) => (
              <InventoryTableRow
                key={item.id}
                item={item}
                onEditItem={onEditItem}
                onDeleteItem={onDeleteItem}
                businessId={businessId}
                categories={categories}
                stations={stations}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default InventoryTable;