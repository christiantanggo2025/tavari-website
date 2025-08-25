// screens/POS/POSRegister.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import POSProductGrid from "../../components/POS/POSProductGrid";
import POSCartPanel from "../../components/POS/POSCartPanel";
import SessionLockModal from "../../components/POS/SessionLockModal";
import BarcodeScanHandler from "../../components/POS/BarcodeScanHandler";
import { useSessionLock } from "../../hooks/useSessionLock";
import dayjs from "dayjs";
import { useBusinessContext } from "../../contexts/BusinessContext";

const POSRegister = () => {
  const navigate = useNavigate();
  const { selectedBusinessId } = useBusinessContext();
  const {
    isLocked,
    warningSeconds,
    pinAttempts,
    lockedUntil,
    unlockWithPin,
    managerOverride,
    isOverrideActive,
  } = useSessionLock();

  const [businessName, setBusinessName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [time, setTime] = useState(dayjs().format("hh:mm A"));

  // Clock updater
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(dayjs().format("hh:mm A"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        // Try to get user info from users table first
        const { data: userProfile } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("id", auth.user.id)
          .single();

        if (userProfile) {
          setEmployeeName(userProfile.full_name || userProfile.email || "Unknown User");
        } else {
          // Fallback to auth user email if no profile found
          setEmployeeName(auth.user.email || "Unknown User");
        }

        // Try to get business name from businesses table
        const { data: businessData } = await supabase
          .from("businesses")
          .select("name")
          .eq("id", selectedBusinessId)
          .single();

        if (businessData) {
          setBusinessName(businessData.name);
        } else {
          setBusinessName("Test Business");
        }
      }
    };
    
    if (selectedBusinessId) {
      fetchUserInfo();
    }
  }, [selectedBusinessId]);

  // Fetch categories with color and emoji
  useEffect(() => {
    if (!selectedBusinessId) return;

    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("pos_categories")
        .select("id, name, color, emoji, sort_order")
        .eq("business_id", selectedBusinessId)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
      } else {
        setCategories(data || []);
      }
    };

    fetchCategories();

    const catSubscription = supabase
      .channel(`pos_categories_${selectedBusinessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pos_categories", filter: `business_id=eq.${selectedBusinessId}` },
        fetchCategories
      )
      .subscribe();

    return () => {
      supabase.removeChannel(catSubscription);
    };
  }, [selectedBusinessId]);

  // Fetch products with full details
  useEffect(() => {
    if (!selectedBusinessId) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("pos_inventory")
        .select("id, name, price, cost, sku, barcode, category_id, track_stock, stock_quantity, low_stock_threshold, station_ids, image_url")
        .eq("business_id", selectedBusinessId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data || []);
      }
    };

    fetchProducts();

    const prodSubscription = supabase
      .channel(`pos_inventory_${selectedBusinessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pos_inventory", filter: `business_id=eq.${selectedBusinessId}` },
        fetchProducts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prodSubscription);
    };
  }, [selectedBusinessId]);

  // Filter products by active category
  const filteredProducts = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  const handleAddToCart = (product) => {
	if (isLocked) return;
	
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (productId) => {
	if (isLocked) return;
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const handleUpdateQty = (productId, qty) => {
	if (isLocked) return;
    if (qty <= 0) return handleRemoveFromCart(productId);
    setCartItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleBarcodeScan = (code) => {
	if (isLocked) return;
	
    const foundProduct = products.find(
      (p) => 
        (p.sku && p.sku.trim() === code.trim()) ||
        (p.barcode && p.barcode.trim() === code.trim())
    );
    if (foundProduct) handleAddToCart(foundProduct);
  };

  const handleCheckout = (checkoutData) => {
	if (isLocked) return;
	
    console.log('Checkout data from cart:', checkoutData); // Debug log
    console.log('Cart items:', cartItems); // Debug log
    
    // Navigate to sale review screen with checkout data
    navigate('/dashboard/pos/sale-review', {
      state: { 
        checkoutData: {
          ...checkoutData,
          items: cartItems, // Pass the actual cart items
          business_id: selectedBusinessId
        }
      }
    });
  };

  return (
    <div style={styles.container}>
      {!!warningSeconds && !isLocked && (
        <div style={styles.warning}>
          Auto-lock in <b>{warningSeconds}s</b>
        </div>
      )}

      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>{businessName}</h2>
          <p style={{ margin: 0 }}>Logged in as: {employeeName}</p>
        </div>
        <div style={styles.clock}>{time}</div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.productsSection}>
          <div style={styles.categories}>
            <button
              style={{
                ...styles.categoryButton,
                backgroundColor: activeCategory === null ? "#008080" : "#fff",
                color: activeCategory === null ? "#fff" : "#333",
              }}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  style={{
                    ...styles.categoryButton,
                    backgroundColor: isActive ? (cat.color || "#008080") : "#fff",
                    color: isActive ? "#fff" : "#333",
                    borderColor: cat.color || "#008080",
                  }}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.emoji && <span style={{ marginRight: "6px" }}>{cat.emoji}</span>}
                  {cat.name}
                </button>
              );
            })}
          </div>

          <POSProductGrid products={filteredProducts} onAddToCart={handleAddToCart} />
        </div>

        <POSCartPanel
          cartItems={cartItems}
          onRemoveItem={handleRemoveFromCart}
          onUpdateQty={handleUpdateQty}
          onCheckout={handleCheckout}
		  sessionLocked={isLocked}
        />
      </div>

      <BarcodeScanHandler onScan={handleBarcodeScan} />
	  <SessionLockModal
	    visible={isLocked}
	    onSubmitPin={unlockWithPin}
	    onManagerOverride={managerOverride}
	    pinAttempts={pinAttempts}
	    lockedUntil={lockedUntil}
	    warningSeconds={warningSeconds}
	    overrideActive={isOverrideActive()}
	  />

      <SessionLockModal
        visible={isLocked}
        onSubmitPin={unlockWithPin}
        onManagerOverride={managerOverride}
        pinAttempts={pinAttempts}
        lockedUntil={lockedUntil}
        warningSeconds={warningSeconds}
        overrideActive={isOverrideActive()}
      />
    </div>
  );
};

const styles = {
  container: { 
    display: "flex", 
    flexDirection: "column", 
    height: "100vh", // Full viewport height
    paddingTop: "80px", // Account for fixed header
    paddingLeft: "20px",
    paddingRight: "20px", 
    paddingBottom: "20px",
    boxSizing: "border-box"
  },
  warning: { 
    background: "#fff8e1", 
    padding: "8px", 
    borderRadius: 8, 
    marginBottom: "10px" 
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "20px",
    backgroundColor: "white",
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
    position: "relative",
    zIndex: 10
  },
  clock: { 
    fontSize: "18px", 
    fontWeight: "bold" 
  },
  mainContent: { 
    display: "flex", 
    flex: 1, 
    gap: "20px",
    minHeight: 0 
  },
  productsSection: { 
    flex: 3, 
    display: "flex", 
    flexDirection: "column",
    minHeight: 0
  },
  categories: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", 
    gap: "12px", 
    marginBottom: "20px",
    maxHeight: "120px",
    overflowY: "auto"
  },
  categoryButton: { 
    padding: "12px 16px", 
    border: "2px solid #008080", 
    borderRadius: "6px", 
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
    minHeight: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    transition: "all 0.2s ease",
    backgroundColor: "#fff"
  },
};

export default POSRegister;