import React, { useState } from "react";
import { ShopProvider, useShop } from "./context/ShopContext";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { TrustSection } from "./components/TrustSection";
import { CategoryTabs } from "./components/CategoryTabs";
import { ProductCard } from "./components/ProductCard";
import { ProductModal } from "./components/ProductModal";
import { CartDrawer } from "./components/CartDrawer";
import { BillPreviewModal } from "./components/BillPreviewModal";
import { AdminModal } from "./components/AdminModal";
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { filterCustomerProducts } from "./utils/customerOilFilter";
import {
  MessageCircle,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
  Palmtree,
  Sparkles,
  Nut,
} from "lucide-react";

const OIL_CATEGORY_SECTIONS = [
  {
    id: "coconut",
    name: "Coconut Oil",
    regionalName: "தேங்காய் எண்ணெய்",
    description: "100% Pure edible coconut oil with authentic natural aroma, perfect for wholesome cooking, traditional recipes, and wellness.",
    icon: Palmtree,
  },
  {
    id: "sesame",
    name: "Sesame Oil",
    regionalName: "நல்லெண்ணெய்",
    description: "Premium pure edible sesame (gingelly) oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.",
    icon: Sparkles,
  },
  {
    id: "groundnut",
    name: "Groundnut Oil",
    regionalName: "கடலை எண்ணெய்",
    description: "Pure edible groundnut (peanut) oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.",
    icon: Nut,
  },
];

// Main Shop Content Component
const ShopMain = () => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    shopSettings,
    notification,
  } = useShop();

  const [sortBy, setSortBy] = useState("default"); // 'default' | 'price-low' | 'price-high'

  // Filter public products strictly by permitted 3 oil types and search query
  const customerProducts = filterCustomerProducts(products, selectedCategory, searchQuery);

  // Sort customer products
  const sortedProducts = [...customerProducts].sort((a, b) => {
    const getBasePrice = (prod) =>
      prod.variants && prod.variants.length > 0
        ? prod.variants[0].price
        : prod.price || 0;

    if (sortBy === "price-low") {
      return getBasePrice(a) - getBasePrice(b);
    }
    if (sortBy === "price-high") {
      return getBasePrice(b) - getBasePrice(a);
    }
    return 0;
  });

  return (
    <div className="shop-app">
      {/* Header */}
      <Header />

      {/* Hero Banner featuring our 3 pure oils */}
      <HeroBanner />

      {/* 4 Pillars of Pure Edible Oils */}
      <TrustSection />

      {/* Product Catalog Section */}
      <main id="oil-catalog-section" className="catalog-section">
        <div className="container">
          {/* Section Header */}
          <div className="section-head">
            <div className="section-subtitle">100% Pure • Unrefined • Natural Goodness</div>
            <h2 className="section-title">Our Three Pure Edible Oils</h2>
            <p className="section-desc">
              Coconut Oil (தேங்காய் எண்ணெய்), Sesame Oil (நல்லெண்ணெய்), and Groundnut Oil (கடலை எண்ணெய்).
              Pure, wholesome, and authentic for everyday healthy cooking.
            </p>
          </div>

          {/* Category Tabs & Filter Controls */}
          <CategoryTabs />

          {/* Search Result or Sort Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.75rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div style={{ fontSize: "0.92rem", color: "#57655d" }}>
              Displaying <strong>{sortedProducts.length}</strong> {sortedProducts.length === 1 ? "product" : "products"}
              {searchQuery && (
                <span>
                  {" "}matching "<strong>{searchQuery}</strong>"
                </span>
              )}
            </div>

            {/* Sorting Dropdown (when configured products exist) */}
            {sortedProducts.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <SlidersHorizontal size={15} color="#8c6819" />
                <label htmlFor="sort-select" style={{ fontSize: "0.85rem", fontWeight: "600", color: "#1f2923" }}>
                  Sort By:
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "9999px",
                    border: "1px solid #e8e0d2",
                    background: "#ffffff",
                    fontSize: "0.85rem",
                    color: "#1f2923",
                    outline: "none",
                  }}
                >
                  <option value="default">Default Order</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            )}
          </div>

          {/* Products Grid: Render actual products, or clean empty message */}
          {sortedProducts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1.5rem",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e8e0d2",
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "#f4ede1",
                  color: "#8c6819",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <Search size={28} />
              </div>
              <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "#09331d" }}>
                {searchQuery
                  ? "No oils found matching your search"
                  : "No products listed in catalog yet"}
              </h3>
              <p style={{ color: "#57655d", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                {searchQuery
                  ? "We offer pure Coconut Oil (தேங்காய் எண்ணெய்), Sesame Oil (நல்லெண்ணெய்), and Groundnut Oil (கடலை எண்ணெய்). Try searching for these names or clear your search."
                  : "Fresh batches of pure Coconut Oil, Sesame Oil, and Groundnut Oil are prepared fresh at the mill. You can inquire directly with the mill via WhatsApp."}
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                {searchQuery && (
                  <button
                    type="button"
                    className="btn-secondary-outline"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                  >
                    Clear Search
                  </button>
                )}
                <a
                  href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
                    shopSettings.shopName
                  )}%2C%20I%20would%20like%20to%20inquire%20about%20pure%20edible%20cooking%20oils.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary-glow"
                  style={{ textDecoration: "none" }}
                >
                  💬 Inquire on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="catalog-category-sections">
              {OIL_CATEGORY_SECTIONS.filter((cat) => {
                if (selectedCategory !== "all" && selectedCategory !== cat.id) return false;
                return sortedProducts.some((p) => p.customerOilId === cat.id);
              }).map((cat) => {
                const catProducts = sortedProducts.filter((p) => p.customerOilId === cat.id);
                const IconComp = cat.icon;

                return (
                  <section
                    key={cat.id}
                    className="category-products-section"
                    id={`section-${cat.id}`}
                  >
                    {/* Category Section Header in English & Tamil */}
                    <div className="category-section-header">
                      <div className="category-header-info">
                        <span className="category-icon-bubble">
                          <IconComp size={22} />
                        </span>
                        <div>
                          <h3 className="category-section-title">
                            {cat.name}{" "}
                            <span className="category-tamil-title">/ {cat.regionalName}</span>
                          </h3>
                          <p className="category-section-desc">{cat.description}</p>
                        </div>
                      </div>
                      <span className="category-count-badge">
                        {catProducts.length} {catProducts.length === 1 ? "Product" : "Products"}
                      </span>
                    </div>

                    {/* Products Grid under this category */}
                    <div className="product-grid">
                      {catProducts.map((prod) => (
                        <ProductCard key={prod.id} product={prod} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Floating WhatsApp Action Button */}
      <a
        href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
          shopSettings.shopName
        )}%2C%20I%20would%20like%20to%20place%20an%20order%20for%20pure%20edible%20cooking%20oils.`}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-wa-btn"
        title="Direct WhatsApp with Oil Shop"
        aria-label="Direct WhatsApp with Oil Shop"
      >
        <MessageCircle size={28} />
      </a>

      {/* Modals & Slide-overs */}
      <CartDrawer />
      <BillPreviewModal />
      <ProductModal />
      <AdminModal />

      {/* Mobile Bottom Fixed Navigation */}
      <MobileBottomNav />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="toast-notification">
          {notification.type === "error" ? (
            <AlertCircle size={18} color="#f87171" />
          ) : (
            <CheckCircle2 size={18} color="#e5b94c" />
          )}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <ShopMain />
    </ShopProvider>
  );
}
