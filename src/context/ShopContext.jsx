import React, { createContext, useContext, useState, useEffect } from "react";
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_SHOP_SETTINGS,
  DEFAULT_COUPONS,
} from "../data/defaultData";
import {
  calculateOrderTotals,
  generateOrderNumber,
  generateWhatsAppBillText,
  buildWhatsAppUrl,
  cleanWhatsAppNumber,
} from "../utils/billGenerator";

const ShopContext = createContext();

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
};

export const ShopProvider = ({ children }) => {
  // Load from LocalStorage with defaults
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_products");
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch {
      return DEFAULT_PRODUCTS;
    }
  });

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
      return saved ? JSON.parse(saved) : DEFAULT_SHOP_SETTINGS;
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

  // Shopping cart items: array of { id, productId, name, image, selectedVariant, quantity, price }
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem("oil_shop_cart");
      return saved ? JSON.parse(saved) : [];
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
  const [previewOrder, setPreviewOrder] = useState(null); // When reviewing bill before sending to WhatsApp
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Search & Filter state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem("oil_shop_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("oil_shop_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("oil_shop_settings", JSON.stringify(shopSettings));
  }, [shopSettings]);

  useEffect(() => {
    localStorage.setItem("oil_shop_coupons", JSON.stringify(coupons));
  }, [coupons]);

  useEffect(() => {
    localStorage.setItem("oil_shop_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("oil_shop_cart", JSON.stringify(cart));
  }, [cart]);

  // Show toast notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Cart Management
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

  // Calculations for current cart
  const cartSummary = calculateOrderTotals(cart, shopSettings, appliedCoupon);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Prepare Order and open Bill Preview Modal
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

    // Save into Order History for shop tracking
    setOrders((prev) => [completeOrder, ...prev]);

    // Open Bill Preview Modal
    setPreviewOrder(completeOrder);
    setIsCartOpen(false);
  };

  // Mark as sent / confirmed
  const confirmOrderRedirect = (orderNumber) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.orderNumber === orderNumber
          ? { ...ord, status: "Redirected to WhatsApp" }
          : ord
      )
    );
    // Don't auto-clear cart until customer chooses or confirms
  };

  // Admin Management Actions
  const addProduct = (newProduct) => {
    const id = `prod-${Date.now()}`;
    const product = { ...newProduct, id };
    setProducts((prev) => [product, ...prev]);
    showNotification("Product added successfully!");
  };

  const updateProduct = (id, updatedFields) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedFields } : p))
    );
    showNotification("Product updated successfully!");
  };

  const deleteProduct = (id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showNotification("Product removed successfully!");
  };

  const updateShopSettings = (newSettings) => {
    setShopSettings((prev) => ({
      ...prev,
      ...newSettings,
      whatsappNumber: cleanWhatsAppNumber(newSettings.whatsappNumber || prev.whatsappNumber),
    }));
    showNotification("Shop & WhatsApp settings updated!");
  };

  const addCategory = (newCat) => {
    const id = newCat.id || newCat.name.toLowerCase().replace(/\s+/g, "-");
    setCategories((prev) => [...prev, { ...newCat, id }]);
    showNotification("Category added!");
  };

  const deleteCategory = (id) => {
    if (id === "all") return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showNotification("Category removed!");
  };

  const updateOrderStatus = (orderNumber, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? { ...o, status: newStatus } : o))
    );
    showNotification(`Order ${orderNumber} status updated to: ${newStatus}`);
  };

  const resetToDefaultData = () => {
    setProducts(DEFAULT_PRODUCTS);
    setCategories(DEFAULT_CATEGORIES);
    setShopSettings(DEFAULT_SHOP_SETTINGS);
    setCoupons(DEFAULT_COUPONS);
    showNotification("Store reset to authentic demo data!");
  };

  const exportStoreData = () => {
    const data = {
      products,
      categories,
      shopSettings,
      coupons,
      orders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oil-shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importStoreData = (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.products) setProducts(data.products);
      if (data.categories) setCategories(data.categories);
      if (data.shopSettings) setShopSettings(data.shopSettings);
      if (data.coupons) setCoupons(data.coupons);
      if (data.orders) setOrders(data.orders);
      showNotification("Store data imported successfully!");
      return true;
    } catch {
      showNotification("Failed to import: Invalid JSON file", "error");
      return false;
    }
  };

  return (
    <ShopContext.Provider
      value={{
        products,
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
        setIsAdminAuthenticated,
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
        // Methods
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon,
        initiateWhatsAppCheckout,
        confirmOrderRedirect,
        // Admin Methods
        addProduct,
        updateProduct,
        deleteProduct,
        updateShopSettings,
        addCategory,
        deleteCategory,
        updateOrderStatus,
        resetToDefaultData,
        exportStoreData,
        importStoreData,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
