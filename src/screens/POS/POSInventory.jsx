// src/screens/POS/POSInventory.jsx - FIXED: Allow $0.00 items
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { logAction } from '../../helpers/posAudit';
import POSAuthWrapper from '../../components/Auth/POSAuthWrapper';
import { usePOSAuth } from '../../hooks/usePOSAuth';
import { TavariStyles } from '../../utils/TavariStyles';
import TavariCheckbox from '../../components/UI/TavariCheckbox';

const POSInventory = () => {
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'POSInventory'
  });

  // Data state
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stations, setStations] = useState([]);
  const [taxCategories, setTaxCategories] = useState([]);
  const [modifierGroups, setModifierGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state - only fields that exist in actual database
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    sku: '',
    barcode: '',
    category_id: '',
    station_ids: [],
    track_stock: false,
    stock_quantity: '',
    low_stock_threshold: '5',
    description: '',
    allow_price_override: false,
    require_manager_override: false,
    display_on_pos: true,
    online_ordering_available: false,
    tax_category_ids: [],
    tax_exempt: false,
    rebate_eligible: false,
    rebate_amount: '',
    rebate_type: 'fixed',
    modifier_group_ids: [],
    loyalty_points_earned: '',
    loyalty_points_cost: '',
    max_quantity_per_sale: '',
    min_quantity_per_sale: '1',
    prep_time_minutes: '',
    calories: '',
    item_tax_overrides: []
  });

  // Calculate pagination values
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Load ALL supporting data when authenticated
  useEffect(() => {
    if (auth.selectedBusinessId && auth.authUser) {
      console.log('POSInventory: Loading data for business:', auth.selectedBusinessId);
      
      // Load all supporting data first
      Promise.all([
        fetchCategories(),
        fetchStations(),
        fetchTaxCategories(),
        fetchModifierGroups()
      ]).then(() => {
        console.log('POSInventory: All supporting data loaded');
        fetchInventory();
      });
    }
  }, [auth.selectedBusinessId, auth.authUser]);

  // Reload inventory when pagination/search changes
  useEffect(() => {
    if (auth.selectedBusinessId && !loading) {
      fetchInventory();
    }
  }, [currentPage, itemsPerPage, searchTerm, sortBy, sortOrder]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchInventory = async () => {
    if (!auth.selectedBusinessId) return;
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('pos_inventory')
        .select('*', { count: 'exact' })
        .eq('business_id', auth.selectedBusinessId);

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      console.log('POSInventory: Loaded', data?.length, 'items');
      console.log('POSInventory: Sample item station_ids:', data?.[0]?.station_ids);
      setInventory(data || []);
      setTotalItems(count || 0);

      await logAction({
        action: 'inventory_loaded',
        context: 'POSInventory',
        metadata: { 
          item_count: data?.length || 0,
          page: currentPage,
          search_term: searchTerm,
          sort: `${sortBy}_${sortOrder}`
        }
      });
    } catch (err) {
      console.error('POSInventory: Error fetching inventory:', err);
      setError('Error fetching inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!auth.selectedBusinessId) return;
    try {
      const { data, error } = await supabase
        .from('pos_categories')
        .select('id, name, color, emoji')
        .eq('business_id', auth.selectedBusinessId)
        .order('name', { ascending: true });
      if (error) throw error;
      console.log('POSInventory: Loaded', data?.length, 'categories');
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchStations = async () => {
    if (!auth.selectedBusinessId) return;
    try {
      const { data, error } = await supabase
        .from('pos_stations')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      console.log('POSInventory: Loaded stations:', data);
      setStations(data || []);
      
      // If no stations exist, create default Kitchen station
      if (!data || data.length === 0) {
        console.log('POSInventory: No stations found, creating default Kitchen station');
        const { data: newStation, error: createError } = await supabase
          .from('pos_stations')
          .insert({
            business_id: auth.selectedBusinessId,
            name: 'Kitchen',
            description: 'Main kitchen station',
            printer_ids: [],
            is_active: true,
            sort_order: 1
          })
          .select()
          .single();
        
        if (!createError && newStation) {
          console.log('POSInventory: Created default Kitchen station');
          setStations([newStation]);
        }
      }
    } catch (err) {
      console.error('Error fetching stations:', err);
      setError('Unable to load stations. Please check your station configuration.');
    }
  };

  const fetchTaxCategories = async () => {
    if (!auth.selectedBusinessId) return;
    try {
      const { data, error } = await supabase
        .from('pos_tax_categories')
        .select('*')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      console.log('POSInventory: Loaded', data?.length, 'tax categories');
      setTaxCategories(data || []);
    } catch (err) {
      console.error('Error fetching tax categories:', err);
    }
  };

  const fetchModifierGroups = async () => {
    if (!auth.selectedBusinessId) return;
    try {
      console.log('POSInventory: Fetching modifier groups for business:', auth.selectedBusinessId);
      
      const { data, error } = await supabase
        .from('pos_modifier_groups')
        .select('id, name, is_required, max_selections, sort_order')
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsLast: true });
      
      if (error) {
        console.error('Error fetching modifier groups:', error);
        throw error;
      }
      
      console.log('POSInventory: Loaded modifier groups:', data);
      console.log('POSInventory: Modifier groups count:', data?.length || 0);
      
      // Transform the data to match what the component expects
      const transformedData = (data || []).map(group => ({
        ...group,
        required: group.is_required || false // Map is_required to required for backward compatibility
      }));
      
      setModifierGroups(transformedData);
      
    } catch (err) {
      console.error('Error fetching modifier groups:', err);
      // Don't set error here, just log it - modifier groups are optional
      setModifierGroups([]);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      cost: '',
      sku: '',
      barcode: '',
      category_id: '',
      station_ids: [],
      track_stock: false,
      stock_quantity: '',
      low_stock_threshold: '5',
      description: '',
      allow_price_override: false,
      require_manager_override: false,
      display_on_pos: true,
      online_ordering_available: false,
      tax_category_ids: [],
      tax_exempt: false,
      rebate_eligible: false,
      rebate_amount: '',
      rebate_type: 'fixed',
      modifier_group_ids: [],
      loyalty_points_earned: '',
      loyalty_points_cost: '',
      max_quantity_per_sale: '',
      min_quantity_per_sale: '1',
      prep_time_minutes: '',
      calories: '',
      item_tax_overrides: []
    });
  };

  const openAddModal = () => {
    console.log('Opening add modal with stations:', stations);
    console.log('Opening add modal with modifier groups:', modifierGroups);
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = async (item) => {
    console.log('Opening edit modal for item:', item);
    console.log('Available stations:', stations);
    console.log('Available modifier groups:', modifierGroups);
    console.log('Item station_ids from DB:', item.station_ids, typeof item.station_ids);
    
    setEditingItem(item);
    
    // Enhanced station_ids handling with debugging
    let stationIds = [];
    
    if (item.station_ids) {
      if (Array.isArray(item.station_ids)) {
        stationIds = item.station_ids;
        console.log('station_ids is already an array:', stationIds);
      } else if (typeof item.station_ids === 'string') {
        try {
          stationIds = JSON.parse(item.station_ids);
          console.log('Parsed station_ids from string:', stationIds);
        } catch (e) {
          console.error('Failed to parse station_ids string:', e);
          stationIds = [];
        }
      } else if (typeof item.station_ids === 'object') {
        // Handle JSONB object/array
        stationIds = Array.isArray(item.station_ids) ? item.station_ids : [];
        console.log('station_ids from JSONB object:', stationIds);
      }
    }
    
    console.log('Final parsed station_ids for form:', stationIds);
    
    setFormData({
      name: item.name || '',
      price: item.price || '',
      cost: item.cost || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      category_id: item.category_id || '',
      station_ids: stationIds,
      track_stock: item.track_stock || false,
      stock_quantity: item.stock_quantity || '',
      low_stock_threshold: item.low_stock_threshold || '5',
      description: item.description || '',
      allow_price_override: item.allow_price_override || false,
      require_manager_override: item.require_manager_override || false,
      display_on_pos: item.display_on_pos !== false,
      online_ordering_available: item.online_ordering_available || false,
      tax_category_ids: item.tax_category_ids || [],
      tax_exempt: item.tax_exempt || false,
      rebate_eligible: item.rebate_eligible || false,
      rebate_amount: item.rebate_amount || '',
      rebate_type: item.rebate_type || 'fixed',
      modifier_group_ids: item.modifier_group_ids || [],
      loyalty_points_earned: item.loyalty_points_earned || '',
      loyalty_points_cost: item.loyalty_points_cost || '',
      max_quantity_per_sale: item.max_quantity_per_sale || '',
      min_quantity_per_sale: item.min_quantity_per_sale || '1',
      prep_time_minutes: item.prep_time_minutes || '',
      calories: item.calories || '',
      item_tax_overrides: item.item_tax_overrides || []
    });
    
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingItem(null);
    resetForm();
  };

  const handleInputChange = (field, value) => {
    console.log(`Form field changed: ${field} = ${value}`);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleArrayField = (field, value) => {
    console.log(`Toggling array field: ${field}, value: ${value}`);
    setFormData(prev => {
      const currentArray = prev[field] || [];
      console.log(`Current ${field}:`, currentArray);
      
      let newArray;
      if (currentArray.includes(value)) {
        newArray = currentArray.filter(v => v !== value);
        console.log(`Removed ${value} from ${field}:`, newArray);
      } else {
        newArray = [...currentArray, value];
        console.log(`Added ${value} to ${field}:`, newArray);
      }
      
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  const saveItem = async () => {
    if (!formData.name.trim()) {
      setError('Item name is required');
      return;
    }

    // FIXED: Allow $0.00 items - only check for negative prices or invalid values
    const priceValue = parseFloat(formData.price);
    if (formData.price === '' || isNaN(priceValue) || priceValue < 0) {
      setError('Price must be $0.00 or greater');
      return;
    }

    setError(null);
    try {
      console.log('=== SAVE ITEM DEBUG ===');
      console.log('Form data station_ids:', formData.station_ids);
      console.log('Form data station_ids type:', typeof formData.station_ids);
      console.log('Form data station_ids is array:', Array.isArray(formData.station_ids));
      console.log('Form data station_ids length:', formData.station_ids?.length);

      // Build itemData using ONLY columns that exist in your actual schema
      const itemData = {
        business_id: auth.selectedBusinessId,
        name: formData.name.trim(),
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        sku: formData.sku.trim() || null,
        barcode: formData.barcode.trim() || null,
        category_id: formData.category_id || null,
        station_ids: Array.isArray(formData.station_ids) ? formData.station_ids : [],
        track_stock: formData.track_stock || false,
        stock_quantity: formData.track_stock ? (parseInt(formData.stock_quantity) || 0) : null,
        low_stock_threshold: formData.track_stock ? (parseInt(formData.low_stock_threshold) || 5) : null,
        description: formData.description ? formData.description.trim() : null,
        
        // These columns exist in your schema
        allow_price_override: formData.allow_price_override || false,
        require_manager_override: formData.require_manager_override || false,
        display_on_pos: formData.display_on_pos !== undefined ? formData.display_on_pos : true,
        online_ordering_available: formData.online_ordering_available || false,
        
        // Tax and rebate fields that exist
        tax_category_ids: formData.tax_category_ids && formData.tax_category_ids.length > 0 ? formData.tax_category_ids : null,
        tax_exempt: formData.tax_exempt || false,
        rebate_eligible: formData.rebate_eligible || false,
        rebate_amount: formData.rebate_eligible ? (parseFloat(formData.rebate_amount) || null) : null,
        rebate_type: formData.rebate_eligible ? (formData.rebate_type || 'fixed') : null,
        
        // Modifier and loyalty fields that exist
        modifier_group_ids: formData.modifier_group_ids && formData.modifier_group_ids.length > 0 ? formData.modifier_group_ids : null,
        loyalty_points_earned: parseInt(formData.loyalty_points_earned) || 0,
        loyalty_points_cost: parseInt(formData.loyalty_points_cost) || 0,
        
        // Quantity and timing fields that exist
        max_quantity_per_sale: formData.max_quantity_per_sale ? parseInt(formData.max_quantity_per_sale) : null,
        min_quantity_per_sale: parseInt(formData.min_quantity_per_sale) || 1,
        prep_time_minutes: formData.prep_time_minutes ? parseInt(formData.prep_time_minutes) : null,
        calories: formData.calories ? parseInt(formData.calories) : null,
        
        // Tax overrides field that exists
        item_tax_overrides: formData.item_tax_overrides && formData.item_tax_overrides.length > 0 ? formData.item_tax_overrides : null
      };

      console.log('Final itemData being sent to database:', itemData);
      console.log('Station IDs specifically:', itemData.station_ids);

      if (editingItem) {
        console.log('Updating existing item with ID:', editingItem.id);
        
        const { data, error } = await supabase
          .from('pos_inventory')
          .update({ ...itemData, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id)
          .select();

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }

        console.log('Updated item returned from DB:', data);

        await logAction({
          action: 'inventory_item_updated',
          context: 'POSInventory',
          metadata: { 
            item_id: editingItem.id, 
            item_name: itemData.name,
            station_ids: itemData.station_ids,
            changes: Object.keys(itemData).filter(key => itemData[key] !== editingItem[key])
          }
        });
      } else {
        console.log('Creating new item');
        
        const { data, error } = await supabase
          .from('pos_inventory')
          .insert([itemData])
          .select();

        if (error) {
          console.error('Insert error details:', error);
          throw error;
        }

        console.log('Inserted item returned from DB:', data);

        await logAction({
          action: 'inventory_item_created',
          context: 'POSInventory',
          metadata: {
            item_name: itemData.name,
            price: itemData.price,
            station_ids: itemData.station_ids,
            stations: itemData.station_ids?.length || 0
          }
        });
      }

      closeModals();
      fetchInventory();
    } catch (err) {
      console.error('Save error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      console.error('Error details:', err.details);
      setError('Error saving item: ' + err.message);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
    
    setError(null);
    try {
      const { error } = await supabase.from('pos_inventory').delete().eq('id', id);
      if (error) throw error;

      await logAction({
        action: 'inventory_item_deleted',
        context: 'POSInventory',
        metadata: { item_id: id }
      });

      fetchInventory();
    } catch (err) {
      setError('Error deleting item: ' + err.message);
    }
  };

  const getStockStatus = (item) => {
    if (!item.track_stock) return null;
    
    const currentStock = item.stock_quantity || 0;
    const threshold = item.low_stock_threshold || 5;
    
    if (currentStock <= 0) {
      return { text: 'Out of Stock', color: TavariStyles.colors.danger };
    } else if (currentStock <= threshold) {
      return { text: 'Low Stock', color: TavariStyles.colors.warning };
    } else {
      return { text: 'In Stock', color: TavariStyles.colors.success };
    }
  };

  const getStationNames = (stationIds) => {
    console.log('getStationNames called with:', stationIds, typeof stationIds);
    
    if (!stationIds) {
      console.log('No station_ids provided');
      return 'â€”';
    }
    
    let idsArray = [];
    
    // Handle different data types for station_ids
    if (Array.isArray(stationIds)) {
      idsArray = stationIds;
    } else if (typeof stationIds === 'string') {
      try {
        idsArray = JSON.parse(stationIds);
      } catch (e) {
        console.error('Failed to parse station_ids string:', e);
        return 'â€”';
      }
    } else if (typeof stationIds === 'object') {
      idsArray = Array.isArray(stationIds) ? stationIds : [];
    }
    
    if (idsArray.length === 0) {
      console.log('Empty station_ids array');
      return 'â€”';
    }
    
    console.log('Processing station IDs:', idsArray);
    console.log('Available stations:', stations);
    
    const stationNames = idsArray
      .map(id => {
        const station = stations.find(s => s.id === id);
        console.log(`Looking for station ${id}, found:`, station);
        return station ? station.name : `Unknown (${id})`;
      })
      .join(', ');
    
    console.log('Final station names:', stationNames);
    return stationNames;
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => setCurrentPage(1)}
          style={{
            ...styles.pageButton,
            ...styles.pageButtonInactive
          }}
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(<span key="dots1" style={{ padding: '0 8px' }}>...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          style={{
            ...styles.pageButton,
            ...(i === currentPage ? styles.pageButtonActive : styles.pageButtonInactive)
          }}
        >
          {i}
        </button>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(<span key="dots2" style={{ padding: '0 8px' }}>...</span>);
      }
      buttons.push(
        <button
          key="last"
          onClick={() => setCurrentPage(totalPages)}
          style={{
            ...styles.pageButton,
            ...styles.pageButtonInactive
          }}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  const styles = {
    container: {
      ...TavariStyles.layout.container,
      padding: TavariStyles.spacing['2xl'],
      maxWidth: '1400px',
      margin: '0 auto'
    },
    header: {
      marginBottom: TavariStyles.spacing['3xl'],
      textAlign: 'center'
    },
    title: {
      fontSize: TavariStyles.typography.fontSize['3xl'],
      fontWeight: TavariStyles.typography.fontWeight.bold,
      color: TavariStyles.colors.gray900,
      marginBottom: TavariStyles.spacing.sm
    },
    subtitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      color: TavariStyles.colors.gray600
    },
    searchSection: {
      marginBottom: TavariStyles.spacing.xl,
      display: 'flex',
      gap: TavariStyles.spacing.md,
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    searchInput: {
      ...TavariStyles.components.form.input,
      flex: 1,
      minWidth: '250px'
    },
    addButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md
    },
    itemsPerPageSelect: {
      ...TavariStyles.components.form.select,
      width: 'auto'
    },
    table: {
      ...TavariStyles.components.table.table,
      marginBottom: TavariStyles.spacing.xl
    },
    th: {
      ...TavariStyles.components.table.th,
      backgroundColor: TavariStyles.colors.primary,
      cursor: 'pointer',
      userSelect: 'none',
      position: 'relative'
    },
    td: TavariStyles.components.table.td,
    row: TavariStyles.components.table.row,
    actions: {
      display: 'flex',
      gap: TavariStyles.spacing.sm
    },
    editButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.secondary,
      ...TavariStyles.components.button.sizes.sm
    },
    deleteButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.danger,
      ...TavariStyles.components.button.sizes.sm
    },
    error: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.error,
      marginBottom: TavariStyles.spacing.xl
    },
    modal: {
      ...TavariStyles.components.modal.overlay,
      zIndex: 10000
    },
    modalContent: {
      ...TavariStyles.components.modal.content,
      maxWidth: '900px',
      width: '90%',
      maxHeight: '90vh'
    },
    modalHeader: TavariStyles.components.modal.header,
    modalBody: {
      ...TavariStyles.components.modal.body,
      padding: TavariStyles.spacing.xl
    },
    modalFooter: TavariStyles.components.modal.footer,
    formSection: {
      marginBottom: TavariStyles.spacing.xl,
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.gray50,
      borderRadius: TavariStyles.borderRadius.md,
      border: `1px solid ${TavariStyles.colors.gray200}`
    },
    formSectionTitle: {
      fontSize: TavariStyles.typography.fontSize.lg,
      fontWeight: TavariStyles.typography.fontWeight.semibold,
      color: TavariStyles.colors.gray800,
      marginBottom: TavariStyles.spacing.md,
      borderBottom: `1px solid ${TavariStyles.colors.gray300}`,
      paddingBottom: TavariStyles.spacing.xs
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: TavariStyles.spacing.md
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: TavariStyles.components.form.label,
    input: TavariStyles.components.form.input,
    select: TavariStyles.components.form.select,
    textarea: {
      ...TavariStyles.components.form.input,
      minHeight: '80px',
      resize: 'vertical'
    },
    checkboxGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.md,
      marginTop: TavariStyles.spacing.sm
    },
    saveButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.primary,
      ...TavariStyles.components.button.sizes.md
    },
    cancelButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.variants.ghost,
      ...TavariStyles.components.button.sizes.md
    },
    stockBadge: {
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      fontWeight: TavariStyles.typography.fontWeight.bold,
      display: 'inline-block'
    },
    stationBadge: {
      fontSize: TavariStyles.typography.fontSize.xs,
      padding: `${TavariStyles.spacing.xs} ${TavariStyles.spacing.sm}`,
      borderRadius: TavariStyles.borderRadius.sm,
      backgroundColor: TavariStyles.colors.info,
      color: TavariStyles.colors.white,
      fontWeight: TavariStyles.typography.fontWeight.medium
    },
    paginationSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: TavariStyles.spacing.lg,
      backgroundColor: TavariStyles.colors.white,
      borderRadius: TavariStyles.borderRadius.md,
      boxShadow: TavariStyles.shadows.sm,
      flexWrap: 'wrap',
      gap: TavariStyles.spacing.md
    },
    paginationControls: {
      display: 'flex',
      gap: TavariStyles.spacing.sm,
      alignItems: 'center'
    },
    pageButton: {
      ...TavariStyles.components.button.base,
      ...TavariStyles.components.button.sizes.sm,
      padding: `${TavariStyles.spacing.sm} ${TavariStyles.spacing.md}`,
      minWidth: '40px'
    },
    pageButtonActive: {
      ...TavariStyles.components.button.variants.primary
    },
    pageButtonInactive: {
      ...TavariStyles.components.button.variants.ghost
    },
    noStationsWarning: {
      backgroundColor: TavariStyles.colors.warningBg,
      color: TavariStyles.colors.warningText,
      padding: TavariStyles.spacing.md,
      borderRadius: TavariStyles.borderRadius.md,
      marginTop: TavariStyles.spacing.sm,
      fontSize: TavariStyles.typography.fontSize.sm
    }
  };

  const loadingContent = (
    <div style={styles.container}>
      <div style={TavariStyles.components.loading.container}>Loading inventory...</div>
    </div>
  );

  const renderEditModal = () => {
    if (!showEditModal && !showAddModal) return null;

    const isEdit = showEditModal && editingItem;
    const modalTitle = isEdit ? `Edit Item: ${editingItem.name}` : 'Add New Item';

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h2>{modalTitle}</h2>
            <button onClick={closeModals} style={{ fontSize: '24px', cursor: 'pointer', border: 'none', background: 'none' }}>Ã—</button>
          </div>

          <div style={styles.modalBody}>
            {/* Basic Information */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Basic Information</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    style={styles.input}
                    placeholder="Item name"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Price * (Can be $0.00)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    style={styles.input}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Cost</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => handleInputChange('cost', e.target.value)}
                    style={styles.input}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    style={styles.input}
                    placeholder="SKU"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    style={styles.input}
                    placeholder="Barcode"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    style={styles.select}
                  >
                    <option value="">No Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  style={styles.textarea}
                  placeholder="Item description..."
                />
              </div>
            </div>

            {/* Station Routing */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Station Routing (Kitchen Display)</h3>
              {stations.length > 0 ? (
                <div style={styles.checkboxGroup}>
                  {stations.map(station => (
                    <TavariCheckbox
                      key={station.id}
                      checked={formData.station_ids.includes(station.id)}
                      onChange={() => {
                        console.log('Checkbox toggled for station:', station.id, station.name);
                        console.log('Current station_ids before toggle:', formData.station_ids);
                        toggleArrayField('station_ids', station.id);
                      }}
                      label={`${station.name}${station.description ? ` - ${station.description}` : ''}`}
                      id={`station-${station.id}`}
                    />
                  ))}
                </div>
              ) : (
                <div style={styles.noStationsWarning}>
                  No stations available. Please configure stations in the Station Management screen first.
                </div>
              )}
              <p style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600, marginTop: TavariStyles.spacing.sm }}>
                Select which stations should receive this item when ordered. Items will appear on the kitchen display screens for selected stations.
              </p>
              
              {/* DEBUG INFO */}
              <div style={{ 
                marginTop: TavariStyles.spacing.sm, 
                padding: TavariStyles.spacing.sm, 
                backgroundColor: TavariStyles.colors.gray100, 
                borderRadius: TavariStyles.borderRadius.sm,
                fontSize: TavariStyles.typography.fontSize.xs,
                color: TavariStyles.colors.gray700
              }}>
                <strong>Debug:</strong> Current station_ids: [{formData.station_ids.join(', ')}]
              </div>
            </div>

            {/* Inventory & Stock */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Inventory & Stock</h3>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <TavariCheckbox
                    checked={formData.track_stock}
                    onChange={(checked) => handleInputChange('track_stock', checked)}
                    label="Track Stock"
                    id="track-stock"
                  />
                </div>
                {formData.track_stock && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Stock Quantity</label>
                      <input
                        type="number"
                        value={formData.stock_quantity}
                        onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                        style={styles.input}
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Low Stock Threshold</label>
                      <input
                        type="number"
                        value={formData.low_stock_threshold}
                        onChange={(e) => handleInputChange('low_stock_threshold', e.target.value)}
                        style={styles.input}
                        min="0"
                        placeholder="5"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modifiers */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Modifier Groups</h3>
              <div style={styles.checkboxGroup}>
                {modifierGroups && modifierGroups.length > 0 ? (
                  modifierGroups.map(group => (
                    <TavariCheckbox
                      key={group.id}
                      checked={formData.modifier_group_ids.includes(group.id)}
                      onChange={() => {
                        console.log('Toggling modifier group:', group.id, group.name);
                        toggleArrayField('modifier_group_ids', group.id);
                      }}
                      label={`${group.name}${group.required ? ' (Required)' : ''}`}
                      id={`modifier-${group.id}`}
                    />
                  ))
                ) : (
                  <p style={{ color: TavariStyles.colors.gray500, fontStyle: 'italic' }}>
                    No modifier groups available. Create modifier groups in the Modifiers screen to assign them to items.
                  </p>
                )}
              </div>
              <p style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600, marginTop: TavariStyles.spacing.sm }}>
                Select modifier groups that should be available for this item. Required modifier groups must be selected by customers.
              </p>
              
              {/* DEBUG INFO for modifiers */}
              <div style={{ 
                marginTop: TavariStyles.spacing.sm, 
                padding: TavariStyles.spacing.sm, 
                backgroundColor: TavariStyles.colors.gray100, 
                borderRadius: TavariStyles.borderRadius.sm,
                fontSize: TavariStyles.typography.fontSize.xs,
                color: TavariStyles.colors.gray700
              }}>
                <strong>Debug:</strong> 
                <br />Loaded modifier groups: {modifierGroups.length}
                <br />Current modifier_group_ids: [{formData.modifier_group_ids.join(', ')}]
              </div>
            </div>

            {/* Settings & Options */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Settings & Options</h3>
              <div style={styles.checkboxGroup}>
                <TavariCheckbox
                  checked={formData.display_on_pos}
                  onChange={(checked) => handleInputChange('display_on_pos', checked)}
                  label="Display on POS"
                  id="display-on-pos"
                />
                <TavariCheckbox
                  checked={formData.allow_price_override}
                  onChange={(checked) => handleInputChange('allow_price_override', checked)}
                  label="Allow Price Override"
                  id="allow-price-override"
                />
                <TavariCheckbox
                  checked={formData.require_manager_override}
                  onChange={(checked) => handleInputChange('require_manager_override', checked)}
                  label="Require Manager Override"
                  id="require-manager-override"
                />
              </div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button onClick={closeModals} style={styles.cancelButton}>Cancel</button>
            <button onClick={saveItem} style={styles.saveButton}>
              {isEdit ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <POSAuthWrapper
      requiredRoles={['employee', 'manager', 'owner']}
      requireBusiness={true}
      componentName="POSInventory"
      loadingContent={loadingContent}
    >
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>POS Inventory Management</h2>
          <p style={styles.subtitle}>Manage products, pricing, and station routing</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Search and Controls */}
        <div style={styles.searchSection}>
          <input
            type="text"
            placeholder="Search items by name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <button onClick={openAddModal} style={styles.addButton}>
            Add New Item
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: TavariStyles.spacing.sm }}>
            <label style={{ fontSize: TavariStyles.typography.fontSize.sm, color: TavariStyles.colors.gray600 }}>
              Items per page:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={styles.itemsPerPageSelect}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        {loading ? (
          <div style={TavariStyles.components.loading.container}>Loading items...</div>
        ) : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th} onClick={() => handleSort('name')}>
                    Name {sortBy === 'name' && (sortOrder === 'asc' ? 'â–²' : 'â–¼')}
                  </th>
                  <th style={styles.th} onClick={() => handleSort('price')}>
                    Price {sortBy === 'price' && (sortOrder === 'asc' ? 'â–²' : 'â–¼')}
                  </th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Stations</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: TavariStyles.colors.gray500, fontStyle: 'italic' }}>
                      {searchTerm ? `No items match your search "${searchTerm}"` : 'No inventory items found'}
                    </td>
                  </tr>
                ) : (
                  inventory.map((item, i) => {
                    const stockStatus = getStockStatus(item);
                    const category = categories.find(c => c.id === item.category_id);
                    const stationNames = getStationNames(item.station_ids);
                    
                    return (
                      <tr key={item.id} style={{
                        ...styles.row,
                        backgroundColor: i % 2 === 0 ? TavariStyles.colors.gray50 : TavariStyles.colors.white
                      }}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: TavariStyles.typography.fontWeight.bold }}>
                            {item.name}
                          </div>
                          {item.sku && (
                            <div style={{ fontSize: TavariStyles.typography.fontSize.xs, color: TavariStyles.colors.gray600 }}>
                              SKU: {item.sku}
                            </div>
                          )}
                        </td>
                        
                        <td style={styles.td}>
                          ${Number(item.price || 0).toFixed(2)}
                          {Number(item.price || 0) === 0 && (
                            <div style={{ 
                              fontSize: TavariStyles.typography.fontSize.xs, 
                              color: TavariStyles.colors.success,
                              fontWeight: TavariStyles.typography.fontWeight.bold
                            }}>
                              FREE
                            </div>
                          )}
                        </td>
                        
                        <td style={styles.td}>
                          {category ? (
                            <>
                              {category.emoji} {category.name}
                            </>
                          ) : 'â€”'}
                        </td>
                        
                        <td style={styles.td}>
                          {stationNames !== 'â€”' ? (
                            <span style={styles.stationBadge}>
                              {stationNames}
                            </span>
                          ) : (
                            <span style={{ color: TavariStyles.colors.gray500, fontSize: TavariStyles.typography.fontSize.xs }}>
                              No stations
                            </span>
                          )}
                        </td>
                        
                        <td style={styles.td}>
                          {stockStatus ? (
                            <span style={{
                              ...styles.stockBadge,
                              backgroundColor: stockStatus.color,
                              color: 'white'
                            }}>
                              {stockStatus.text}
                            </span>
                          ) : (
                            <span style={{ color: TavariStyles.colors.gray500, fontSize: TavariStyles.typography.fontSize.xs }}>
                              Not tracked
                            </span>
                          )}
                        </td>
                        
                        <td style={styles.td}>
                          <div style={styles.actions}>
                            <button 
                              onClick={() => openEditModal(item)} 
                              style={styles.editButton}
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => deleteItem(item.id)} 
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div style={styles.paginationSection}>
                <div>
                  Showing {startItem} to {endItem} of {totalItems} items
                </div>
                <div style={styles.paginationControls}>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={styles.pageButton}
                  >
                    Previous
                  </button>
                  {renderPaginationButtons()}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={styles.pageButton}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {renderEditModal()}
      </div>
    </POSAuthWrapper>
  );
};

export default POSInventory;