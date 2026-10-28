import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR, cleanWhatsAppNumber } from "../utils/billGenerator";
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
  ExternalLink,
  Eye,
  AlertCircle,
} from "lucide-react";

export const AdminModal = () => {
  const {
    isAdminOpen,
    setIsAdminOpen,
    isAdminAuthenticated,
    setIsAdminAuthenticated,
    shopSettings,
    updateShopSettings,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    categories,
    addCategory,
    deleteCategory,
    orders,
    updateOrderStatus,
    resetToDefaultData,
    exportStoreData,
    importStoreData,
    showNotification,
  } = useShop();

  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [activeTab, setActiveTab] = useState("products"); // 'products' | 'categories' | 'settings' | 'orders' | 'backup'

  // Product Form State (for Add / Edit)
  const [editingProduct, setEditingProduct] = useState(null); // null = table view, 'new' = new product, { ... } = editing
  const [productForm, setProductForm] = useState({
    name: "",
    regionalName: "",
    brand: "Poomani Oils",
    category: "groundnut",
    oilType: "Wood-Pressed Cold Extracted",
    image: "/images/groundnut_oil.jpg",
    description: "",
    inStock: true,
    featured: false,
    variants: [
      { id: "v-1", size: "500 ml", price: 150, stock: 30, unit: "Bottle" },
      { id: "v-2", size: "1 Litre", price: 290, stock: 50, unit: "Bottle" },
      { id: "v-3", size: "5 Litre Can", price: 1400, stock: 15, unit: "Tin Can" },
    ],
  });

  // Shop Settings Form State
  const [settingsForm, setSettingsForm] = useState({ ...shopSettings });

  // View Bill Modal within Admin
  const [adminViewingBill, setAdminViewingBill] = useState(null);

  if (!isAdminOpen) return null;

  // Handle PIN Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (enteredPin === (shopSettings.adminPin || "1234")) {
      setIsAdminAuthenticated(true);
      setPinError("");
      setEnteredPin("");
      showNotification("Admin authenticated successfully!");
    } else {
      setPinError("Incorrect PIN. Please enter the correct PIN (Default: 1234)");
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    showNotification("Logged out of Admin Portal", "info");
  };

  // Product Edit Handlers
  const openNewProductForm = () => {
    setProductForm({
      name: "",
      regionalName: "",
      brand: shopSettings.shopName || "Poomani Oils",
      category: categories[1]?.id || "groundnut",
      oilType: "Wood-Pressed Cold Extracted",
      image: "/images/groundnut_oil.jpg",
      description: "Authentic wood-pressed oil extracted at low temperature using traditional wooden pestles. Unrefined, unbleached, zero chemical solvents.",
      inStock: true,
      featured: false,
      variants: [
        { id: `v-${Date.now()}-1`, size: "500 ml", price: 160, stock: 30, unit: "Bottle" },
        { id: `v-${Date.now()}-2`, size: "1 Litre", price: 310, stock: 50, unit: "Bottle" },
        { id: `v-${Date.now()}-3`, size: "5 Litre Can", price: 1500, stock: 10, unit: "Tin Can" },
      ],
    });
    setEditingProduct("new");
  };

  const openEditProductForm = (product) => {
    setProductForm({
      ...product,
      variants: product.variants?.length
        ? product.variants
        : [{ id: "v-def", size: "1 Litre", price: product.price || 300, stock: 20, unit: "Bottle" }],
    });
    setEditingProduct(product.id);
  };

  const saveProductForm = (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Product name is required");
      return;
    }

    if (editingProduct === "new") {
      addProduct(productForm);
    } else {
      updateProduct(editingProduct, productForm);
    }
    setEditingProduct(null);
  };

  const updateVariantInForm = (index, field, value) => {
    const updated = [...productForm.variants];
    updated[index] = {
      ...updated[index],
      [field]: field === "price" || field === "stock" ? Number(value) || 0 : value,
    };
    setProductForm({ ...productForm, variants: updated });
  };

  const addVariantRow = () => {
    setProductForm({
      ...productForm,
      variants: [
        ...productForm.variants,
        { id: `v-${Date.now()}`, size: "2 Litre", price: 600, stock: 20, unit: "Bottle" },
      ],
    });
  };

  const removeVariantRow = (index) => {
    if (productForm.variants.length <= 1) {
      alert("At least one pack size variant is required");
      return;
    }
    setProductForm({
      ...productForm,
      variants: productForm.variants.filter((_, i) => i !== index),
    });
  };

  // Save Settings
  const saveSettings = (e) => {
    e.preventDefault();
    updateShopSettings(settingsForm);
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
          <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Settings size={20} color="#e5b94c" />
            Shop Owner Admin Area
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
              Enter the shop owner PIN to manage products, prices, stock, delivery charges, and orders.
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
                style={{ width: "100%", justifyContent: "center" }}
              >
                Unlock Admin Dashboard
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
                Data & Reset
              </button>
            </div>

            {/* Admin Tab Content */}
            <div className="admin-modal-content">
              {/* TAB 1: PRODUCTS */}
              {activeTab === "products" && (
                <div>
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

                      <div style={{ overflowX: "auto" }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Category</th>
                              <th>Oil Type</th>
                              <th>Pack Sizes & Prices</th>
                              <th>Stock Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.map((p) => {
                              const minPrice = p.variants?.length
                                ? Math.min(...p.variants.map((v) => v.price))
                                : p.price || 0;
                              return (
                                <tr key={p.id}>
                                  <td>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                      <img
                                        src={p.image}
                                        alt={p.name}
                                        style={{ width: "42px", height: "42px", borderRadius: "6px", objectFit: "cover" }}
                                      />
                                      <div>
                                        <strong style={{ display: "block", color: "#09331d" }}>
                                          {p.name}
                                        </strong>
                                        <small style={{ color: "#8c6819" }}>{p.regionalName || p.brand}</small>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span style={{ textTransform: "capitalize" }}>{p.category}</span>
                                  </td>
                                  <td>
                                    <small>{p.oilType}</small>
                                  </td>
                                  <td>
                                    {p.variants?.map((v) => (
                                      <div key={v.id} style={{ fontSize: "0.78rem" }}>
                                        {v.size}: ₹{v.price} ({v.stock} in stock)
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
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                            deleteProduct(p.id);
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
                          style={{ color: "#57655d", fontSize: "0.85rem", textDecoration: "underline" }}
                        >
                          Back to Product List
                        </button>
                      </div>

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Product Name (English) *</label>
                          <input
                            type="text"
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
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

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Category</label>
                          <select
                            value={productForm.category}
                            onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          >
                            {categories
                              .filter((c) => c.id !== "all")
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Oil Extraction Type</label>
                          <input
                            type="text"
                            value={productForm.oilType}
                            onChange={(e) => setProductForm({ ...productForm, oilType: e.target.value })}
                            placeholder="e.g. Mara Chekku Cold-Pressed"
                          />
                        </div>
                      </div>

                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Product Photo</label>
                          <select
                            value={productForm.image}
                            onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                          >
                            <option value="/images/groundnut_oil.jpg">Groundnut Oil (Kadala Ennai)</option>
                            <option value="/images/sesame_oil.jpg">Sesame / Gingelly Oil (Nalla Ennai)</option>
                            <option value="/images/coconut_oil.jpg">Virgin Coconut Oil (Thengai Ennai)</option>
                            <option value="/images/mustard_oil.jpg">Kachi Ghani Mustard Oil</option>
                            <option value="/images/sunflower_oil.jpg">Cold Pressed Sunflower Oil</option>
                            <option value="/images/deepam_oil.jpg">Pancha Deepam Pooja Oil</option>
                            <option value="/images/hero_banner.jpg">Oil Mill Collection</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Or Custom Image URL</label>
                          <input
                            type="text"
                            value={productForm.image}
                            onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                            placeholder="https://... or /images/..."
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Product Description</label>
                        <textarea
                          rows={2}
                          value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        />
                      </div>

                      {/* Pack Sizes & Pricing Configuration */}
                      <div style={{ marginTop: "1.25rem", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <label style={{ fontWeight: "700", color: "#09331d" }}>
                            Pack Sizes, Prices (₹) & Stock Levels:
                          </label>
                          <button
                            type="button"
                            onClick={addVariantRow}
                            style={{ fontSize: "0.82rem", color: "#124e2c", fontWeight: "700" }}
                          >
                            + Add Another Pack Size
                          </button>
                        </div>

                        {productForm.variants.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 1fr 1fr 1fr 40px",
                              gap: "0.5rem",
                              alignItems: "center",
                              marginBottom: "0.5rem",
                            }}
                          >
                            <input
                              type="text"
                              value={v.size}
                              onChange={(e) => updateVariantInForm(idx, "size", e.target.value)}
                              placeholder="Pack size (e.g. 1 Litre)"
                            />
                            <input
                              type="number"
                              value={v.price}
                              onChange={(e) => updateVariantInForm(idx, "price", e.target.value)}
                              placeholder="Price in ₹"
                            />
                            <input
                              type="number"
                              value={v.stock}
                              onChange={(e) => updateVariantInForm(idx, "stock", e.target.value)}
                              placeholder="Stock Qty"
                            />
                            <input
                              type="text"
                              value={v.unit || "Bottle"}
                              onChange={(e) => updateVariantInForm(idx, "unit", e.target.value)}
                              placeholder="Bottle / Can"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariantRow(idx)}
                              style={{ color: "#dc2626" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button type="submit" className="btn-primary-glow">
                          <Save size={16} />
                          Save Product
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
                          <div style={{ fontSize: "0.78rem", color: "#57655d" }}>
                            {c.description || "Category for traditional oils"}
                          </div>
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
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", color: "#09331d" }}>
                    Shop Information & WhatsApp Integration Settings
                  </h4>

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
                        placeholder="e.g. பூமணி ஆயில்ஸ்"
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
                      <label>WhatsApp Business Number (with country code, no + or spaces) *</label>
                      <input
                        type="text"
                        value={settingsForm.whatsappNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                        placeholder="e.g. 919876543210"
                      />
                      <small style={{ fontSize: "0.74rem", color: "#57655d" }}>
                        Format: Country Code + 10 Digits. Official wa.me URL will use this number.
                      </small>
                    </div>

                    <div className="form-group">
                      <label>Phone Number Display</label>
                      <input
                        type="text"
                        value={settingsForm.phoneDisplay}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phoneDisplay: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Shop Address (Physical Mill / Store)</label>
                    <textarea
                      rows={2}
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Standard Delivery Charge (₹)</label>
                      <input
                        type="number"
                        value={settingsForm.deliveryCharge}
                        onChange={(e) => setSettingsForm({ ...settingsForm, deliveryCharge: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Free Delivery Threshold (₹)</label>
                      <input
                        type="number"
                        value={settingsForm.freeDeliveryThreshold}
                        onChange={(e) => setSettingsForm({ ...settingsForm, freeDeliveryThreshold: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>FSSAI License Number</label>
                      <input
                        type="text"
                        value={settingsForm.fssaiNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, fssaiNumber: e.target.value })}
                      />
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
                                <div>{ord.customerName}</div>
                                <small style={{ color: "#8c6819" }}>{ord.customerPhone}</small>
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
                                <select
                                  value={ord.status}
                                  onChange={(e) => updateOrderStatus(ord.orderNumber, e.target.value)}
                                  style={{ padding: "3px 6px", fontSize: "0.78rem", borderRadius: "4px" }}
                                >
                                  <option value="WhatsApp Message Pending">WhatsApp Message Pending</option>
                                  <option value="Redirected to WhatsApp">Redirected to WhatsApp</option>
                                  <option value="Order Confirmed">Order Confirmed</option>
                                  <option value="Dispatched">Dispatched</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
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

              {/* TAB 5: BACKUP & DEMO RESET */}
              {activeTab === "backup" && (
                <div style={{ maxWidth: "560px" }}>
                  <h4 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "#09331d" }}>
                    Database Backup, Restore & Demo Reset
                  </h4>
                  <p style={{ fontSize: "0.88rem", color: "#57655d", marginBottom: "1.5rem" }}>
                    Export your complete product catalog, shop settings, and order records as a JSON backup, or reset to original sample store data.
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

                    <div style={{ padding: "1rem", background: "#fff5f5", borderRadius: "8px", border: "1px solid #fecaca" }}>
                      <strong style={{ display: "block", marginBottom: "4px", color: "#991b1b" }}>
                        Reset Store to Demo Data
                      </strong>
                      <small style={{ display: "block", color: "#57655d", marginBottom: "0.75rem" }}>
                        Restores original sample products, images, categories, and settings.
                      </small>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Reset all products and categories to default demo data?")) {
                            resetToDefaultData();
                          }
                        }}
                        style={{
                          background: "#dc2626",
                          color: "#ffffff",
                          padding: "0.5rem 1rem",
                          borderRadius: "9999px",
                          fontWeight: "700",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <RefreshCw size={15} /> Reset Store
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
