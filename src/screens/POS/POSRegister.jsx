// screens/POS/POSRegister.jsx - Fixed DataCloneError
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import POSProductGrid from "../../components/POS/POSProductGrid";
import POSCartPanel from "../../components/POS/POSCartPanel";
import SessionLockModal from "../../components/POS/SessionLockModal";
import BarcodeScanHandler from "../../components/POS/BarcodeScanHandler";
import POSDrawerComponent from "../../components/POS/POSDrawerComponent";
import POSAuthWrapper from "../../components/Auth/POSAuthWrapper";
import PinModal from "../../components/POS/POSRegisterComponents/PinModal";
import RegisterHeader from "../../components/POS/POSRegisterComponents/RegisterHeader";
import SaveCartModal from "../../components/POS/POSRegisterComponents/SaveCartModal";
import CategorySelector from "../../components/POS/POSRegisterComponents/CategorySelector";
import { useSessionLock } from "../../hooks/useSessionLock";
import { usePOSAuth } from "../../hooks/usePOSAuth";
import { useTaxCalculations } from "../../hooks/useTaxCalculations";
import { useAuditLog } from "../../hooks/useAuditLog";
import { TavariStyles } from "../../utils/TavariStyles";
import dayjs from "dayjs";
import { supabase } from "../../supabaseClient";
import bcrypt from "bcryptjs";

const POSRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const auth = usePOSAuth({
    requiredRoles: ['employee', 'cashier', 'manager', 'owner'],
    requireBusiness: true,
    componentName: 'POSRegister'
  });

  // Centralized audit logging
  const { logPOS, logSecurity, logManagerOverride } = useAuditLog();

  const {
    taxCategories,
    categoryTaxAssignments,
    calculateTotalTax,
    applyCashRounding
  } = useTaxCalculations(auth.selectedBusinessId);

  const {
    isLocked,
    warningSeconds,
    pinAttempts,
    lockedUntil,
    unlockWithPin,
    managerOverride,
    isOverrideActive,
  } = useSessionLock();

  // App state
  const [businessName, setBusinessName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [time, setTime] = useState(dayjs().format("hh:mm A"));
  
  // Drawer management state
  const [showDrawerManager, setShowDrawerManager] = useState(false);
  const [currentTerminalId, setCurrentTerminalId] = useState(null);
  
  // Multi-staff PIN unlock state
  const [registerLocked, setRegisterLocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentUnlockingUser, setCurrentUnlockingUser] = useState(null);
  const [posSettings, setPosSettings] = useState({
    pin_required: false,
    lock_on_startup: false,
    lock_after_sale: false
  });
  
  // LOYALTY STATE
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [showCustomerScanner, setShowCustomerScanner] = useState(false);
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Cart initialization state
  const [cartInitialized, setCartInitialized] = useState(false);
  
  // Cart resumption state
  const [savedCartId, setSavedCartId] = useState(null);
  const [isFromSavedCarts, setIsFromSavedCarts] = useState(false);

  // Business settings
  const [businessSettings, setBusinessSettings] = useState({});

  // Tab state
  const [activeTab, setActiveTab] = useState(null);
  const [isTabMode, setIsTabMode] = useState(false);
  const [tabItems, setTabItems] = useState([]);

  // Save cart modal state
  const [showSaveCartModal, setShowSaveCartModal] = useState(false);

  // CHECK FOR LOCK AFTER SALE ON MOUNT
  useEffect(() => {
    if (location.state?.shouldLock) {
      console.log('POSRegister: Received shouldLock flag from navigation');
      setRegisterLocked(true);
      setShowPinModal(true);
      
      // Log lock after sale
      logPOS('register_locked_after_sale', {
        terminal_id: currentTerminalId,
        lock_reason: 'sale_completed',
        triggered_by_navigation: true
      });
      
      // Clean up navigation state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.shouldLock]);

  // Load terminal ID on component mount
  useEffect(() => {
    const storedTerminalId = localStorage.getItem('tavari_terminal_id');
    if (storedTerminalId) {
      setCurrentTerminalId(storedTerminalId);
    } else {
      const terminalId = generateTerminalId();
      setCurrentTerminalId(terminalId);
    }
  }, []);

  // Generate terminal ID function
  const generateTerminalId = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Terminal fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const terminalId = `TERM_${Math.abs(hash).toString(36).toUpperCase().substring(0, 8)}`;
    localStorage.setItem('tavari_terminal_id', terminalId);
    return terminalId;
  };

  // Fetch POS settings for lock configuration
  useEffect(() => {
    const fetchPosSettings = async () => {
      if (!auth.selectedBusinessId) {
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('pos_settings')
          .select('pin_required, lock_on_startup, lock_after_sale')
          .eq('business_id', auth.selectedBusinessId)
          .single();

        if (data && !error) {
          const settings = {
            pin_required: data.pin_required || false,
            lock_on_startup: data.lock_on_startup || false,
            lock_after_sale: data.lock_after_sale || false
          };
          
          setPosSettings(settings);
          
          const shouldLock = data.pin_required === true || data.lock_on_startup === true;
          
          if (shouldLock) {
            setRegisterLocked(true);
            setShowPinModal(true);
            
            logPOS('register_locked_on_startup', {
              terminal_id: currentTerminalId,
              lock_reason: data.pin_required ? 'pin_required' : 'lock_on_startup',
              settings: { pin_required: data.pin_required, lock_on_startup: data.lock_on_startup }
            });
          }
        } else {
          setRegisterLocked(true);
          setShowPinModal(true);
        }
      } catch (err) {
        console.error('POS Settings: Exception occurred:', err);
        setRegisterLocked(true);
        setShowPinModal(true);
      }
    };

    if (auth.isReady && auth.selectedBusinessId) {
      fetchPosSettings();
    }
  }, [auth.isReady, auth.selectedBusinessId, currentTerminalId, logPOS]);

  // Multi-staff PIN unlock handler
  const handlePinUnlock = async () => {
    if (!pinInput || pinInput.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('business_id', auth.selectedBusinessId)
        .eq('active', true);

      if (rolesError) {
        setPinError('Error validating PIN. Please try again.');
        return;
      }

      const allowedRoles = ['employee', 'cashier', 'manager', 'owner', 'admin'];
      const authorizedUserIds = userRoles
        .filter(ur => allowedRoles.includes(ur.role))
        .map(ur => ur.user_id);

      if (authorizedUserIds.length === 0) {
        setPinError('No authorized users found');
        return;
      }

      const { data: staffMembers, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, email, pin')
        .in('id', authorizedUserIds);

      if (staffError) {
        setPinError('Error validating PIN. Please try again.');
        return;
      }

      let unlockingUser = null;
      let pinMatched = false;

      for (const staff of staffMembers) {
        if (!staff.pin) continue;
        
        if (staff.pin.startsWith('$2b$') || staff.pin.startsWith('$2a$')) {
          const matches = await bcrypt.compare(pinInput, staff.pin);
          if (matches) {
            unlockingUser = staff;
            pinMatched = true;
            break;
          }
        } else {
          const matches = staff.pin === pinInput;
          if (matches) {
            unlockingUser = staff;
            pinMatched = true;
            break;
          }
        }
      }

      if (pinMatched && unlockingUser) {
        setRegisterLocked(false);
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        setFailedAttempts(0);
        setCurrentUnlockingUser(unlockingUser);

        await logPOS('register_unlocked', {
          unlocked_by_id: unlockingUser.id,
          unlocked_by_name: unlockingUser.full_name || unlockingUser.email,
          unlock_method: 'pin',
          terminal_id: currentTerminalId,
          previous_failed_attempts: failedAttempts
        });

        showToast(`Register unlocked by ${unlockingUser.full_name || unlockingUser.email}`, 'success');

      } else {
        const newFailedCount = failedAttempts + 1;
        setFailedAttempts(newFailedCount);
        setPinInput('');

        await logSecurity('failed_register_unlock', {
          attempt_number: newFailedCount,
          terminal_id: currentTerminalId,
          pin_length: pinInput.length,
          business_id: auth.selectedBusinessId
        });

        if (newFailedCount >= 3) {
          setPinError('Too many failed attempts. Contact a manager.');
          
          await logSecurity('register_lockout_triggered', {
            type: 'PIN brute force attempt',
            total_attempts: newFailedCount,
            terminal_id: currentTerminalId,
            lockout_duration: '5_minutes'
          });
        } else {
          setPinError(`Incorrect PIN. Attempt ${newFailedCount} of 3.`);
        }
      }
    } catch (error) {
      console.error('PIN Unlock: Exception:', error);
      setPinError('Error validating PIN. Please try again.');
    }
  };

  // Drawer event handlers
  const handleDrawerOpened = (drawer) => {
    logPOS('cash_drawer_opened', {
      terminal_id: currentTerminalId,
      drawer_id: drawer?.id,
      opened_by: auth.authUser?.id,
      opened_by_name: employeeName
    });
    
    showToast('Cash drawer opened successfully', 'success');
  };

  const handleDrawerClosed = (drawer) => {
    logPOS('cash_drawer_closed', {
      terminal_id: currentTerminalId,
      drawer_id: drawer?.id,
      closed_by: auth.authUser?.id,
      closed_by_name: employeeName,
      expected_amount: drawer?.expected_amount,
      actual_amount: drawer?.actual_amount,
      variance: drawer?.variance
    });
    
    showToast('Cash drawer closed successfully', 'success');
  };

  // Handle cart resumption and tab data
  useEffect(() => {
    if (location.state?.activeTab) {
      const tab = location.state.activeTab;
      setActiveTab(tab);
      setIsTabMode(true);
      setCartInitialized(true);
      
      logPOS('tab_mode_activated', {
        tab_id: tab.id,
        tab_name: tab.customer_name,
        terminal_id: currentTerminalId
      });
      
      if (tab.loyalty_customer_id) {
        loadTabCustomer(tab.loyalty_customer_id);
      } else if (tab.customer_name) {
        setCurrentCustomer({
          customer_name: tab.customer_name,
          customer_phone: tab.customer_phone,
          customer_email: tab.customer_email,
          id: null
        });
      }

      loadTabItems(tab.id);
      return;
    }
    
    if (location.state?.resumeCart) {
      const { items, customer, cartId } = location.state.resumeCart;
      
      if (items && items.length > 0) {
        setCartItems(items);
        setCartInitialized(true);
        
        logPOS('cart_resumed', {
          cart_id: cartId,
          item_count: items.length,
          has_customer: !!customer,
          terminal_id: currentTerminalId
        });
        
        if (cartId) {
          setSavedCartId(cartId);
          setIsFromSavedCarts(true);
        }
      }
      
      if (customer) {
        setCurrentCustomer(customer);
      }
      
      showToast(`Resumed cart with ${items?.length || 0} items`, 'success');
      
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (!cartInitialized) {
      setCartInitialized(true);
    }
  }, [location.state, cartInitialized, logPOS, currentTerminalId, navigate, location.pathname]);

  // Session storage for cart persistence
  useEffect(() => {
    if (!cartInitialized || isTabMode || !auth.selectedBusinessId) {
      return;
    }

    const sessionKey = `pos_cart_${auth.selectedBusinessId}`;
    
    if (cartItems.length === 0 && !currentCustomer) {
      const savedCart = sessionStorage.getItem(sessionKey);
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (parsed.items && Array.isArray(parsed.items)) {
            setCartItems(parsed.items);
            if (parsed.customer) {
              setCurrentCustomer(parsed.customer);
            }
          }
        } catch (err) {
          console.warn('Failed to restore cart from session:', err);
        }
      }
    }
  }, [cartInitialized, isTabMode, auth.selectedBusinessId]);

  // Save to session storage when cart changes
  useEffect(() => {
    if (!cartInitialized || isTabMode || !auth.selectedBusinessId) {
      return;
    }

    const sessionKey = `pos_cart_${auth.selectedBusinessId}`;
    const cartData = {
      items: cartItems,
      customer: currentCustomer,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem(sessionKey, JSON.stringify(cartData));
  }, [cartItems, currentCustomer, auth.selectedBusinessId, isTabMode, cartInitialized]);

  // Save cart manually function
  const saveCartManually = async (cartName) => {
    if (!cartItems.length) {
      showToast('No items in cart to save', 'error');
      return;
    }

    if (!cartName || !cartName.trim()) {
      showToast('Please enter a cart name', 'error');
      return;
    }

    try {
      const subtotal = cartItems.reduce((sum, item) => {
        const basePrice = Number(item.price) || 0;
        const itemTotal = basePrice * (Number(item.quantity) || 1);
        return sum + itemTotal;
      }, 0);

      const { totalTax } = calculateTotalTax(cartItems, 0, 0, subtotal);
      const total = subtotal + totalTax;

      const cartData = {
        items: cartItems,
        savedAt: new Date().toISOString()
      };

      const customerInfo = currentCustomer ? {
        id: currentCustomer.id,
        name: currentCustomer.customer_name,
        phone: currentCustomer.customer_phone,
        email: currentCustomer.customer_email
      } : null;

      const { error } = await supabase
        .from('pos_saved_orders')
        .insert({
          business_id: auth.selectedBusinessId,
          saved_by: auth.authUser.id,
          order_name: cartName.trim(),
          cart_data: cartData,
          subtotal: subtotal.toFixed(2),
          tax_amount: totalTax.toFixed(2),
          total_amount: total.toFixed(2),
          item_count: cartItems.length,
          customer_info: customerInfo,
          save_reason: 'manual'
        });

      if (error) {
        showToast('Error saving cart: ' + error.message, 'error');
      } else {
        logPOS('cart_saved_manually', {
          cart_name: cartName.trim(),
          item_count: cartItems.length,
          total_amount: total.toFixed(2),
          has_customer: !!currentCustomer,
          terminal_id: currentTerminalId
        });
        
        showToast('Cart saved successfully!', 'success');
        setShowSaveCartModal(false);
        clearCurrentCart();
      }
    } catch (err) {
      showToast('Error saving cart: ' + err.message, 'error');
    }
  };

  // Save and Exit handler
  const handleSaveAndExit = () => {
    if (isLocked || registerLocked) return;
    
    logPOS('save_and_exit_clicked', {
      item_count: cartItems.length,
      cart_mode: isTabMode ? 'tab' : 'normal',
      tab_id: activeTab?.id || null,
      has_customer: !!currentCustomer,
      terminal_id: currentTerminalId
    });
    
    if (isTabMode && activeTab) {
      setCartItems([]);
      showToast('Tab saved - ready for next transaction', 'success');
    } else {
      clearCurrentCart();
      showToast('Cart cleared - ready for next transaction', 'success');
    }
  };

  // Cart deletion handlers
  const handleDeleteCart = async (cartId) => {
    try {
      const { error } = await supabase
        .from('pos_saved_orders')
        .delete()
        .eq('id', cartId)
        .eq('business_id', auth.selectedBusinessId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      logPOS('saved_cart_deleted', {
        cart_id: cartId,
        deleted_by: auth.authUser?.id,
        terminal_id: currentTerminalId
      });

      showToast('Saved cart deleted successfully', 'success');
      clearCurrentCart();
      
    } catch (error) {
      console.error('Error deleting saved cart:', error);
      showToast(`Error deleting cart: ${error.message}`, 'error');
    }
  };

  const handleClearCart = () => {
    logPOS('cart_cleared', {
      item_count: cartItems.length,
      had_customer: !!currentCustomer,
      terminal_id: currentTerminalId
    });
    
    clearCurrentCart();
    showToast('Cart cleared successfully', 'success');
  };

  const clearCurrentCart = () => {
    setCartItems([]);
    setCurrentCustomer(null);
    setSavedCartId(null);
    setIsFromSavedCarts(false);
    
    if (auth.selectedBusinessId && !isTabMode) {
      const sessionKey = `pos_cart_${auth.selectedBusinessId}`;
      sessionStorage.removeItem(sessionKey);
    }
  };

  const loadTabCustomer = async (loyaltyCustomerId) => {
    if (!auth.selectedBusinessId) return;
    
    try {
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('id', loyaltyCustomerId)
        .eq('business_id', auth.selectedBusinessId)
        .single();

      if (data && !error) {
        setCurrentCustomer(data);
      }
    } catch (err) {
      console.error('Error loading tab customer:', err);
    }
  };

  const loadTabItems = async (tabId) => {
    try {
      const { data, error } = await supabase
        .from('pos_tab_items')
        .select('*')
        .eq('tab_id', tabId)
        .order('created_at', { ascending: true });

      if (data && !error) {
        const convertedItems = data.map(item => ({
          id: item.product_id || item.id,
          name: item.name,
          price: item.unit_price,
          quantity: item.quantity,
          modifiers: item.modifiers || [],
          notes: item.notes,
          category_id: item.category_id,
          item_tax_overrides: item.item_tax_overrides,
          tab_item_id: item.id
        }));
        
        setTabItems(convertedItems);
        setCartItems(convertedItems);
      }
    } catch (err) {
      console.error('Error loading tab items:', err);
    }
  };

  // Clock updater
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(dayjs().format("hh:mm A"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user and business info
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!auth.authUser || !auth.selectedBusinessId) return;

      try {
        const [userResult, businessResult] = await Promise.all([
          supabase.from("users").select("full_name, email").eq("id", auth.authUser.id).single(),
          supabase.from("businesses").select("name").eq("id", auth.selectedBusinessId).single()
        ]);

        if (userResult.data) {
          setEmployeeName(userResult.data.full_name || userResult.data.email || "Unknown User");
        }

        if (businessResult.data) {
          setBusinessName(businessResult.data.name);
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };
    
    if (auth.isReady) {
      fetchUserInfo();
    }
  }, [auth.authUser, auth.selectedBusinessId, auth.isReady]);

  // Fetch categories
  useEffect(() => {
    if (!auth.selectedBusinessId || !auth.isReady) return;

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("pos_categories")
          .select("id, name, color, emoji, sort_order")
          .eq("business_id", auth.selectedBusinessId)
          .order("sort_order", { ascending: true });

        if (!error) {
          setCategories(data || []);
        }
      } catch (err) {
        console.error("Categories fetch error:", err);
      }
    };

    fetchCategories();

    const catSubscription = supabase
      .channel(`pos_categories_${auth.selectedBusinessId}`)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "pos_categories", 
        filter: `business_id=eq.${auth.selectedBusinessId}` 
      }, fetchCategories)
      .subscribe();

    return () => supabase.removeChannel(catSubscription);
  }, [auth.selectedBusinessId, auth.isReady]);

  // Fetch business settings
  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('pos_settings')
          .select('*')
          .eq('business_id', auth.selectedBusinessId)
          .single();

        if (error) {
          setBusinessSettings({
            tabs_enabled: true,
            default_tab_limit: 500.00,
            max_tab_limit: 1000.00,
            tab_limit_requires_manager: true,
            tab_warning_threshold: 0.8
          });
        } else {
          setBusinessSettings(data || {});
        }
      } catch (err) {
        setBusinessSettings({});
      }
    };

    if (auth.selectedBusinessId && auth.isReady) {
      fetchBusinessSettings();
    }
  }, [auth.selectedBusinessId, auth.isReady]);

  // Fetch products
  useEffect(() => {
    if (!auth.selectedBusinessId || !auth.isReady) return;

    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("pos_inventory")
          .select("id, name, price, cost, sku, barcode, category_id, track_stock, stock_quantity, low_stock_threshold, station_ids, image_url, item_tax_overrides, modifier_group_ids")
          .eq("business_id", auth.selectedBusinessId)
          .order("name", { ascending: true });

        if (!error) {
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Products fetch error:", err);
      }
    };

    fetchProducts();

    const prodSubscription = supabase
      .channel(`pos_inventory_${auth.selectedBusinessId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public", 
        table: "pos_inventory",
        filter: `business_id=eq.${auth.selectedBusinessId}`
      }, fetchProducts)
      .subscribe();

    return () => supabase.removeChannel(prodSubscription);
  }, [auth.selectedBusinessId, auth.isReady]);

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  // Fast cart operations
  const handleAddToCart = (product) => {
    if (isLocked || registerLocked) return;
    
    logPOS('product_added_to_cart', {
      product_id: product.id,
      product_name: product.name,
      product_price: product.price,
      cart_mode: isTabMode ? 'tab' : 'normal',
      terminal_id: currentTerminalId
    });
    
    if (isTabMode && activeTab) {
      addItemToTab(product);
    } else {
      setCartItems((prev) => {
        const existing = prev.find(
          (item) =>
            item.id === product.id &&
            JSON.stringify(item.modifiers || []) === JSON.stringify(product.modifiers || [])
        );

        if (existing) {
          return prev.map((item) =>
            item.id === product.id &&
            JSON.stringify(item.modifiers || []) === JSON.stringify(product.modifiers || [])
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [...prev, { ...product, quantity: 1 }];
      });
    }
  };

  const handleRemoveFromCart = (productId) => {
    if (isLocked || registerLocked) return;
    
    logPOS('product_removed_from_cart', {
      product_id: productId,
      cart_mode: isTabMode ? 'tab' : 'normal',
      terminal_id: currentTerminalId
    });
    
    if (isTabMode && activeTab) {
      removeItemFromTab(productId);
    } else {
      setCartItems((prev) => prev.filter((item) => item.id !== productId));
    }
  };

  const handleUpdateQty = (productId, qty) => {
    if (isLocked || registerLocked) return;
    if (qty <= 0) return handleRemoveFromCart(productId);
    
    logPOS('product_quantity_updated', {
      product_id: productId,
      new_quantity: qty,
      cart_mode: isTabMode ? 'tab' : 'normal',
      terminal_id: currentTerminalId
    });
    
    if (isTabMode && activeTab) {
      updateTabItemQty(productId, qty);
    } else {
      setCartItems((prev) => 
        prev.map((item) => (item.id === productId ? { ...item, quantity: qty } : item))
      );
    }
  };

  // Tab functions
  const addItemToTab = async (product) => {
    await performAddItemToTab(product);
  };

  const performAddItemToTab = async (product) => {
    try {
      const existingTabItem = tabItems.find(item => item.id === product.id);
      
      if (existingTabItem) {
        const newQuantity = existingTabItem.quantity + 1;
        const newTotalPrice = newQuantity * product.price;
        
        const { error } = await supabase
          .from('pos_tab_items')
          .update({ 
            quantity: newQuantity,
            total_price: newTotalPrice
          })
          .eq('id', existingTabItem.tab_item_id);

        if (error) throw error;

        setCartItems(prev => 
          prev.map(item => 
            item.id === product.id 
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
        setTabItems(prev => 
          prev.map(item => 
            item.id === product.id 
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
      } else {
        const tabItemData = {
          business_id: auth.selectedBusinessId,
          tab_id: activeTab.id,
          inventory_id: product.id,
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.price,
          total_price: product.price,
          modifiers: [],
          category_id: product.category_id,
          item_tax_overrides: product.item_tax_overrides,
          added_by: auth.authUser.id
        };

        const { data: newTabItem, error } = await supabase
          .from('pos_tab_items')
          .insert(tabItemData)
          .select()
          .single();

        if (error) throw error;

        const cartItem = {
          ...product,
          quantity: 1,
          tab_item_id: newTabItem.id
        };

        setCartItems(prev => [...prev, cartItem]);
        setTabItems(prev => [...prev, cartItem]);
      }

      showToast(`Added ${product.name} to tab`, 'success');
    } catch (err) {
      showToast('Error adding item to tab: ' + err.message, 'error');
    }
  };

  const removeItemFromTab = async (productId) => {
    try {
      const tabItem = tabItems.find(item => item.id === productId);
      if (tabItem && tabItem.tab_item_id) {
        const { error } = await supabase
          .from('pos_tab_items')
          .delete()
          .eq('id', tabItem.tab_item_id);

        if (error) throw error;

        setCartItems(prev => prev.filter(item => item.id !== productId));
        setTabItems(prev => prev.filter(item => item.id !== productId));
      }
    } catch (err) {
      showToast('Error removing item from tab', 'error');
    }
  };

  const updateTabItemQty = async (productId, qty) => {
    try {
      const tabItem = tabItems.find(item => item.id === productId);
      if (tabItem && tabItem.tab_item_id) {
        const newTotalPrice = qty * tabItem.price;

        const { error } = await supabase
          .from('pos_tab_items')
          .update({
            quantity: qty,
            total_price: newTotalPrice
          })
          .eq('id', tabItem.tab_item_id);

        if (error) throw error;

        setCartItems(prev =>
          prev.map(item =>
            item.id === productId ? { ...item, quantity: qty } : item
          )
        );
        setTabItems(prev =>
          prev.map(item =>
            item.id === productId ? { ...item, quantity: qty } : item
          )
        );
      }
    } catch (err) {
      showToast('Error updating quantity', 'error');
    }
  };

  // Barcode scanning
  const handleBarcodeScan = (code) => {
    if (isLocked || registerLocked) return;
    
    logPOS('barcode_scanned', {
      scanned_code: code,
      scan_type: 'product_or_customer',
      terminal_id: currentTerminalId
    });
    
    const foundProduct = products.find(
      (p) => 
        (p.sku && p.sku.trim() === code.trim()) ||
        (p.barcode && p.barcode.trim() === code.trim())
    );
    
    if (foundProduct) {
      handleAddToCart(foundProduct);
      showToast(`Added ${foundProduct.name} to cart`, 'success');
      
      logPOS('barcode_scan_success', {
        scanned_code: code,
        product_id: foundProduct.id,
        product_name: foundProduct.name,
        terminal_id: currentTerminalId
      });
      return;
    }

    handleCustomerScan(code);
  };

  // Customer attachment
  const handleCustomerScan = async (customerId) => {
    if (isLocked || registerLocked || !auth.selectedBusinessId) return;
    
    try {
      const { data, error } = await supabase
        .from('pos_loyalty_accounts')
        .select('*')
        .eq('id', customerId)
        .eq('business_id', auth.selectedBusinessId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        showToast('Customer not found or inactive', 'error');
        
        logPOS('customer_scan_failed', {
          scanned_code: customerId,
          error: error?.message || 'Customer not found',
          terminal_id: currentTerminalId
        });
        return;
      }

      setCurrentCustomer(data);
      showToast(`Customer attached: ${data.customer_name}`, 'success');

      logPOS('customer_attached', {
        customer_id: data.id,
        customer_name: data.customer_name,
        customer_balance: data.balance,
        attachment_method: 'qr_scan',
        terminal_id: currentTerminalId
      });

    } catch (err) {
      console.error('Error scanning customer QR code:', err);
      showToast('Error scanning customer QR code', 'error');
    }
  };

  const handleDetachCustomer = async () => {
    if (currentCustomer) {
      logPOS('customer_detached', {
        customer_id: currentCustomer.id,
        customer_name: currentCustomer.customer_name,
        terminal_id: currentTerminalId
      });
    }
    
    setCurrentCustomer(null);
    showToast('Customer detached', 'info');
  };

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    const bgColor = type === 'error' ? TavariStyles.colors.danger : 
                   type === 'success' ? TavariStyles.colors.success : 
                   TavariStyles.colors.primary;
    
    toast.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      background-color: ${bgColor};
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  // ✅ FIXED: Checkout handler - NO FUNCTION IN STATE
  const handleCheckout = (checkoutData) => {
    if (isLocked || registerLocked) return;
    
    console.log('Checkout initiated with data:', checkoutData);
    
    logPOS('checkout_initiated', {
      item_count: cartItems.length,
      subtotal: checkoutData.subtotal || 0,
      total: checkoutData.total || 0,
      has_customer: !!currentCustomer,
      cart_mode: isTabMode ? 'tab' : 'normal',
      terminal_id: currentTerminalId
    });
    
    if (!isTabMode) {
      const sessionKey = `pos_cart_${auth.selectedBusinessId}`;
      sessionStorage.removeItem(sessionKey);
    }
    
    if (isTabMode && activeTab) {
      // Tab mode - go to payment
      const cleanSaleData = {
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          modifiers: item.modifiers || [],
          category_id: item.category_id,
          item_tax_overrides: item.item_tax_overrides
        })),
        business_id: auth.selectedBusinessId,
        loyalty_customer_id: currentCustomer?.id || null,
        loyaltyCustomer: currentCustomer ? {
          id: currentCustomer.id,
          customer_name: currentCustomer.customer_name,
          customer_phone: currentCustomer.customer_phone,
          customer_email: currentCustomer.customer_email,
          balance: currentCustomer.balance
        } : null,
        activeTab: {
          id: activeTab.id,
          customer_name: activeTab.customer_name,
          customer_phone: activeTab.customer_phone,
          total_amount: activeTab.total_amount
        },
        tab_mode: true,
        subtotal: checkoutData.subtotal || 0,
        total_amount: checkoutData.total || 0,
        tax_amount: checkoutData.tax || 0,
        // ✅ NO onSaleComplete - will be handled by payment screen
        lock_after_sale: posSettings.lock_after_sale,
        pin_required: posSettings.pin_required
      };
      
      navigate('/dashboard/pos/payment', {
        state: { saleData: cleanSaleData }
      });
    } else {
      // Normal mode - go to sale review
      const cleanCheckoutData = {
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          modifiers: item.modifiers || [],
          category_id: item.category_id,
          item_tax_overrides: item.item_tax_overrides
        })),
        business_id: auth.selectedBusinessId,
        loyalty_customer_id: currentCustomer?.id || null,
        loyaltyCustomer: currentCustomer ? {
          id: currentCustomer.id,
          customer_name: currentCustomer.customer_name,
          customer_phone: currentCustomer.customer_phone,
          customer_email: currentCustomer.customer_email,
          balance: currentCustomer.balance
        } : null,
        subtotal: checkoutData.subtotal || 0,
        total_amount: checkoutData.total || 0,
        tax_amount: checkoutData.tax || 0,
        item_count: cartItems.length,
        discount_amount: checkoutData.discount_amount || 0,
        loyalty_redemption: checkoutData.loyalty_redemption || 0,
        aggregated_taxes: checkoutData.aggregated_taxes || {},
        aggregated_rebates: checkoutData.aggregated_rebates || {},
        item_tax_details: checkoutData.itemTaxDetails || [],
        // ✅ NO onSaleComplete - will be handled by sale review screen
        lock_after_sale: posSettings.lock_after_sale,
        pin_required: posSettings.pin_required
      };
      
      console.log('Navigating to sale-review with clean data:', cleanCheckoutData);
      
      navigate('/dashboard/pos/sale-review', {
        state: { checkoutData: cleanCheckoutData }
      });
    }
  };

  // Header action handlers
  const handleSaveCartClick = () => {
    setShowSaveCartModal(true);
  };

  const handleDrawerManagerClick = () => {
    setShowDrawerManager(true);
  };

  const handleNavigateToRefunds = () => {
    navigate('/dashboard/pos/refunds');
  };

  const handleNavigateToSavedCarts = () => {
    navigate('/dashboard/pos/saved-carts');
  };

  const handleNavigateToTabs = () => {
    navigate('/dashboard/pos/tabs');
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: TavariStyles.colors.gray50,
      paddingTop: '80px',
      overflow: 'hidden'
    },
    
    warning: {
      ...TavariStyles.components.banner.base,
      ...TavariStyles.components.banner.variants.warning,
      marginBottom: TavariStyles.spacing.md,
      position: 'fixed',
      top: '80px',
      left: '0',
      right: '0',
      zIndex: 1000
    },
    
    mainContent: {
      display: 'flex',
      flex: 1,
      height: 'calc(100vh - 80px)',
      overflow: 'hidden'
    },
    
    productsSection: {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      padding: TavariStyles.spacing.lg,
      paddingRight: TavariStyles.spacing.sm,
      overflow: 'hidden',
      minWidth: '400px'
    },
    
    cartSection: {
      width: '380px',
      flexShrink: 0,
      padding: TavariStyles.spacing.lg,
      paddingLeft: TavariStyles.spacing.sm,
      overflow: 'hidden'
    },
    
    productGridContainer: {
      flex: 1,
      overflow: 'hidden'
    }
  };

  return (
    <POSAuthWrapper
      requiredRoles={['employee', 'cashier', 'manager', 'owner']}
      requireBusiness={true}
      componentName="POS Register"
    >
      <div style={styles.container}>
        {!!warningSeconds && !isLocked && (
          <div style={styles.warning}>
            Auto-lock in <b>{warningSeconds}s</b>
          </div>
        )}

        <RegisterHeader
          businessName={businessName}
          employeeName={employeeName}
          currentUnlockingUser={currentUnlockingUser}
          authUser={auth.authUser}
          time={time}
          isTabMode={isTabMode}
          cartItems={cartItems}
          isLocked={isLocked}
          registerLocked={registerLocked}
          onSaveCart={handleSaveCartClick}
          onDrawerManager={handleDrawerManagerClick}
          onNavigateToRefunds={handleNavigateToRefunds}
          onNavigateToSavedCarts={handleNavigateToSavedCarts}
          onNavigateToTabs={handleNavigateToTabs}
        />

        <div style={styles.mainContent}>
          <div style={styles.productsSection}>
            <CategorySelector
              categories={categories}
              activeCategory={activeCategory}
              onCategorySelect={setActiveCategory}
              registerLocked={registerLocked}
            />

            <div style={styles.productGridContainer}>
              <POSProductGrid 
                products={filteredProducts} 
                onAddToCart={handleAddToCart}
                disabled={registerLocked}
              />
            </div>
          </div>

          <div style={styles.cartSection}>
            <POSCartPanel
              cartItems={cartItems}
              onRemoveItem={handleRemoveFromCart}
              onUpdateQty={handleUpdateQty}
              onCheckout={handleCheckout}
              onSaveAndExit={handleSaveAndExit}
              sessionLocked={isLocked || registerLocked}
              attachedCustomer={currentCustomer}
              tabMode={isTabMode}
              activeTab={activeTab}
              loyaltyCustomer={currentCustomer}
              businessSettings={businessSettings}
              currentEmployee={{ id: auth.authUser?.id, name: employeeName }}
              businessId={auth.selectedBusinessId}
              taxCategories={taxCategories}
              categoryTaxAssignments={categoryTaxAssignments}
              categories={categories}
              savedCartId={savedCartId}
              isFromSavedCarts={isFromSavedCarts}
              onDeleteCart={handleDeleteCart}
              onClearCart={handleClearCart}
              onCustomerAttach={handleCustomerScan}
              onCustomerDetach={handleDetachCustomer}
            />
          </div>
        </div>

        <BarcodeScanHandler onScan={handleBarcodeScan} />
        
        {isLocked && (
          <SessionLockModal
            visible={isLocked}
            onSubmitPin={unlockWithPin}
            onManagerOverride={managerOverride}
            pinAttempts={pinAttempts}
            lockedUntil={lockedUntil}
            warningSeconds={warningSeconds}
            overrideActive={isOverrideActive()}
          />
        )}

        <POSDrawerComponent
          businessId={auth.selectedBusinessId}
          currentTerminalId={currentTerminalId}
          visible={showDrawerManager}
          onClose={() => setShowDrawerManager(false)}
          onDrawerOpened={handleDrawerOpened}
          onDrawerClosed={handleDrawerClosed}
        />

        <PinModal
          showPinModal={showPinModal}
          pinInput={pinInput}
          setPinInput={setPinInput}
          pinError={pinError}
          setPinError={setPinError}
          failedAttempts={failedAttempts}
          currentUnlockingUser={currentUnlockingUser}
          onPinUnlock={handlePinUnlock}
        />

        <SaveCartModal
          showSaveCartModal={showSaveCartModal}
          onSaveCart={saveCartManually}
          onClose={() => setShowSaveCartModal(false)}
        />
      </div>
    </POSAuthWrapper>
  );
};

export default POSRegister;