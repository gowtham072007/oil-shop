import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_COUPONS,
  DEMO_PRODUCT_IDS,
} from "../data/defaultData";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateWhatsAppBillText,
  buildWhatsAppUrl,
  cleanWhatsAppNumber,
} from "../utils/billGenerator";
import {
  fetchAllProducts,
  createProductApi,
  updateProductApi,
  deleteProductApi,
  uploadProductPhoto,
  fetchShopSettings,
  saveShopSettingsApi,
  adminLogin as apiAdminLogin,
  verifyAdminToken,
  syncMigrationApi,
} from "../utils/api";
import { processProductImageFile } from "../utils/imageHandler";

const ShopContext = createContext();

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};

export const ShopProvider = ({ children }) => {
  // Shared Products from Central Database
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_products");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !p.isSample && !DEMO_PRODUCT_IDS.includes(p.id));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [syncStatus, setSyncStatus] = useState("connecting"); // 'connected' | 'syncing' | 'offline'

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_categories");
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [shopSettings, setShopSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SHOP_SETTINGS,
          ...parsed,
          whatsappNumber: parsed.whatsappNumber || DEFAULT_SHOP_SETTINGS.whatsappNumber,
          phoneDisplay: parsed.phoneDisplay || DEFAULT_SHOP_SETTINGS.phoneDisplay,
        };
      }
      return DEFAULT_SHOP_SETTINGS;
    } catch {
      return DEFAULT_SHOP_SETTINGS;
    }
  });

  const [coupons, setCoupons] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_coupons");
      return saved ? JSON.parse(saved) : DEFAULT_COUPONS;
    } catch {
      return DEFAULT_COUPONS;
    }
  });

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_orders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !DEMO_PRODUCT_IDS.includes(item.productId));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");

  // UI Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem("oil_shop_admin_token") || "";
    } catch {
      return "";
    }
  });

  const [previewOrder, setPreviewOrder] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Search & Filter state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);

  const eventSourceRef = useRef(null);

  // Show toast notification
  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  // -------------------------------------------------------------
  // Verify existing admin token on mount
  // -------------------------------------------------------------
  useEffect(() => {
    if (adminToken) {
      verifyAdminToken(adminToken).then((isValid) => {
        setIsAdminAuthenticated(isValid);
        if (!isValid) {
          localStorage.removeItem("oil_shop_admin_token");
          setAdminToken("");
        }
      });
    }
  }, [adminToken]);

  // -------------------------------------------------------------
  // Central Database Loader
  // -------------------------------------------------------------
  const loadCentralProducts = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingProducts(true);
    try {
      const serverProducts = await fetchAllProducts();
      setProducts(serverProducts);
      localStorage.setItem("oil_shop_products", JSON.stringify(serverProducts));
      setSyncStatus("connected");
      return serverProducts;
    } catch (err) {
      console.warn("[Poomani Sync] Unable to fetch from central database:", err.message);
      setSyncStatus("offline");
      return null;
    } finally {
      if (!silent) setIsLoadingProducts(false);
    }
  }, []);

  const loadCentralSettings = useCallback(async () => {
    try {
      const serverSettings = await fetchShopSettings();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        setShopSettings((prev) => ({
          ...prev,
          ...serverSettings,
        }));
      }
    } catch (err) {
      console.warn("[Poomani Sync] Unable to load central settings:", err.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCentralProducts();
    loadCentralSettings();
  }, [loadCentralProducts, loadCentralSettings]);

  // -------------------------------------------------------------
  // Real-Time Server-Sent Events (SSE) Multi-Device Sync
  // -------------------------------------------------------------
  useEffect(() => {
    let sseTimeout;

    const setupSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const es = new EventSource("/api/events");
        eventSourceRef.current = es;

        es.onopen = () => {
          setSyncStatus("connected");
        };

        es.addEventListener("connected", () => {
          setSyncStatus("connected");
        });

        es.addEventListener("product:created", (e) => {
          try {
            const newProduct = JSON.parse(e.data);
            setProducts((prev) => {
              const filtered = prev.filter((p) => p.id !== newProduct.id);
              const updated = [newProduct, ...filtered];
              localStorage.setItem("oil_shop_products", JSON.stringify(updated));
              return updated;
            });
            showNotification(`New product added: ${newProduct.name}`, "info");
          } catch (err) {
            console.error("[SSE] Failed to parse product:created event:", err);
          }
        });

        es.addEventListener("product:updated", (e) => {
          try {
            const updatedProduct = JSON.parse(e.data);
            setProducts((prev) => {
              const updated = prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
              localStorage.setItem("oil_shop_products", JSON.stringify(updated));
              return updated;
            });
            // Also update any matching item in active cart with updated price/stock
            setCart((prevCart) =>
              prevCart.map((item) => {
                if (item.productId === updatedProduct.id) {
                  const matchingVariant = updatedProduct.variants?.find(
                    (v) => v.size === item.selectedVariant?.size
                  );
                  return matchingVariant
                    ? {
                        ...item,
                        name: updatedProduct.name,
                        image: updatedProduct.image,
                        price: matchingVariant.price,
                        selectedVariant: matchingVariant,
                      }
                    : item;
                }
                return item;
              })
            );
          } catch (err) {
            console.error("[SSE] Failed to parse product:updated event:", err);
          }
        });

        es.addEventListener("product:deleted", (e) => {
          try {
            const { id } = JSON.parse(e.data);
            setProducts((prev) => {
              const updated = prev.filter((p) => p.id !== id);
              localStorage.setItem("oil_shop_products", JSON.stringify(updated));
              return updated;
            });
            setCart((prev) => prev.filter((item) => item.productId !== id));
          } catch (err) {
            console.error("[SSE] Failed to parse product:deleted event:", err);
          }
        });

        es.addEventListener("settings:updated", (e) => {
          try {
            const newSettings = JSON.parse(e.data);
            setShopSettings((prev) => ({ ...prev, ...newSettings }));
          } catch (err) {
            console.error("[SSE] Failed to parse settings:updated event:", err);
          }
        });

        es.onerror = () => {
          setSyncStatus("offline");
          es.close();
          // Attempt reconnection after 8 seconds
          sseTimeout = setTimeout(setupSSE, 8000);
        };
      } catch (err) {
        console.warn("[SSE] EventSource setup error:", err);
        setSyncStatus("offline");
      }
    };

    setupSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearTimeout(sseTimeout);
    };
  }, [showNotification]);

  // -------------------------------------------------------------
  // Automatic Refetch on Tab Focus & Periodic Polling
  // Ensures devices that were asleep or offline immediately re-sync
  // -------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadCentralProducts(true);
        loadCentralSettings();
      }
    };

    const handleWindowFocus = () => {
      loadCentralProducts(true);
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic silent refresh every 30 seconds
    const interval = setInterval(() => {
      loadCentralProducts(true);
    }, 30000);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [loadCentralProducts, loadCentralSettings]);

  // -------------------------------------------------------------
  // LocalStorage Persist for offline cache & cart
  // -------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem("oil_shop_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("oil_shop_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("oil_shop_settings", JSON.stringify(shopSettings));
  }, [shopSettings]);

  // -------------------------------------------------------------
  // Admin Operations (Save to Shared Database with Local Fallback)
  // -------------------------------------------------------------
  const loginAdmin = async (pin) => {
    const entered = String(pin || "").trim();
    const expected = String(shopSettings.adminPin || "1234").trim();

    // 1. Check PIN
    if (entered !== expected) {
      throw new Error("Incorrect PIN. Please enter the correct PIN (Default: 1234)");
    }

    // 2. PIN matches! Immediately authenticate the admin locally
    setIsAdminAuthenticated(true);
    showNotification("Admin authenticated successfully!");

    // 3. Also try backend authentication if server API is reachable
    try {
      const res = await apiAdminLogin(entered);
      if (res && res.success && res.token) {
        setAdminToken(res.token);
        localStorage.setItem("oil_shop_admin_token", res.token);

        // Check if central database is empty and local products exist to migrate
        try {
          const saved = localStorage.getItem("oil_shop_products");
          if (saved) {
            const localItems = JSON.parse(saved);
            if (Array.isArray(localItems) && localItems.length > 0) {
              const currentDb = await fetchAllProducts();
              if (currentDb.length === 0) {
                await syncMigrationApi(localItems, res.token);
                await loadCentralProducts(true);
                showNotification("Local products migrated to central database!", "info");
              }
            }
          }
        } catch (e) {
          console.warn("Auto-migration check skipped:", e);
        }
      }
    } catch (err) {
      console.warn("[Admin Auth] Backend server not reachable, logged in via secure local PIN:", err.message);
    }

    return true;
  };

  const logoutAdmin = () => {
    setAdminToken("");
    setIsAdminAuthenticated(false);
    localStorage.removeItem("oil_shop_admin_token");
    showNotification("Logged out of admin area", "info");
  };

  const addProduct = async (newProduct) => {
    const localId = newProduct.id || `prod-${Date.now()}`;
    const productRecord = { ...newProduct, id: localId };

    // 1. Try central database if token exists
    if (adminToken) {
      try {
        const res = await createProductApi(newProduct, adminToken);
        if (res && res.success && res.product) {
          setProducts((prev) => [res.product, ...prev.filter((p) => p.id !== res.product.id)]);
          showNotification("Product saved and synced to all devices!");
          return res.product;
        }
      } catch (err) {
        console.warn("[Product Save] Backend unavailable, saving locally:", err.message);
      }
    }

    // 2. Fallback: Save to local state and localStorage
    setProducts((prev) => [productRecord, ...prev.filter((p) => p.id !== localId)]);
    showNotification("Product saved successfully!");
    return productRecord;
  };

  const updateProduct = async (id, updatedFields) => {
    // 1. Try central database if token exists
    if (adminToken) {
      try {
        const res = await updateProductApi(id, updatedFields, adminToken);
        if (res && res.success && res.product) {
          setProducts((prev) => prev.map((p) => (p.id === id ? res.product : p)));
          showNotification("Product updated and synced across all devices!");
          return res.product;
        }
      } catch (err) {
        console.warn("[Product Update] Backend unavailable, updating locally:", err.message);
      }
    }

    // 2. Fallback: Update locally
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
    showNotification("Product updated successfully!");
    return { id, ...updatedFields };
  };

  const deleteProduct = async (id) => {
    // 1. Try central database if token exists
    if (adminToken) {
      try {
        await deleteProductApi(id, adminToken);
      } catch (err) {
        console.warn("[Product Delete] Backend unavailable, deleting locally:", err.message);
      }
    }

    // 2. Delete locally
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((item) => item.productId !== id));
    showNotification("Product removed successfully!");
    return true;
  };

  const uploadPhoto = async (file) => {
    // 1. Try backend photo upload if token exists
    if (adminToken) {
      try {
        const res = await uploadProductPhoto(file, adminToken);
        if (res && res.success && res.url) {
          return res;
        }
      } catch (err) {
        console.warn("[Photo Upload] Backend unavailable, processing image locally:", err.message);
      }
    }

    // 2. Fallback: client-side processing
    const processed = await processProductImageFile(file);
    return {
      success: true,
      url: processed.dataUrl,
      fileName: processed.fileName,
    };
  };

  const updateShopSettings = async (newSettings) => {
    const cleaned = {
      ...newSettings,
      whatsappNumber: cleanWhatsAppNumber(newSettings.whatsappNumber || shopSettings.whatsappNumber),
    };
    if (adminToken) {
      try {
        await saveShopSettingsApi(cleaned, adminToken);
      } catch (err) {
        console.warn("Could not save settings to central DB, saving locally:", err);
      }
    }
    setShopSettings((prev) => ({ ...prev, ...cleaned }));
    showNotification("Shop & WhatsApp settings updated!");
  };

  // -------------------------------------------------------------
  // Cart Management
  // -------------------------------------------------------------
  const addToCart = (product, selectedVariant, quantity = 1) => {
    const variant = selectedVariant || (product.variants && product.variants[0]) || {
      id: "default",
      size: "1 Litre",
      price: product.price || 300,
      stock: 10,
    };

    const cartItemId = `${product.id}-${variant.size}`;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            id: cartItemId,
            productId: product.id,
            name: product.name,
            brand: product.brand,
            image: product.image,
            oilType: product.oilType,
            selectedVariant: variant,
            quantity: quantity,
            price: variant.price,
          },
        ];
      }
    });

    showNotification(`Added ${product.name} (${variant.size}) to cart!`);
  };

  const updateCartQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
    showNotification("Item removed from cart", "info");
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  // Coupons
  const applyCoupon = (code) => {
    setCouponError("");
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === cleanCode);
    if (!found) {
      setCouponError("Invalid promo code. Try 'WELCOME50' or 'PURE10'");
      return false;
    }

    const { subtotal } = calculateOrderTotals(cart, shopSettings, null);
    if (subtotal < (found.minOrder || 0)) {
      setCouponError(`This coupon requires a minimum cart value of ₹${found.minOrder}`);
      return false;
    }

    setAppliedCoupon(found);
    showNotification(`Coupon ${found.code} applied successfully!`);
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
    showNotification("Coupon removed", "info");
  };

  const cartSummary = calculateOrderTotals(cart, shopSettings, appliedCoupon);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // WhatsApp Order Flow
  const initiateWhatsAppCheckout = (customerDetails) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}, ${now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;

    const orderNumber = generateOrderNumber();
    const totals = calculateOrderTotals(cart, shopSettings, appliedCoupon);

    const fullAddress = [
      customerDetails.address,
      customerDetails.landmark ? `Landmark: ${customerDetails.landmark}` : null,
      customerDetails.city ? `${customerDetails.city} - ${customerDetails.pincode}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const orderRecord = {
      orderNumber,
      date: formattedDate,
      customerName: customerDetails.name.trim(),
      customerPhone: customerDetails.phone.trim(),
      deliveryAddress: fullAddress,
      items: totals.verifiedItems,
      subtotal: totals.subtotal,
      deliveryCharge: totals.deliveryCharge,
      discount: totals.discount,
      grandTotal: totals.grandTotal,
      paymentMethod: customerDetails.paymentMethod || "Cash on Delivery",
      customerNotes: customerDetails.notes?.trim() || "None",
      status: "WhatsApp Message Pending",
      timestamp: Date.now(),
    };

    const billText = generateWhatsAppBillText(orderRecord);
    const waUrl = buildWhatsAppUrl(shopSettings.whatsappNumber, billText);

    const completeOrder = {
      ...orderRecord,
      billText,
      waUrl,
    };

    setOrders((prev) => [completeOrder, ...prev]);
    setPreviewOrder(completeOrder);
    setIsCartOpen(false);
  };

  const confirmOrderRedirect = (orderNumber) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.orderNumber === orderNumber
          ? { ...ord, status: "Redirected to WhatsApp" }
          : ord
      )
    );
  };

  return (
    <ShopContext.Provider
      value={{
        products,
        isLoadingProducts,
        syncStatus,
        refetchProducts: loadCentralProducts,
        categories,
        shopSettings,
        coupons,
        orders,
        cart,
        totalCartCount,
        cartSummary,
        appliedCoupon,
        couponError,
        isCartOpen,
        setIsCartOpen,
        isAdminOpen,
        setIsAdminOpen,
        isAdminAuthenticated,
        previewOrder,
        setPreviewOrder,
        quickViewProduct,
        setQuickViewProduct,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        notification,
        showNotification,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        initiateWhatsAppCheckout,
        confirmOrderRedirect,
        loginAdmin,
        logoutAdmin,
        addProduct,
        updateProduct,
        deleteProduct,
        uploadPhoto,
        updateShopSettings,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
