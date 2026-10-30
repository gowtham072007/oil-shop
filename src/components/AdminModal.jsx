import React, { useState, useRef, useEffect } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR, parseCountryAndLocalPhone, cleanWhatsAppNumber } from "../utils/billGenerator";
import { testWhatsAppCloudApi, sendWhatsAppTestPingApi, fetchAdminWhatsAppConfig } from "../utils/api";
import {
  X,
  Lock,
  LogOut,
  Package,
  Layers,
  Settings,
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  Save,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  Eye,
  AlertCircle,
  Send,
} from "lucide-react";

export const AdminModal = () => {
  const {
    isAdminOpen,
    setIsAdminOpen,
    isAdminAuthenticated,
    shopSettings,
    updateShopSettings,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    uploadPhoto,
    loginAdmin,
    logoutAdmin,
    syncStatus,
    refetchProducts,
    categories,
    addCategory,
    deleteCategory,
    orders,
    updateOrderStatus,
    resetToDefaultData,
    exportStoreData,
    importStoreData,
    showNotification,
    adminToken,
  } = useShop();

  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResult, setTestApiResult] = useState(null);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [testPingResult, setTestPingResult] = useState(null);
  const [adminWhatsAppConfig, setAdminWhatsAppConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'categories' | 'settings' | 'orders' | 'backup'

  // Product Form State (for Add / Edit)
  const [editingProduct, setEditingProduct] = useState(null); // null = table view, 'new' = new product, { ... } = editing
  const [productForm, setProductForm] = useState({
    name: "",
    regionalName: "",
    brand: "Poomani Chekku Ennai",
    oilType: "Wood-Pressed Cold Extracted",
    image: "",
    imageFileName: "",
    description: "",
    inStock: true,
    featured: false,
    variants: [
      { id: "v-1", size: "500 ml", price: 160, stock: 30, unit: "Bottle" },
      { id: "v-2", size: "1 Litre", price: 310, stock: 50, unit: "Bottle" },
      { id: "v-3", size: "5 Litre Can", price: 1500, stock: 15, unit: "Tin Can" },
    ],
  });

  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Shop Settings Form State
  const [settingsForm, setSettingsForm] = useState({ ...shopSettings });
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [customCountryCode, setCustomCountryCode] = useState("");
  const [localPhone, setLocalPhone] = useState("");

  // Sync settings when shopSettings changes or modal opens
  useEffect(() => {
    if (shopSettings) {
      setSettingsForm((prev) => ({ ...prev, ...shopSettings }));
      const parsed = parseCountryAndLocalPhone(shopSettings.whatsappNumber);
      setCountryCode(parsed.countryCode || "+91");
      setLocalPhone(parsed.localNumber || "");
    }
  }, [shopSettings, isAdminOpen]);

  // Fetch full WhatsApp configuration when admin is authenticated and in settings tab
  useEffect(() => {
    if (isAdminAuthenticated && adminToken) {
      fetchAdminWhatsAppConfig(adminToken)
        .then((cfg) => {
          if (cfg && cfg.success) {
            setAdminWhatsAppConfig(cfg);
          }
        })
        .catch((err) => console.warn("[AdminModal] Config fetch:", err.message));
    }
  }, [isAdminAuthenticated, adminToken, activeTab]);

  // View Bill Modal within Admin
  const [adminViewingBill, setAdminViewingBill] = useState(null);

  if (!isAdminOpen) return null;

  // Handle PIN Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setPinError("");
    setIsLoggingIn(true);
    try {
      await loginAdmin(enteredPin);
      setEnteredPin("");
    } catch (err) {
      setPinError(err.message || "Incorrect PIN. Please enter the correct PIN (Default: 1234)");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
  };

  // Product Edit Handlers
  const openNewProductForm = () => {
    setProductForm({
      name: "",
      regionalName: "",
      brand: shopSettings.shopName || "Poomani Chekku Ennai",
      oilType: "Wood-Pressed Cold Extracted",
      image: "", // Explicitly empty: no hardcoded photo or default substitution
      imageFileName: "",
      description: "",
      inStock: true,
      featured: false,
      variants: [
        { id: `v-${Date.now()}-1`, size: "500 ml", price: 160, stock: 30, unit: "Bottle" },
        { id: `v-${Date.now()}-2`, size: "1 Litre", price: 310, stock: 50, unit: "Bottle" },
        { id: `v-${Date.now()}-3`, size: "5 Litre Can", price: 1500, stock: 10, unit: "Tin Can" },
      ],
    });
    setImageError("");
    setFormError("");
    setEditingProduct("new");
  };

  const openEditProductForm = (product) => {
    setProductForm({
      ...product,
      variants: product.variants?.length
        ? product.variants
        : [{ id: "v-def", size: "1 Litre", price: product.price || 300, stock: 20, unit: "Bottle" }],
    });
    setImageError("");
    setFormError("");
    setEditingProduct(product.id);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError("");
    setFormError("");
    setIsProcessingImage(true);

    try {
      const res = await uploadPhoto(file);
      if (res.success && res.url) {
        setProductForm((prev) => ({
          ...prev,
          image: res.url,
          imageFileName: res.fileName || file.name,
        }));
      } else {
        throw new Error(res.error || "Failed to upload image.");
      }
    } catch (err) {
      setImageError(err.message || "Failed to upload image. Please try another photo.");
    } finally {
      setIsProcessingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setProductForm((prev) => ({
      ...prev,
      image: "",
      imageFileName: "",
    }));
    setImageError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const saveProductForm = async (e) => {
    e.preventDefault();
    if (isSavingProduct) return;
    setFormError("");
    setImageError("");

    // 1. Validate Product Name
    if (!productForm.name || !productForm.name.trim()) {
      setFormError("Product name (English) is required.");
      return;
    }

    // 2. Validate Product Photo (mandatory for all products)
    if (!productForm.image) {
      setImageError("Product photo is mandatory. Please upload an image file (JPG, JPEG, PNG, or WEBP).");
      setFormError("Please upload a product photo to continue.");
      return;
    }

    // 3. Validate Variants
    if (!productForm.variants || productForm.variants.length === 0) {
      setFormError("Please configure at least one pack size variant.");
      return;
    }

    for (let i = 0; i < productForm.variants.length; i++) {
      const v = productForm.variants[i];
      if (!v.size || !v.size.trim()) {
        setFormError(`Pack size description is required for row #${i + 1} (e.g. 500 ml, 1 Litre).`);
        return;
      }
      const priceNum = Number(v.price);
      if (v.price === "" || isNaN(priceNum) || priceNum <= 0) {
        setFormError(`Selling price for '${v.size}' must be greater than ₹0.`);
        return;
      }
      const stockNum = Number(v.stock);
      if (v.stock === "" || isNaN(stockNum) || stockNum < 0) {
        setFormError(`Available stock for '${v.size}' cannot be negative.`);
        return;
      }
    }

    // 4. Save Product to Shared Database
    setIsSavingProduct(true);
    const cleanedProduct = {
      ...productForm,
      name: productForm.name.trim(),
      regionalName: productForm.regionalName?.trim() || "",
      oilType: productForm.oilType?.trim() || "Wood-Pressed Cold Extracted",
      description: productForm.description?.trim() || "",
    };

    try {
      if (editingProduct === "new") {
        await addProduct(cleanedProduct);
      } else {
        await updateProduct(editingProduct, cleanedProduct);
      }
      setEditingProduct(null);
    } catch (err) {
      setFormError(err.message || "Failed to save product to central database. Please check connection.");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const updateVariantInForm = (index, field, value) => {
    const updated = [...productForm.variants];
    updated[index] = {
      ...updated[index],
      [field]: field === "price" || field === "stock"
        ? (value === "" ? "" : Number(value))
        : value,
    };
    setProductForm({ ...productForm, variants: updated });
  };

  const addVariantRow = () => {
    setProductForm({
      ...productForm,
      variants: [
        ...productForm.variants,
        { id: `v-${Date.now()}`, size: "", price: "", stock: 10, unit: "Bottle" },
      ],
    });
  };

  const removeVariantRow = (index) => {
    if (productForm.variants.length <= 1) {
      setFormError("A product must have at least one pack size variant.");
      return;
    }
    const updated = productForm.variants.filter((_, idx) => idx !== index);
    setProductForm({ ...productForm, variants: updated });
  };

  // Save Settings with WhatsApp number validation and permanent DB persistence
  const saveSettings = async (e) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");

    const cleanLocal = String(localPhone).replace(/\D/g, "");
    const resolvedCode = (countryCode === "custom" ? customCountryCode : countryCode).replace(/\D/g, "") || "91";
    const fullNumber = `${resolvedCode}${cleanLocal}`;

    if (!cleanLocal || cleanLocal.length < 10) {
      setSettingsError("Please enter a valid 10-digit mobile number for WhatsApp. Customer order bills will be sent to this number.");
      return;
    }

    if (!resolvedCode) {
      setSettingsError("Please select or enter a valid country code (e.g. +91).");
      return;
    }

    try {
      const updatedSettings = {
        ...settingsForm,
        whatsappNumber: fullNumber,
        phoneDisplay: settingsForm.phoneDisplay || `+${resolvedCode} ${cleanLocal.slice(0, 5)} ${cleanLocal.slice(5)}`,
      };
      await updateShopSettings(updatedSettings);
      setSettingsSuccess("Shop & WhatsApp settings saved permanently to the database!");
      setTimeout(() => setSettingsSuccess(""), 4000);
    } catch (err) {
      setSettingsError(err.message || "Failed to save settings. Please try again.");
    }
  };

  const handleTestWhatsAppApi = async () => {
    setIsTestingApi(true);
    setTestApiResult(null);
    try {
      const res = await testWhatsAppCloudApi(
        {
          token: settingsForm.whatsappCloudApiToken,
          phoneNumberId: settingsForm.whatsappPhoneNumberId,
        },
        adminToken
      );

      if (res.success) {
        setTestApiResult({
          success: true,
          message: `Verified Active with Meta! Business Name: "${res.verifiedName || 'Poomani Chekku Ennai'}", Display Number: ${res.displayPhoneNumber || res.id} (Quality: ${res.qualityRating || 'GREEN'})`,
        });
      } else {
        setTestApiResult({
          success: false,
          error: res.error || "Meta WhatsApp Cloud API verification failed.",
        });
      }
    } catch (err) {
      setTestApiResult({
        success: false,
        error: err.message || "Failed to connect to Meta WhatsApp Cloud API endpoint.",
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleSendTestPing = async () => {
    setIsTestingPing(true);
    setTestPingResult(null);
    try {
      const resolvedCode = countryCode === "custom" ? customCountryCode.replace(/\D/g, "") : countryCode.replace(/\D/g, "");
      const cleanLocal = localPhone.replace(/\D/g, "");
      const targetTo = resolvedCode && cleanLocal ? `${resolvedCode}${cleanLocal}` : (settingsForm.whatsappNumber || shopSettings?.whatsappNumber);

      const res = await sendWhatsAppTestPingApi(
        {
          token: settingsForm.whatsappCloudApiToken,
          phoneNumberId: settingsForm.whatsappPhoneNumberId,
          to: targetTo,
        },
        adminToken
      );

      if (res.success) {
        setTestPingResult({
          success: true,
          message: `Delivered test verification ping to store owner WhatsApp (+${res.recipient})! Meta Message ID: ${res.messageId}`,
        });
      } else {
        setTestPingResult({
          success: false,
          error: res.error || "Failed to deliver test WhatsApp ping.",
          metaDetails: res.metaDetails,
        });
      }
    } catch (err) {
      setTestPingResult({
        success: false,
        error: err.message || "Failed to connect to Meta WhatsApp test ping endpoint.",
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsAdminOpen(false)}>
      <div
        className="admin-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="admin-modal-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <Settings size={20} color="#e5b94c" />
            <span>Shop Owner Admin Area</span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: "600",
                padding: "2px 8px",
                borderRadius: "12px",
                background: syncStatus === "connected" ? "rgba(34, 197, 94, 0.2)" : "rgba(234, 179, 8, 0.2)",
                color: syncStatus === "connected" ? "#4ade80" : "#fef08a",
                border: `1px solid ${syncStatus === "connected" ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`,
                marginLeft: "0.4rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Products and changes sync in real time across all phones, tablets, and computers."
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: syncStatus === "connected" ? "#22c55e" : syncStatus === "suspended" ? "#f59e0b" : "#3b82f6",
                  display: "inline-block",
                }}
              />
              {syncStatus === "connected" ? "Shared Central DB Live" : syncStatus === "suspended" ? "Server Paused on Render" : "Admin Panel (Active)"}
            </span>
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {isAdminAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-admin-pill"
                style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", borderColor: "rgba(255,255,255,0.3)" }}
              >
                <LogOut size={14} />
                Logout
              </button>
            )}
            <button
              type="button"
              className="btn-close"
              onClick={() => setIsAdminOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Auth Screen if not logged in */}
        {!isAdminAuthenticated ? (
          <div style={{ padding: "3rem 1.5rem", maxWidth: "420px", margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#fef3c7",
                color: "#b45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
              }}
            >
              <Lock size={30} />
            </div>
            <h3 style={{ fontSize: "1.35rem", marginBottom: "0.5rem", color: "#09331d" }}>
              Admin Security Access
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#57655d", marginBottom: "1.5rem" }}>
              Enter the shop owner PIN to manage products, prices, stock, coupons, and orders.
            </p>

            <form onSubmit={handleLogin}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN (Default: 1234)"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  style={{ textAlign: "center", fontSize: "1.2rem", letterSpacing: "0.2em", padding: "0.75rem" }}
                  autoFocus
                />
                {pinError && (
                  <div className="form-error-msg" style={{ marginTop: "6px" }}>
                    {pinError}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary-glow"
                disabled={isLoggingIn}
                style={{
                  width: "100%",
                  justifyContent: "center",
                  opacity: isLoggingIn ? 0.7 : 1,
                  cursor: isLoggingIn ? "not-allowed" : "pointer",
                }}
              >
                {isLoggingIn ? "Authenticating with Central DB..." : "Unlock Admin Dashboard"}
              </button>
            </form>

            <div style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "#85958c" }}>
              💡 Hint: Default demo PIN is <strong>1234</strong> (can be changed in settings).
            </div>
          </div>
        ) : (
          <>
            {/* Admin Tabs */}
            <div className="admin-nav-tabs">
              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "products" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("products");
                  setEditingProduct(null);
                }}
              >
                <Package size={16} />
                Products ({products.length})
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "categories" ? "active" : ""}`}
                onClick={() => setActiveTab("categories")}
              >
                <Layers size={16} />
                Categories ({categories.length})
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "orders" ? "active" : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                <ClipboardList size={16} />
                Orders Log ({orders.length})
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings size={16} />
                Shop & WhatsApp Settings
              </button>

              <button
                type="button"
                className={`admin-nav-btn ${activeTab === "backup" ? "active" : ""}`}
                onClick={() => setActiveTab("backup")}
              >
                <Download size={16} />
                Backup & Restore
              </button>
            </div>

            {/* Admin Tab Content */}
            <div className="admin-modal-content">
              {/* TAB 1: PRODUCTS */}
              {activeTab === "products" && (
                <div>
                  {syncStatus === "suspended" && (
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        background: "#fef3c7",
                        border: "1px solid #f59e0b",
                        borderRadius: "8px",
                        color: "#92400e",
                        fontSize: "0.84rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <AlertCircle size={18} style={{ flexShrink: 0, color: "#d97706" }} />
                      <div>
                        <strong>Render Server Paused:</strong> Products you add or edit are safely stored on this device. To sync across all other phones and devices, open your <strong>Render Dashboard</strong> and click <strong>Resume</strong> on <code>mani-oils</code>.
                      </div>
                    </div>
                  )}

                  {!editingProduct ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <h4 style={{ fontSize: "1.1rem", color: "#09331d" }}>
                          Manage Product Catalog
                        </h4>
                        <button
                          type="button"
                          className="btn-primary-glow"
                          onClick={openNewProductForm}
                          style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                        >
                          <Plus size={16} />
                          Add New Product
                        </button>
                      </div>

                      {products.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "3.5rem 1.5rem",
                            background: "#faf8f4",
                            borderRadius: "12px",
                            border: "2px dashed #d6cebf",
                            margin: "1rem 0",
                          }}
                        >
                          <div
                            style={{
                              width: "56px",
                              height: "56px",
                              borderRadius: "50%",
                              background: "#f0eae0",
                              color: "#124e2c",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 1rem",
                            }}
                          >
                            <Package size={28} />
                          </div>
                          <h4 style={{ fontSize: "1.1rem", color: "#09331d", fontWeight: "700", marginBottom: "0.35rem" }}>
                            No products added yet. Click Add New Product to get started.
                          </h4>
                          <p style={{ color: "#57655d", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                            Add your authentic cooking oils with custom pack sizes, pricing, and uploaded photos.
                          </p>
                          <button
                            type="button"
                            className="btn-primary-glow"
                            onClick={openNewProductForm}
                            style={{ padding: "0.6rem 1.35rem", fontSize: "0.9rem" }}
                          >
                            <Plus size={16} />
                            Add New Product
                          </button>
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Product Photo & Name</th>
                                <th>Oil Extraction Type</th>
                                <th>Pack Sizes & Rates</th>
                                <th>Stock Status</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {products.map((p) => {
                                return (
                                  <tr key={p.id}>
                                    <td>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                        <img
                                          src={p.image}
                                          alt={p.name}
                                          style={{
                                            width: "48px",
                                            height: "48px",
                                            borderRadius: "6px",
                                            objectFit: "cover",
                                            border: "1px solid #d4af37",
                                            background: "#f8f5ee",
                                          }}
                                        />
                                        <div>
                                          <strong style={{ display: "block", color: "#09331d" }}>
                                            {p.name}
                                          </strong>
                                          {p.regionalName && (
                                            <small style={{ color: "#8c6819", display: "block" }}>{p.regionalName}</small>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td>
                                      <small>{p.oilType || "Wood-Pressed Cold Extracted"}</small>
                                    </td>
                                    <td>
                                      {p.variants?.map((v, vIdx) => (
                                        <div key={v.id || vIdx} style={{ fontSize: "0.78rem" }}>
                                          <strong>{v.size}</strong>: ₹{v.price} ({v.stock} in stock{v.unit ? `, ${v.unit}` : ""})
                                        </div>
                                      ))}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className={`badge-stock ${p.inStock ? "in" : "out"}`}
                                        onClick={() => updateProduct(p.id, { inStock: !p.inStock })}
                                        title="Click to toggle in/out of stock"
                                      >
                                        {p.inStock ? "In Stock" : "Out of Stock"}
                                      </button>
                                    </td>
                                    <td>
                                      <div style={{ display: "flex", gap: "0.4rem" }}>
                                        <button
                                          type="button"
                                          onClick={() => openEditProductForm(p)}
                                          style={{ padding: "4px", color: "#124e2c" }}
                                          title="Edit Product"
                                        >
                                          <Edit2 size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (window.confirm(`Are you sure you want to permanently delete "${p.name}" across all devices?`)) {
                                              try {
                                                await deleteProduct(p.id);
                                              } catch (err) {
                                                alert(err.message || "Failed to delete product from database.");
                                              }
                                            }
                                          }}
                                          style={{ padding: "4px", color: "#dc2626" }}
                                          title="Delete Product"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Add / Edit Product Form */
                    <form onSubmit={saveProductForm}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1.25rem",
                        }}
                      >
                        <h4 style={{ fontSize: "1.1rem", color: "#09331d" }}>
                          {editingProduct === "new" ? "Add New Oil Product" : "Edit Product Details"}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          style={{
                            color: "#57655d",
                            fontSize: "0.85rem",
                            textDecoration: "underline",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          Back to Product List
                        </button>
                      </div>

                      {formError && (
                        <div
                          style={{
                            padding: "0.75rem 1rem",
                            background: "#fef2f2",
                            border: "1px solid #f87171",
                            borderRadius: "8px",
                            color: "#991b1b",
                            fontSize: "0.88rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "1rem",
                          }}
                        >
                          <AlertCircle size={18} style={{ flexShrink: 0 }} />
                          <span>{formError}</span>
                        </div>
                      )}

                      {/* Product Name (English) and Regional / Tamil Name */}
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Product Name (English) *</label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={(e) => {
                              setProductForm({ ...productForm, name: e.target.value });
                              if (formError) setFormError("");
                            }}
                            placeholder="e.g. Wood-Pressed Groundnut Oil"
                          />
                        </div>

                        <div className="form-group">
                          <label>Regional / Tamil Name</label>
                          <input
                            type="text"
                            value={productForm.regionalName}
                            onChange={(e) => setProductForm({ ...productForm, regionalName: e.target.value })}
                            placeholder="e.g. மரச்செக்கு கடலை எண்ணெய்"
                          />
                        </div>
                      </div>

                      {/* Oil Extraction Type */}
                      <div className="form-group">
                        <label>Oil Extraction Type</label>
                        <input
                          type="text"
                          value={productForm.oilType}
                          onChange={(e) => setProductForm({ ...productForm, oilType: e.target.value })}
                          placeholder="e.g. Mara Chekku Cold-Pressed / Wood Pestle Churned"
                        />
                      </div>

                      {/* Upload Product Photo */}
                      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "700", color: "#09331d" }}>
                          Upload Product Photo <span style={{ color: "#dc2626" }}>*</span>
                        </label>

                        {/* Hidden native file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                          id="product-photo-upload-input"
                        />

                        {/* Image Preview or Choose File Dropzone */}
                        {productForm.image ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "1.25rem",
                              padding: "1rem",
                              background: "#f9f7f2",
                              borderRadius: "10px",
                              border: "1px solid #d4af37",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                width: "96px",
                                height: "96px",
                                borderRadius: "8px",
                                overflow: "hidden",
                                border: "2px solid #124e2c",
                                flexShrink: 0,
                                background: "#ffffff",
                              }}
                            >
                              <img
                                src={productForm.image}
                                alt="Product Preview"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>

                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#124e2c", fontWeight: "700", fontSize: "0.9rem" }}>
                                <CheckCircle size={16} color="#16a34a" />
                                Photo Ready
                              </div>
                              <div style={{ fontSize: "0.8rem", color: "#57655d", marginTop: "2px" }}>
                                {productForm.imageFileName || "Stored persistently with product record"}
                              </div>

                              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.6rem" }}>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  disabled={isProcessingImage}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.4rem 0.8rem",
                                    fontSize: "0.82rem",
                                    background: "#ffffff",
                                    border: "1px solid #124e2c",
                                    color: "#124e2c",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                  }}
                                >
                                  <Upload size={14} />
                                  Change Photo
                                </button>
                                <button
                                  type="button"
                                  onClick={handleRemovePhoto}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.4rem 0.8rem",
                                    fontSize: "0.82rem",
                                    background: "#fee2e2",
                                    border: "1px solid #f87171",
                                    color: "#b91c1c",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600",
                                  }}
                                >
                                  <Trash2 size={14} />
                                  Remove Photo
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "2rem 1.5rem",
                              background: "#faf8f4",
                              border: imageError ? "2px dashed #dc2626" : "2px dashed #c69222",
                              borderRadius: "10px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              textAlign: "center",
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "50%",
                                background: "rgba(212, 175, 55, 0.15)",
                                color: "#124e2c",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "0.6rem",
                              }}
                            >
                              <Upload size={22} />
                            </div>

                            <button
                              type="button"
                              style={{
                                padding: "0.45rem 1.15rem",
                                background: "linear-gradient(135deg, #124e2c, #09331d)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.88rem",
                                fontWeight: "600",
                                cursor: "pointer",
                                marginBottom: "0.4rem",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                            >
                              Choose File
                            </button>

                            <span style={{ fontSize: "0.82rem", color: "#57655d" }}>
                              Accepts <strong>JPG, JPEG, PNG, or WEBP</strong> (Max 5 MB)
                            </span>
                            {isProcessingImage && (
                              <span style={{ fontSize: "0.82rem", color: "#124e2c", marginTop: "0.4rem", fontWeight: "600" }}>
                                Optimizing photo...
                              </span>
                            )}
                          </div>
                        )}

                        {imageError && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#dc2626", fontSize: "0.82rem", marginTop: "0.4rem" }}>
                            <AlertCircle size={15} />
                            <span>{imageError}</span>
                          </div>
                        )}
                      </div>

                      {/* Pack Sizes & Pricing Configuration */}
                      <div style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <label style={{ fontWeight: "700", color: "#09331d" }}>
                            Pack Sizes, Prices (₹), Stock Levels & Packaging: <span style={{ color: "#dc2626" }}>*</span>
                          </label>
                          <button
                            type="button"
                            onClick={addVariantRow}
                            style={{
                              fontSize: "0.82rem",
                              color: "#124e2c",
                              fontWeight: "700",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            + Add Another Pack Size
                          </button>
                        </div>

                        {productForm.variants.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.3fr 1fr 1fr 1fr 40px",
                              gap: "0.5rem",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <input
                              type="text"
                              value={v.size}
                              onChange={(e) => updateVariantInForm(idx, "size", e.target.value)}
                              placeholder="Size (e.g. 500 ml, 1 Litre, 5 Litre Can)"
                              required
                            />
                            <input
                              type="number"
                              min="1"
                              value={v.price}
                              onChange={(e) => updateVariantInForm(idx, "price", e.target.value)}
                              placeholder="Price in ₹"
                              required
                            />
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) => updateVariantInForm(idx, "stock", e.target.value)}
                              placeholder="Stock Qty"
                              required
                            />
                            <input
                              type="text"
                              value={v.unit || "Bottle"}
                              onChange={(e) => updateVariantInForm(idx, "unit", e.target.value)}
                              placeholder="Bottle / Pouch / Tin Can"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantRow(idx)}
                              style={{
                                color: "#dc2626",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              title="Remove this pack size"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
                        <button
                          type="submit"
                          className="btn-primary-glow"
                          disabled={isSavingProduct}
                          style={{
                            opacity: isSavingProduct ? 0.7 : 1,
                            cursor: isSavingProduct ? "not-allowed" : "pointer",
                          }}
                        >
                          <Save size={16} />
                          {isSavingProduct ? "Saving to Central Database..." : "Save Product"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-outline"
                          onClick={() => setEditingProduct(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 2: CATEGORIES */}
              {activeTab === "categories" && (
                <div>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#09331d" }}>
                    Shop Categories
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {categories.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.85rem 1rem",
                          background: "#fbf8f1",
                          borderRadius: "8px",
                          border: "1px solid #e8e0d2",
                        }}
                      >
                        <div>
                          <strong>{c.name}</strong>
                          {c.regionalName && (
                            <span style={{ marginLeft: "0.5rem", color: "#8c6819" }}>
                              ({c.regionalName})
                            </span>
                          )}
                        </div>

                        {c.id !== "all" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete category ${c.name}?`)) {
                                deleteCategory(c.id);
                              }
                            }}
                            style={{ color: "#dc2626", padding: "4px" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: SHOP & WHATSAPP SETTINGS */}
              {activeTab === "settings" && (
                <form onSubmit={saveSettings}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h4 style={{ fontSize: "1.1rem", margin: 0, color: "#09331d" }}>
                      Shop Information & WhatsApp Integration Settings
                    </h4>
                    <span style={{ fontSize: "0.78rem", color: "#57655d" }}>
                      Central Database Persistence: Active
                    </span>
                  </div>

                  {settingsError && (
                    <div
                      style={{
                        background: "#fef2f2",
                        border: "1.5px solid #f87171",
                        borderRadius: "8px",
                        padding: "0.85rem 1rem",
                        marginBottom: "1.25rem",
                        color: "#991b1b",
                        fontSize: "0.86rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
                      <span>{settingsError}</span>
                    </div>
                  )}

                  {settingsSuccess && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        borderRadius: "8px",
                        padding: "0.85rem 1rem",
                        marginBottom: "1.25rem",
                        color: "#166534",
                        fontSize: "0.86rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0 }} />
                      <span>{settingsSuccess}</span>
                    </div>
                  )}

                  {/* Dedicated Admin WhatsApp Recipient Section */}
                  <div
                    style={{
                      background: "#fbfaf5",
                      border: "1.5px solid #c69222",
                      borderRadius: "10px",
                      padding: "1.25rem",
                      marginBottom: "1.5rem",
                      boxShadow: "0 2px 10px rgba(198, 146, 34, 0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.6rem",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.3rem" }}>📱</span>
                        <strong style={{ fontSize: "1rem", color: "#09331d" }}>
                          Shop WhatsApp Recipient Number (For Customer Orders & Photo Bills) *
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: "700",
                          padding: "0.2rem 0.65rem",
                          borderRadius: "9999px",
                          background: String(localPhone).replace(/\D/g, "").length >= 10 ? "#16a34a" : "#dc2626",
                          color: "#ffffff",
                        }}
                      >
                        {String(localPhone).replace(/\D/g, "").length >= 10 ? "✓ Configured & Active" : "⚠️ Needs Valid Number"}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "#57655d", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                      When a customer clicks <strong>"Send Order on WhatsApp"</strong>, the website generates an official high-resolution <strong>bill photo</strong> and directs the WhatsApp chat straight to this number. Default country code is <strong>+91 (India)</strong>.
                    </p>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Country Code (Default: +91 India) *</label>
                        <select
                          value={countryCode}
                          onChange={(e) => {
                            setCountryCode(e.target.value);
                            setSettingsError("");
                          }}
                          style={{
                            width: "100%",
                            padding: "0.65rem",
                            borderRadius: "6px",
                            border: "1.5px solid #d1d5db",
                            background: "#ffffff",
                            fontSize: "0.9rem",
                            fontWeight: "500",
                          }}
                        >
                          <option value="+91">+91 — India (Default)</option>
                          <option value="+1">+1 — USA / Canada</option>
                          <option value="+44">+44 — United Kingdom</option>
                          <option value="+971">+971 — United Arab Emirates</option>
                          <option value="+65">+65 — Singapore</option>
                          <option value="+60">+60 — Malaysia</option>
                          <option value="+966">+966 — Saudi Arabia</option>
                          <option value="+94">+94 — Sri Lanka</option>
                          <option value="+61">+61 — Australia</option>
                          <option value="custom">Custom Country Code...</option>
                        </select>
                        {countryCode === "custom" && (
                          <input
                            type="text"
                            placeholder="e.g. +974"
                            value={customCountryCode}
                            onChange={(e) => setCustomCountryCode(e.target.value)}
                            style={{ marginTop: "0.5rem" }}
                          />
                        )}
                      </div>

                      <div className="form-group">
                        <label>Shop WhatsApp Mobile Number (10 Digits) *</label>
                        <input
                          type="tel"
                          placeholder="e.g. 6385755368"
                          maxLength={12}
                          value={localPhone}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            setLocalPhone(digits);
                            setSettingsError("");
                          }}
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            letterSpacing: "0.5px",
                            borderColor:
                              String(localPhone).replace(/\D/g, "").length >= 10
                                ? "#16a34a"
                                : String(localPhone).replace(/\D/g, "").length > 0
                                ? "#f59e0b"
                                : "#d1d5db",
                          }}
                        />
                        <small
                          style={{
                            fontSize: "0.74rem",
                            color:
                              String(localPhone).replace(/\D/g, "").length >= 10 ? "#16a34a" : "#64748b",
                          }}
                        >
                          {String(localPhone).replace(/\D/g, "").length >= 10
                            ? `✓ Valid mobile number (${String(localPhone).replace(/\D/g, "").length} digits)`
                            : String(localPhone).replace(/\D/g, "").length > 0
                            ? `Entered ${String(localPhone).replace(/\D/g, "").length} of 10 required digits`
                            : "Enter the store owner's 10-digit mobile number"}
                        </small>
                      </div>
                    </div>

                    {/* Live WhatsApp Destination Preview */}
                    <div
                      style={{
                        marginTop: "0.85rem",
                        padding: "0.75rem 1rem",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border: "1.5px dashed #c69222",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.76rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                          Confirmed WhatsApp Order Recipient
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: "700", color: "#09331d" }}>
                          +{(countryCode === "custom" ? customCountryCode : countryCode).replace(/\D/g, "") || "91"}{" "}
                          {String(localPhone).replace(/\D/g, "") || "__________"}
                        </div>
                      </div>

                      <div style={{ fontSize: "0.78rem", color: "#57655d", textAlign: "right" }}>
                        <div>wa.me link destination:</div>
                        <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", color: "#09331d" }}>
                          wa.me/{((countryCode === "custom" ? customCountryCode : countryCode).replace(/\D/g, "") || "91") + String(localPhone).replace(/\D/g, "")}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Shop Name (English)</label>
                      <input
                        type="text"
                        value={settingsForm.shopName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Shop Name (Tamil / தமிழ் பெயர்)</label>
                      <input
                        type="text"
                        value={settingsForm.shopNameTamil || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, shopNameTamil: e.target.value })}
                        placeholder="e.g. பூமணி செக்கு எண்ணெய்"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Shop Tagline (English)</label>
                      <input
                        type="text"
                        value={settingsForm.tagline}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Shop Tagline (Tamil / தமிழ் விவரம்)</label>
                      <input
                        type="text"
                        value={settingsForm.taglineTamil || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, taglineTamil: e.target.value })}
                        placeholder="e.g. பாரம்பரிய மரச்செக்கு எண்ணெய்"
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Phone Number Display Label (For Header / Footer)</label>
                      <input
                        type="text"
                        value={settingsForm.phoneDisplay || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phoneDisplay: e.target.value })}
                        placeholder="e.g. +91 63857 55368"
                      />
                      <small style={{ fontSize: "0.72rem", color: "#57655d" }}>
                        Formatted phone text shown in website header and footer.
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Admin Security PIN</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={settingsForm.adminPin}
                        onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Shop Address (Physical Mill / Store)</label>
                      <textarea
                        rows={2}
                        value={settingsForm.address}
                        onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>FSSAI License Number</label>
                      <input
                        type="text"
                        value={settingsForm.fssaiNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, fssaiNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Official Meta WhatsApp Business Platform (Cloud API) Section */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: "10px",
                      padding: "1.25rem",
                      marginTop: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>💬</span>
                        <strong style={{ color: "#166534", fontSize: "0.95rem" }}>
                          Official Meta WhatsApp Business Cloud API (Optional Automatic Bill Image Dispatch)
                        </strong>
                      </div>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: "700",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "9999px",
                          background: settingsForm.whatsappCloudApiEnabled ? "#16a34a" : "#94a3b8",
                          color: "#ffffff",
                        }}
                      >
                        {settingsForm.whatsappCloudApiEnabled ? "Enabled" : "Disabled (Assisted Mode)"}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "#1e3a29", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
                      When enabled and configured with Meta Graph API credentials, the server can dispatch the bill image directly to the customer's WhatsApp number. When disabled, the site uses standard client-assisted click-to-chat with automatic download and attachment guidance.
                    </p>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.86rem", fontWeight: "600", color: "#166534" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(settingsForm.whatsappCloudApiEnabled)}
                          onChange={(e) => setSettingsForm({ ...settingsForm, whatsappCloudApiEnabled: e.target.checked })}
                          style={{ width: "auto" }}
                        />
                        Enable Meta WhatsApp Business Cloud API Integration
                      </label>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Meta Phone Number ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 104829104829104"
                          value={settingsForm.whatsappPhoneNumberId || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, whatsappPhoneNumberId: e.target.value })}
                        />
                        <small style={{ fontSize: "0.72rem", color: "#57655d" }}>
                          From Meta Developer Console &gt; WhatsApp &gt; API Setup
                        </small>
                      </div>

                      <div className="form-group">
                        <label>WhatsApp Business Account ID (WABA ID)</label>
                        <input
                          type="text"
                          placeholder="e.g. 192837465019283"
                          value={settingsForm.whatsappWabaId || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, whatsappWabaId: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <label style={{ margin: 0 }}>Permanent System User Access Token</label>
                        {adminWhatsAppConfig?.hasToken && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "#f0fdf4",
                              color: "#166534",
                              border: "1px solid #86efac",
                              borderRadius: "4px",
                              padding: "2px 8px",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                            }}
                          >
                            <CheckCircle size={12} color="#16a34a" /> Token Saved in Server Database (Preview: {adminWhatsAppConfig.tokenMasked})
                          </span>
                        )}
                      </div>
                      <input
                        type="password"
                        placeholder={
                          adminWhatsAppConfig?.hasToken
                            ? "•••••••••••••••• (Leave blank to preserve existing saved token, or paste new token to update)"
                            : "EAA..."
                        }
                        value={settingsForm.whatsappCloudApiToken || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappCloudApiToken: e.target.value })}
                      />
                      <small style={{ fontSize: "0.72rem", color: "#57655d" }}>
                        🔒 Securely stored in backend database. Never exposed to customer browser bundles.
                      </small>
                    </div>

                    {/* Test WhatsApp Cloud API Connection Buttons */}
                    <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={handleTestWhatsAppApi}
                        disabled={isTestingApi || !settingsForm.whatsappPhoneNumberId}
                        style={{
                          background: "#09331d",
                          color: "#deb869",
                          border: "1.5px solid #d4af37",
                          padding: "0.5rem 1rem",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          cursor: isTestingApi || !settingsForm.whatsappPhoneNumberId ? "not-allowed" : "pointer",
                          opacity: isTestingApi || !settingsForm.whatsappPhoneNumberId ? 0.6 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                        }}
                      >
                        <RefreshCw size={14} className={isTestingApi ? "spin-icon" : ""} />
                        <span>{isTestingApi ? "Verifying with Meta..." : "1. Test Meta Credentials"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendTestPing}
                        disabled={isTestingPing || !settingsForm.whatsappPhoneNumberId}
                        style={{
                          background: "#166534",
                          color: "#ffffff",
                          border: "1.5px solid #22c55e",
                          padding: "0.5rem 1rem",
                          borderRadius: "6px",
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          cursor: isTestingPing || !settingsForm.whatsappPhoneNumberId ? "not-allowed" : "pointer",
                          opacity: isTestingPing || !settingsForm.whatsappPhoneNumberId ? 0.6 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          boxShadow: "0 2px 4px rgba(22, 101, 52, 0.2)",
                        }}
                      >
                        <Send size={14} className={isTestingPing ? "spin-icon" : ""} />
                        <span>{isTestingPing ? "Sending Test Ping..." : `2. Send Test Ping to Shop Owner (+${localPhone || "6385755368"})`}</span>
                      </button>
                    </div>

                    {testApiResult && (
                      <div
                        style={{
                          marginTop: "0.85rem",
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                          fontSize: "0.84rem",
                          background: testApiResult.success ? "#f0fdf4" : "#fef2f2",
                          border: `1.5px solid ${testApiResult.success ? "#86efac" : "#fca5a5"}`,
                          color: testApiResult.success ? "#166534" : "#991b1b",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                        }}
                      >
                        {testApiResult.success ? (
                          <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                        ) : (
                          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                        )}
                        <div>
                          <strong>{testApiResult.success ? "Meta API Verification Successful:" : "Meta API Verification Failed:"}</strong>
                          <div style={{ marginTop: "2px", lineHeight: "1.4" }}>
                            {testApiResult.message || testApiResult.error}
                          </div>
                        </div>
                      </div>
                    )}

                    {testPingResult && (
                      <div
                        style={{
                          marginTop: "0.85rem",
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                          fontSize: "0.84rem",
                          background: testPingResult.success ? "#f0fdf4" : "#fef2f2",
                          border: `1.5px solid ${testPingResult.success ? "#86efac" : "#fca5a5"}`,
                          color: testPingResult.success ? "#166534" : "#991b1b",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                        }}
                      >
                        {testPingResult.success ? (
                          <CheckCircle size={18} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
                        ) : (
                          <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
                        )}
                        <div>
                          <strong>{testPingResult.success ? "Test WhatsApp Message Delivered:" : "Test WhatsApp Message Failed:"}</strong>
                          <div style={{ marginTop: "2px", lineHeight: "1.4" }}>
                            {testPingResult.message || testPingResult.error}
                          </div>
                          {testPingResult.metaDetails?.code && (
                            <div style={{ marginTop: "4px", fontSize: "0.78rem", background: "#fee2e2", padding: "3px 6px", borderRadius: "4px" }}>
                              Meta Error Code: <strong>{testPingResult.metaDetails.code}</strong> {testPingResult.metaDetails.error_subcode && `(Subcode: ${testPingResult.metaDetails.error_subcode})`}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Meta WhatsApp Cloud API Setup & Troubleshooting Guide */}
                    <div
                      style={{
                        marginTop: "1rem",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "0.85rem 1rem",
                        fontSize: "0.78rem",
                        color: "#334155",
                        lineHeight: "1.5",
                      }}
                    >
                      <strong style={{ color: "#0f172a", display: "block", marginBottom: "0.4rem" }}>
                        📘 Meta Developer Console Setup Checklist:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                        <li>
                          <strong>Phone Number ID:</strong> Meta Developer Console &gt; WhatsApp &gt; API Setup &gt; "Phone number ID".
                        </li>
                        <li>
                          <strong>Access Token:</strong> Generate a permanent token under Meta Business Manager &gt; Settings &gt; Users &gt; System Users with <code>whatsapp_business_messaging</code> permission.
                        </li>
                        <li>
                          <strong>Error Code 131030 (Recipient not registered):</strong> If your Meta App is in Development mode, you must add the shop recipient number (+{localPhone || "6385755368"}) to the <em>"Manage phone number list"</em> under WhatsApp &gt; API Setup.
                        </li>
                        <li>
                          <strong>Error Code 190 (Token expired):</strong> Temporary test tokens expire after 24 hours. Generate a permanent System User token to keep sending uninterrupted.
                        </li>
                      </ul>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary-glow" style={{ marginTop: "1rem" }}>
                    <Save size={16} />
                    Save Shop & WhatsApp Settings
                  </button>
                </form>
              )}

              {/* TAB 4: ORDERS HISTORY */}
              {activeTab === "orders" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ fontSize: "1.1rem", color: "#09331d" }}>
                      Generated WhatsApp Orders History
                    </h4>
                    <span style={{ fontSize: "0.82rem", color: "#57655d" }}>
                      Total: {orders.length} orders recorded
                    </span>
                  </div>

                  {orders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#57655d" }}>
                      No orders placed yet. Orders initiated by customers will automatically appear here!
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order No</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total (₹)</th>
                            <th>WhatsApp Delivery</th>
                            <th>Status</th>
                            <th>Bill</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((ord) => (
                            <tr key={ord.orderNumber}>
                              <td>
                                <strong>{ord.orderNumber}</strong>
                              </td>
                              <td>
                                <small>{ord.date}</small>
                              </td>
                              <td>
                                <div><strong>{ord.customerName}</strong></div>
                                <small style={{ color: "#8c6819" }}>{ord.customerPhone}</small>
                                {(ord.customerAddress || ord.address || ord.deliveryAddress) && (
                                  <div style={{ fontSize: "0.74rem", color: "#57655d", marginTop: "2px", maxWidth: "220px", lineHeight: "1.25" }}>
                                    {ord.customerAddress || ord.address || ord.deliveryAddress}
                                  </div>
                                )}
                              </td>
                              <td>
                                <small>
                                  {ord.items?.map((it) => `${it.name} (${it.quantity})`).join(", ")}
                                </small>
                              </td>
                              <td>
                                <strong>₹{formatINR(ord.grandTotal)}</strong>
                              </td>
                              <td>
                                {ord.whatsappStatus === "delivered" ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      background: "#f0fdf4",
                                      color: "#166534",
                                      border: "1px solid #86efac",
                                      borderRadius: "12px",
                                      padding: "2px 8px",
                                      fontSize: "0.72rem",
                                      fontWeight: "700",
                                    }}
                                    title={`Delivered via Meta Cloud API. Message ID: ${ord.whatsappMessageId || "Confirmed"}`}
                                  >
                                    <CheckCircle size={11} color="#16a34a" /> Cloud API Sent
                                  </span>
                                ) : ord.whatsappStatus === "failed" ? (
                                  <div>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        background: "#fef2f2",
                                        color: "#991b1b",
                                        border: "1px solid #fca5a5",
                                        borderRadius: "12px",
                                        padding: "2px 8px",
                                        fontSize: "0.72rem",
                                        fontWeight: "700",
                                      }}
                                      title={ord.whatsappError || "Dispatch failed"}
                                    >
                                      <AlertCircle size={11} color="#dc2626" /> Failed
                                    </span>
                                    {ord.whatsappError && (
                                      <div
                                        style={{
                                          fontSize: "0.68rem",
                                          color: "#b91c1c",
                                          maxWidth: "180px",
                                          marginTop: "3px",
                                          lineHeight: "1.2",
                                          whiteSpace: "normal",
                                        }}
                                      >
                                        {ord.whatsappError.slice(0, 80)}
                                        {ord.whatsappError.length > 80 ? "..." : ""}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      background: "#fefce8",
                                      color: "#854d0e",
                                      border: "1px solid #fde047",
                                      borderRadius: "12px",
                                      padding: "2px 8px",
                                      fontSize: "0.72rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {ord.whatsappStatus || "Pending"}
                                  </span>
                                )}
                              </td>
                              <td>
                                <select
                                  value={ord.status}
                                  onChange={(e) => updateOrderStatus(ord.orderNumber, e.target.value)}
                                  style={{ padding: "3px 6px", fontSize: "0.78rem", borderRadius: "4px" }}
                                >
                                  <option value="WhatsApp Message Pending">WhatsApp Message Pending</option>
                                  <option value="Order Initiated">Order Initiated</option>
                                  <option value="Order Confirmed">Order Confirmed</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Cancelled">Cancelled</option>
                                  {ord.status === "Dispatched" && <option value="Dispatched">Dispatched</option>}
                                  {ord.status === "Delivered" && <option value="Delivered">Delivered</option>}
                                </select>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setAdminViewingBill(ord)}
                                  style={{ color: "#124e2c", display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "0.8rem" }}
                                >
                                  <Eye size={14} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: BACKUP & RESTORE */}
              {activeTab === "backup" && (
                <div style={{ maxWidth: "560px" }}>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#09331d" }}>
                    Database Backup & Restore
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: "#57655d", marginBottom: "1.5rem" }}>
                    Export your complete product catalog, shop settings, and order records as a JSON backup, or restore previously exported store data.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ padding: "1rem", background: "#fbf8f1", borderRadius: "8px", border: "1px solid #e8e0d2" }}>
                      <strong style={{ display: "block", marginBottom: "4px" }}>Export Store Data</strong>
                      <small style={{ display: "block", color: "#57655d", marginBottom: "0.75rem" }}>
                        Download all current products, orders, coupons, and shop settings as a JSON file.
                      </small>
                      <button
                        type="button"
                        onClick={exportStoreData}
                        className="btn-secondary-outline"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      >
                        <Download size={15} /> Download Backup (JSON)
                      </button>
                    </div>

                    <div style={{ padding: "1rem", background: "#fbf8f1", borderRadius: "8px", border: "1px solid #e8e0d2" }}>
                      <strong style={{ display: "block", marginBottom: "4px" }}>Import Store Data</strong>
                      <small style={{ display: "block", color: "#57655d", marginBottom: "0.75rem" }}>
                        Restore from a previously exported JSON backup file.
                      </small>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              importStoreData(event.target.result);
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </div>

                    <div style={{ padding: "1rem", background: "#fef9ee", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                      <strong style={{ display: "block", marginBottom: "4px", color: "#9a3412" }}>
                        Reset Settings & Categories
                      </strong>
                      <small style={{ display: "block", color: "#57655d", marginBottom: "0.75rem" }}>
                        Restores default shop settings and category definitions without adding any demo products.
                      </small>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Reset shop settings and categories to factory defaults?")) {
                            resetToDefaultData();
                          }
                        }}
                        style={{
                          background: "#c2410c",
                          color: "#ffffff",
                          padding: "0.5rem 1rem",
                          borderRadius: "9999px",
                          fontWeight: "700",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        <RefreshCw size={15} /> Reset Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* View Bill Modal inside Admin */}
        {adminViewingBill && (
          <div className="modal-backdrop" onClick={() => setAdminViewingBill(null)}>
            <div className="bill-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="bill-modal-header">
                <h3>Bill Details: {adminViewingBill.orderNumber}</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setAdminViewingBill(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="bill-modal-body">
                <pre className="bill-receipt-paper">{adminViewingBill.billText}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
