// components/POS/POSProductGrid.jsx
import React, { useState, useRef, useEffect } from "react";
import BarcodeScanHandler from "./BarcodeScanHandler";

const POSProductGrid = ({ products, onAddToCart }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 768);
  const searchInputRef = useRef(null);

  // Track window width for responsive behavior
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate grid columns based on screen width
  const getGridColumns = () => {
    const containerWidth = windowWidth - 64; // Account for padding (32px each side)
    const buttonWidth = 370; // Base button width + gap
    const maxColumns = Math.floor(containerWidth / buttonWidth);
    return Math.max(2, Math.min(8, maxColumns)); // Min 2, Max 8
  };

  // Handle barcode scan from BarcodeScanHandler
  const handleBarcodeScan = (code) => {
    const match = products.find(
      (p) =>
        p.barcode?.toLowerCase() === code.toLowerCase() ||
        p.sku?.toLowerCase() === code.toLowerCase()
    );
    if (match) {
      onAddToCart(match);
    } else {
      console.log("Product not found for barcode:", code);
    }
  };

  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle enter key for search/barcode entry
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      const match = products.find(
        (p) =>
          p.barcode?.toLowerCase() === searchTerm.trim().toLowerCase() ||
          p.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          p.sku?.toLowerCase() === searchTerm.trim().toLowerCase()
      );
      if (match) {
        onAddToCart(match);
        setSearchTerm("");
      } else {
        console.log("Product not found for:", searchTerm);
      }
    }
  };

  // Filter products by search term (categories handled by parent)
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    return (
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Check if product is out of stock
  const isOutOfStock = (product) => {
    return product.track_stock && (product.stock_quantity || 0) <= 0;
  };

  // Check if product is low stock
  const isLowStock = (product) => {
    return product.track_stock && 
           (product.stock_quantity || 0) > 0 && 
           (product.stock_quantity || 0) <= (product.low_stock_threshold || 5);
  };

  // Check if product has modifiers (placeholder for future)
  const hasModifiers = (product) => {
    return product.pos_product_modifier_groups && product.pos_product_modifier_groups.length > 0;
  };

  // Check if product has variants (placeholder for future)
  const hasVariants = (product) => {
    return product.pos_variants && product.pos_variants.length > 0;
  };

  // Get station routing display - now supports multiple stations
  const getStationBadge = (product) => {
    if (!product.station_ids) return null;
    
    // Handle both array and JSON string formats
    let stations = [];
    if (Array.isArray(product.station_ids)) {
      stations = product.station_ids;
    } else if (typeof product.station_ids === 'string') {
      try {
        stations = JSON.parse(product.station_ids);
      } catch (e) {
        return null;
      }
    }
    
    // Show multiple stations separated by " + "
    return stations.length > 0 ? stations.join(" + ") : null;
  };

  return (
    <div style={styles.container}>
      {/* Barcode Scanner Handler */}
      <BarcodeScanHandler onScan={handleBarcodeScan} />
      
      {/* Search bar */}
      <div style={styles.searchContainer}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search, Scan Barcode, or Enter SKU..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      {/* Product grid */}
      <div style={styles.gridContainer}>
        <div style={{
          ...styles.productGrid,
          gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`
        }}>
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock(product)}
              style={{
                ...styles.productButton,
                opacity: isOutOfStock(product) ? 0.5 : 1,
                cursor: isOutOfStock(product) ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isOutOfStock(product)) {
                  e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
              }}
            >
              {/* Stock status indicators */}
              {isOutOfStock(product) && (
                <div style={{
                  ...styles.badge,
                  backgroundColor: "#ef4444",
                  top: "4px",
                  left: "4px"
                }}>
                  OUT
                </div>
              )}
              {isLowStock(product) && !isOutOfStock(product) && (
                <div style={{
                  ...styles.badge,
                  backgroundColor: "#eab308",
                  top: "4px",
                  left: "4px"
                }}>
                  LOW
                </div>
              )}

              {/* Feature indicators */}
              <div style={styles.featureIndicators}>
                {hasModifiers(product) && (
                  <div style={{
                    ...styles.badge,
                    backgroundColor: "#3b82f6"
                  }}>
                    M
                  </div>
                )}
                {hasVariants(product) && (
                  <div style={{
                    ...styles.badge,
                    backgroundColor: "#10b981"
                  }}>
                    V
                  </div>
                )}
              </div>

              {/* Product Image - Hide on small screens only */}
              {windowWidth >= 600 && (
                <div style={styles.imageContainer}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={styles.productImage}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  <div 
                    style={{
                      ...styles.placeholderImage,
                      display: product.image_url ? 'none' : 'flex'
                    }}
                  >
                    No Image
                  </div>
                </div>
              )}

              {/* Product Info - Always visible and properly spaced */}
              <div style={{
                ...styles.productInfo,
                paddingTop: "12px",
                paddingBottom: "12px",
                flex: "1",
                justifyContent: "space-between"
              }}>
                {/* Product Name - Always 2 lines max */}
                <div style={styles.nameContainer}>
                  <span style={styles.productName}>
                    {product.name}
                  </span>
                </div>
                
                {/* Price - Always visible */}
                <div style={styles.priceContainer}>
                  <span style={styles.productPrice}>
                    ${Number(product.price || 0).toFixed(2)}
                  </span>
                </div>
                
                {/* Bottom Row - Routing and Stock - Always on same row */}
                <div style={styles.bottomRowContainer}>
                  <div style={styles.bottomRow}>
                    <span style={styles.stationInfo}>
                      {getStationBadge(product) || ""}
                    </span>
                    {product.track_stock && (
                      <span style={styles.stockInfo}>
                        Stock: {product.stock_quantity || 0}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* No products found */}
      {filteredProducts.length === 0 && (
        <div style={styles.noProducts}>
          {searchTerm ? "No products found matching your search" : "No products available"}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column"
  },
  searchContainer: {
    marginBottom: "20px", 
    padding: "0 16px"
  },
  searchInput: {
    width: "100%",
    padding: "12px",
    border: "2px solid #008080",
    borderRadius: "8px",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none"
  },
  gridContainer: {
    flex: 1,
    padding: "0 16px",
    overflowY: "auto",
    width: "100%"
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
    justifyItems: "stretch",
    paddingBottom: "20px",
    width: "100%"
  },
  productButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    border: "2px solid #008080",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "white",
    position: "relative",
    width: "100%",
    minHeight: "160px", // Consistent height for all buttons
    maxWidth: "none", // Remove max width restriction
    transition: "box-shadow 0.2s ease",
    padding: 0,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  badge: {
    position: "absolute",
    color: "white",
    fontSize: "10px",
    padding: "2px 4px",
    borderRadius: "3px",
    fontWeight: "bold",
    zIndex: 10
  },
  featureIndicators: {
    position: "absolute",
    top: "4px",
    right: "4px",
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  imageContainer: {
    width: "100%",
    height: "100px", // Fixed height for consistency
    position: "relative",
    flexShrink: 0
  },
  productImage: {
    objectFit: "cover",
    width: "100%",
    height: "100%"
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    fontSize: "12px"
  },
  productInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    borderTop: "1px solid #e5e7eb",
    boxSizing: "border-box",
    padding: "8px 12px"
  },
  nameContainer: {
    width: "100%",
    minHeight: "32px", // Reserve space for 2 lines
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px"
  },
  productName: {
    fontSize: "14px",
    fontWeight: "600",
    width: "100%",
    textAlign: "center",
    color: "#1f2937",
    lineHeight: "1.2",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  },
  priceContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    marginBottom: "6px"
  },
  productPrice: {
    fontSize: "15px",
    color: "#059669",
    fontWeight: "600"
  },
  bottomRowContainer: {
    width: "100%",
    minHeight: "20px", // Reserve space for bottom row
    display: "flex",
    alignItems: "center"
  },
  bottomRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    fontSize: "11px",
    paddingLeft: "4px",
    paddingRight: "4px"
  },
  stationInfo: {
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "left",
    maxWidth: "65%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "11px",
    margin: 0,
    padding: 0
  },
  stockInfo: {
    fontSize: "11px",
    color: "#6b7280",
    textAlign: "right",
    flexShrink: 0,
    fontWeight: "400",
    margin: 0,
    padding: 0
  },
  noProducts: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 0",
    color: "#9ca3af",
    fontSize: "16px",
    textAlign: "center"
  }
};

export default POSProductGrid;