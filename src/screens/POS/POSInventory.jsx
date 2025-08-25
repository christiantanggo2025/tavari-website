// src/screens/POS/POSInventory.jsx
// Steps 101-106: Enhanced inventory management with station routing
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useBusiness } from '../../contexts/BusinessContext';
import { logAction } from '../../helpers/posAudit';

const POSInventory = () => {
  const { business } = useBusiness();
  const businessId = business?.id;

  const [inventory, setInventory] = useState([]);
  const [stations, setStations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');

  // New item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSKU, setNewItemSKU] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemCategoryId, setNewItemCategoryId] = useState(null);
  const [newItemStations, setNewItemStations] = useState([]);
  const [newItemTrackStock, setNewItemTrackStock] = useState(false);
  const [newItemStockQuantity, setNewItemStockQuantity] = useState('');
  const [newItemLowThreshold, setNewItemLowThreshold] = useState('5');

  // Edit item state
  const [editItemId, setEditItemId] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCost, setEditItemCost] = useState('');
  const [editItemSKU, setEditItemSKU] = useState('');
  const [editItemBarcode, setEditItemBarcode] = useState('');
  const [editItemCategoryId, setEditItemCategoryId] = useState(null);
  const [editItemStations, setEditItemStations] = useState([]);
  const [editItemTrackStock, setEditItemTrackStock] = useState(false);
  const [editItemStockQuantity, setEditItemStockQuantity] = useState('');
  const [editItemLowThreshold, setEditItemLowThreshold] = useState('5');

  useEffect(() => {
    if (businessId) {
      fetchInventory();
      fetchCategories();
      fetchStations();
    }
  }, [businessId, currentPage, searchTerm, sortBy, sortOrder, filterCategory]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('pos_inventory')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId);

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (filterCategory) {
        query = query.eq('category_id', filterCategory);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setInventory(data || []);

      await logAction({
        action: 'inventory_loaded',
        context: 'POSInventory',
        metadata: { 
          item_count: data?.length || 0,
          total_items: count,
          page: currentPage,
          search_term: searchTerm
        }
      });

    } catch (err) {
      setError('Error fetching inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('id, name')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.warn('Error fetching categories:', err);
    }
  };

  const fetchStations = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_stations')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setStations(data || []);
    } catch (err) {
      console.warn('Error fetching stations:', err);
    }
  };

  const handleStationToggle = (stationId, isNew = true) => {
    const stationsArray = isNew ? newItemStations : editItemStations;
    const setStationsArray = isNew ? setNewItemStations : setEditItemStations;
    
    if (stationsArray.includes(stationId)) {
      setStationsArray(stationsArray.filter(id => id !== stationId));
    } else {
      setStationsArray([...stationsArray, stationId]);
    }
  };

  const addItem = async () => {
    if (!newItemName.trim()) {
      setError('Item name is required');
      return;
    }

    if (!newItemPrice || parseFloat(newItemPrice) < 0) {
      setError('Valid price is required');
      return;
    }

    setError(null);
    try {
      const itemData = {
        business_id: businessId,
        name: newItemName.trim(),
        price: parseFloat(newItemPrice) || 0,
        cost: parseFloat(newItemCost) || 0,
        sku: newItemSKU.trim() || null,
        barcode: newItemBarcode.trim() || null,
        category_id: newItemCategoryId || null,
        station_ids: newItemStations.length > 0 ? newItemStations : null,
        track_stock: newItemTrackStock,
        stock_quantity: newItemTrackStock ? (parseInt(newItemStockQuantity) || 0) : null,
        low_stock_threshold: newItemTrackStock ? (parseInt(newItemLowThreshold) || 5) : null
      };

      const { error } = await supabase.from('pos_inventory').insert([itemData]);
      if (error) throw error;

      await logAction({
        action: 'inventory_item_created',
        context: 'POSInventory',
        metadata: {
          item_name: newItemName.trim(),
          price: parseFloat(newItemPrice),
          stations: newItemStations.length,
          track_stock: newItemTrackStock
        }
      });

      // Reset form
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCost('');
      setNewItemSKU('');
      setNewItemBarcode('');
      setNewItemCategoryId(null);
      setNewItemStations([]);
      setNewItemTrackStock(false);
      setNewItemStockQuantity('');
      setNewItemLowThreshold('5');

      fetchInventory();

    } catch (err) {
      setError('Error adding item: ' + err.message);
    }
  };

  const startEditItem = (item) => {
    setEditItemId(item.id);
    setEditItemName(item.name);
    setEditItemPrice(item.price);
    setEditItemCost(item.cost);
    setEditItemSKU(item.sku || '');
    setEditItemBarcode(item.barcode || '');
    setEditItemCategoryId(item.category_id);
    setEditItemStations(Array.isArray(item.station_ids) ? item.station_ids : []);
    setEditItemTrackStock(item.track_stock);
    setEditItemStockQuantity(item.stock_quantity || '');
    setEditItemLowThreshold(item.low_stock_threshold || '5');
  };

  const cancelEdit = () => {
    setEditItemId(null);
    setEditItemName('');
    setEditItemPrice('');
    setEditItemCost('');
    setEditItemSKU('');
    setEditItemBarcode('');
    setEditItemCategoryId(null);
    setEditItemStations([]);
    setEditItemTrackStock(false);
    setEditItemStockQuantity('');
    setEditItemLowThreshold('5');
  };

  const saveEditItem = async () => {
    if (!editItemName.trim()) {
      setError('Item name is required');
      return;
    }

    setError(null);
    try {
      const itemData = {
        name: editItemName.trim(),
        price: parseFloat(editItemPrice) || 0,
        cost: parseFloat(editItemCost) || 0,
        sku: editItemSKU.trim() || null,
        barcode: editItemBarcode.trim() || null,
        category_id: editItemCategoryId || null,
        station_ids: editItemStations.length > 0 ? editItemStations : null,
        track_stock: editItemTrackStock,
        stock_quantity: editItemTrackStock ? (parseInt(editItemStockQuantity) || 0) : null,
        low_stock_threshold: editItemTrackStock ? (parseInt(editItemLowThreshold) || 5) : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pos_inventory')
        .update(itemData)
        .eq('id', editItemId);

      if (error) throw error;

      await logAction({
        action: 'inventory_item_updated',
        context: 'POSInventory',
        metadata: {
          item_id: editItemId,
          item_name: editItemName.trim(),
          stations: editItemStations.length
        }
      });

      cancelEdit();
      fetchInventory();

    } catch (err) {
      setError('Error updating item: ' + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    setError(null);
    try {
      const item = inventory.find(i => i.id === id);
      
      const { error } = await supabase.from('pos_inventory').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'inventory_item_deleted',
        context: 'POSInventory',
        metadata: {
          item_id: id,
          item_name: item?.name
        }
      });

      fetchInventory();

    } catch (err) {
      setError('Error deleting item: ' + err.message);
    }
  };

  const getStationNames = (stationIds) => {
    if (!Array.isArray(stationIds) || stationIds.length === 0) return 'No routing';
    
    return stationIds
      .map(id => {
        const station = stations.find(s => s.id === id);
        return station ? station.name : `Unknown-${id}`;
      })
      .join(', ');
  };

  const getStockStatus = (item) => {
    if (!item.track_stock) return null;
    
    const quantity = item.stock_quantity || 0;
    const threshold = item.low_stock_threshold || 5;
    
    if (quantity <= 0) {
      return { text: 'OUT OF STOCK', color: '#dc2626', bg: '#fee2e2' };
    } else if (quantity <= threshold) {
      return { text: 'LOW STOCK', color: '#f59e0b', bg: '#fef3c7' };
    } else {
      return { text: 'IN STOCK', color: '#059669', bg: '#d1fae5' };
    }
  };

  const totalPages = Math.ceil((inventory.length + itemsPerPage - 1) / itemsPerPage);

  if (loading && inventory.length === 0) {
    return <div style={styles.loading}>Loading inventory...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>POS Inventory Management</h2>
        <p>Manage products, pricing, and station routing</p>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchFilters}>
          <input
            type="text"
            placeholder="Search items by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={styles.select}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            style={styles.select}
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="price-asc">Price Low-High</option>
            <option value="price-desc">Price High-Low</option>
            <option value="stock_quantity-asc">Stock Low-High</option>
            <option value="created_at-desc">Newest First</option>
          </select>
        </div>
        
        <div style={styles.pagination}>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            style={styles.select}
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
          
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            style={styles.pageButton}
          >
            Previous
          </button>
          
          <span style={styles.pageInfo}>
            Page {currentPage} of {totalPages || 1}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            style={styles.pageButton}
          >
            Next
          </button>
        </div>
      </div>

      {/* Add new item form */}
      <div style={styles.addSection}>
        <h3>Add New Item</h3>
        <div style={styles.form}>
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="Item name *"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              style={styles.input}
            />
            <input
              type="number"
              placeholder="Price *"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              style={styles.input}
              step="0.01"
              min="0"
            />
            <input
              type="number"
              placeholder="Cost"
              value={newItemCost}
              onChange={(e) => setNewItemCost(e.target.value)}
              style={styles.input}
              step="0.01"
              min="0"
            />
          </div>
          
          <div style={styles.formRow}>
            <input
              type="text"
              placeholder="SKU"
              value={newItemSKU}
              onChange={(e) => setNewItemSKU(e.target.value)}
              style={styles.input}
            />
            <input
              type="text"
              placeholder="Barcode"
              value={newItemBarcode}
              onChange={(e) => setNewItemBarcode(e.target.value)}
              style={styles.input}
            />
            <select
              value={newItemCategoryId || ''}
              onChange={(e) => setNewItemCategoryId(e.target.value || null)}
              style={styles.select}
            >
              <option value="">-- Select Category --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Station routing */}
          <div style={styles.formRow}>
            <div style={styles.stationsGroup}>
              <label style={styles.label}>Route to Stations:</label>
              <div style={styles.stationCheckboxes}>
                {stations.map(station => (
                  <label key={station.id} style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={newItemStations.includes(station.id)}
                      onChange={() => handleStationToggle(station.id, true)}
                    />
                    {station.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Stock tracking */}
          <div style={styles.formRow}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={newItemTrackStock}
                onChange={(e) => setNewItemTrackStock(e.target.checked)}
              />
              Track Stock
            </label>
            
            {newItemTrackStock && (
              <>
                <input
                  type="number"
                  placeholder="Stock Quantity"
                  value={newItemStockQuantity}
                  onChange={(e) => setNewItemStockQuantity(e.target.value)}
                  style={styles.input}
                  min="0"
                />
                <input
                  type="number"
                  placeholder="Low Stock Alert"
                  value={newItemLowThreshold}
                  onChange={(e) => setNewItemLowThreshold(e.target.value)}
                  style={styles.input}
                  min="1"
                />
              </>
            )}
          </div>

          <button onClick={addItem} style={styles.addButton}>
            Add Item
          </button>
        </div>
      </div>

      {/* Inventory table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Cost</th>
              <th style={styles.th}>SKU</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Stations</th>
              <th style={styles.th}>Stock</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 && (
              <tr>
                <td colSpan="8" style={styles.emptyCell}>
                  {searchTerm ? 'No items match your search criteria' : 'No inventory items found'}
                </td>
              </tr>
            )}
            {inventory.map((item, i) => {
              const stockStatus = getStockStatus(item);
              
              return (
                <tr key={item.id} style={{
                  ...styles.row,
                  backgroundColor: i % 2 === 0 ? '#f9f9f9' : 'white'
                }}>
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <input
                        type="text"
                        value={editItemName}
                        onChange={(e) => setEditItemName(e.target.value)}
                        style={styles.input}
                      />
                    ) : (
                      <div>
                        <div style={styles.itemName}>{item.name}</div>
                        {item.barcode && (
                          <div style={styles.itemBarcode}>#{item.barcode}</div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <input
                        type="number"
                        value={editItemPrice}
                        onChange={(e) => setEditItemPrice(e.target.value)}
                        style={styles.input}
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      `$${Number(item.price || 0).toFixed(2)}`
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <input
                        type="number"
                        value={editItemCost}
                        onChange={(e) => setEditItemCost(e.target.value)}
                        style={styles.input}
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      `$${Number(item.cost || 0).toFixed(2)}`
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <input
                        type="text"
                        value={editItemSKU}
                        onChange={(e) => setEditItemSKU(e.target.value)}
                        style={styles.input}
                      />
                    ) : (
                      item.sku || '—'
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <select
                        value={editItemCategoryId || ''}
                        onChange={(e) => setEditItemCategoryId(e.target.value || null)}
                        style={styles.select}
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      categories.find(c => c.id === item.category_id)?.name || '—'
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <div style={styles.stationCheckboxes}>
                        {stations.map(station => (
                          <label key={station.id} style={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={editItemStations.includes(station.id)}
                              onChange={() => handleStationToggle(station.id, false)}
                            />
                            {station.name}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div style={styles.stationsList}>
                        {getStationNames(item.station_ids)}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <div style={styles.stockEdit}>
                        <label style={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={editItemTrackStock}
                            onChange={(e) => setEditItemTrackStock(e.target.checked)}
                          />
                          Track
                        </label>
                        {editItemTrackStock && (
                          <input
                            type="number"
                            value={editItemStockQuantity}
                            onChange={(e) => setEditItemStockQuantity(e.target.value)}
                            style={styles.input}
                            placeholder="Qty"
                            min="0"
                          />
                        )}
                      </div>
                    ) : (
                      <div style={styles.stockDisplay}>
                        {stockStatus ? (
                          <div>
                            <div style={{
                              ...styles.stockBadge,
                              color: stockStatus.color,
                              backgroundColor: stockStatus.bg
                            }}>
                              {stockStatus.text}
                            </div>
                            <div style={styles.stockQuantity}>
                              Qty: {item.stock_quantity || 0}
                            </div>
                          </div>
                        ) : (
                          <span style={styles.noStock}>Not tracked</span>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    {editItemId === item.id ? (
                      <div style={styles.editActions}>
                        <button onClick={saveEditItem} style={styles.saveButton}>Save</button>
                        <button onClick={cancelEdit} style={styles.cancelButton}>Cancel</button>
                      </div>
                    ) : (
                      <div style={styles.actions}>
                        <button onClick={() => startEditItem(item)} style={styles.editButton}>
                          Edit
                        </button>
                        <button onClick={() => deleteItem(item.id)} style={styles.deleteButton}>
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    paddingTop: '100px',
    boxSizing: 'border-box'
  },
  header: {
    marginBottom: '30px',
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '200px',
    fontSize: '18px',
    color: '#6b7280'
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
    flexWrap: 'wrap'
  },
  searchFilters: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flex: 1
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '2px solid #008080',
    borderRadius: '6px',
    fontSize: '16px',
    minWidth: '200px'
  },
  select: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  pageButton: {
    padding: '8px 12px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#374151'
  },
  addSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '30px',
    border: '2px solid #008080'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    alignItems: 'end'
  },
  input: {
    padding: '12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px'
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '8px',
    display: 'block'
  },
  stationsGroup: {
    gridColumn: 'span 3'
  },
  stationCheckboxes: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    marginTop: '8px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  addButton: {
    padding: '15px 20px',
    backgroundColor: '#008080',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    justifySelf: 'start'
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'auto',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  headerRow: {
    backgroundColor: '#008080',
    color: 'white',
    position: 'sticky',
    top: 0
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #006666'
  },
  row: {
    transition: 'background-color 0.2s ease'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  itemName: {
    fontWeight: 'bold',
    color: '#1f2937'
  },
  itemBarcode: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '2px'
  },
  stationsList: {
    fontSize: '12px',
    color: '#374151'
  },
  stockDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  stockBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  stockQuantity: {
    fontSize: '12px',
    color: '#6b7280'
  },
  noStock: {
    fontSize: '12px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  stockEdit: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  actions: {
    display: 'flex',
    gap: '8px'
  },
  editActions: {
    display: 'flex',
    gap: '8px'
  },
  editButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  saveButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  }
};

export default POSInventory;