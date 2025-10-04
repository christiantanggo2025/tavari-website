// components/POS/InventoryFilters.jsx - Search and filter controls component
import React from 'react';
import { TavariStyles } from '../../utils/TavariStyles';

const InventoryFilters = ({
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories = [],
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  totalItems
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleSortChange = (e) => {
    const [field, order] = e.target.value.split('-');
    setSortBy(field);
    setSortOrder(order);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePrevPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(Math.min(totalPages, currentPage + 1));
  };

  const styles = {
    controls: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: TavariStyles.spacing.xl,
      gap: TavariStyles.spacing.xl,
      flexWrap: 'wrap',
      backgroundColor: TavariStyles.colors.white,
      padding: TavariStyles.spacing.lg,
      borderRadius: TavariStyles.borderRadius.lg,
      border: `1px solid ${TavariStyles.colors.gray200}`,
      boxShadow: TavariStyles.shadows.sm
    },
    
    searchFilters: {
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap'
    },
    
    searchInput: {
      ...TavariStyles.components.form.input,
      flex: 1,
      minWidth: '250px',
      borderColor: TavariStyles.colors.primary,
      fontSize: TavariStyles.typography.fontSize.base
    },
    
    select: {
      ...TavariStyles.components.form.select,
      minWidth: '150px'
    },
    
    sortSelect: {
      ...TavariStyles.components.form.select,
      minWidth: '180px'
    },
    
    pagination: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.md,
      flexWrap: 'wrap'
    },
    
    paginationGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    
    pageButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.sm,
      minWidth: '80px'
    },
    
    pageButtonDisabled: {
      backgroundColor: TavariStyles.colors.gray300,
      color: TavariStyles.colors.gray500,
      cursor: 'not-allowed',
      borderColor: TavariStyles.colors.gray300
    },
    
    pageInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray700,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      whiteSpace: 'nowrap'
    },
    
    itemsPerPageSelect: {
      ...TavariStyles.components.form.select,
      minWidth: '120px'
    },
    
    filterSection: {
      display: 'flex',
      alignItems: 'center',
      gap: TavariStyles.spacing.sm
    },
    
    filterLabel: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontWeight: TavariStyles.typography.fontWeight.medium,
      whiteSpace: 'nowrap'
    },
    
    clearButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.sm,
      color: TavariStyles.colors.gray500,
      fontSize: TavariStyles.typography.fontSize.xs
    },
    
    resultsInfo: {
      fontSize: TavariStyles.typography.fontSize.sm,
      color: TavariStyles.colors.gray600,
      fontStyle: 'italic'
    }
  };

  const hasActiveFilters = searchTerm || filterCategory;

  return (
    <div style={styles.controls}>
      {/* Search and Filters Section */}
      <div style={styles.searchFilters}>
        <input
          type="text"
          placeholder="Search items by name, SKU, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
        
        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={styles.select}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>
        
        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Sort:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={handleSortChange}
            style={styles.sortSelect}
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="stock_quantity-asc">Stock Low-High</option>
            <option value="stock_quantity-desc">Stock High-Low</option>
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>
        </div>
        
        {hasActiveFilters && (
          <button
            style={styles.clearButton}
            onClick={() => {
              setSearchTerm('');
              setFilterCategory('');
            }}
            title="Clear all filters"
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Pagination Section */}
      <div style={styles.pagination}>
        <div style={styles.paginationGroup}>
          <span style={styles.filterLabel}>Show:</span>
          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            style={styles.itemsPerPageSelect}
          >
            <option value="10">10 per page</option>
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
        
        <div style={styles.paginationGroup}>
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            style={{
              ...styles.pageButton,
              ...(currentPage <= 1 ? styles.pageButtonDisabled : {})
            }}
          >
            Previous
          </button>
          
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages || 1}
          </span>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            style={{
              ...styles.pageButton,
              ...(currentPage >= totalPages ? styles.pageButtonDisabled : {})
            }}
          >
            Next
          </button>
        </div>
        
        {totalItems > 0 && (
          <div style={styles.resultsInfo}>
            {totalItems} item{totalItems !== 1 ? 's' : ''} total
            {hasActiveFilters && ' (filtered)'}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryFilters;