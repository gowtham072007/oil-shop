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
import {
  MessageCircle,
  Sparkles,
  SlidersHorizontal,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// Main Shop Content Component
const ShopMain = () => {
  const {
    products,
    selectedCategory,
    searchQuery,
    setSearchQuery,
    shopSettings,
    setIsCartOpen,
    notification,
    totalCartCount,
  } = useShop();

  const [sortBy, setSortBy] = useState("default"); // 'default' | 'price-low' | 'price-high' | 'rating'

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.regionalName && p.regionalName.toLowerCase().includes(query)) ||
      (p.brand && p.brand.toLowerCase().includes(query)) ||
      (p.oilType && p.oilType.toLowerCase().includes(query)) ||
      (p.description && p.description.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
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
    if (sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  return (
    <div className="shop-app">
      {/* Header */}
      <Header />

      {/* Hero Banner with Photography */}
      <HeroBanner />

      {/* 4 Pillars of Purity */}
      <TrustSection />

      {/* Product Catalog Section */}
      <main id="oil-catalog-section" className="catalog-section">
        <div className="container">
          {/* Section Header */}
          <div className="section-head">
            <div className="section-subtitle">Farm Fresh • Unrefined • Wood Churned</div>
            <h2 className="section-title">Authentic Cold-Pressed Oils</h2>
            <p className="section-desc">
              Extracted slowly at room temperature using traditional Vaagai wood mortars.
              Preserves authentic aroma, natural vitamins, and zero chemical residues.
            </p>
          </div>

          {/* Category Tabs */}
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
              Showing <strong>{sortedProducts.length}</strong> {sortedProducts.length === 1 ? "oil product" : "oil products"}
              {searchQuery && (
                <span>
                  {" "}matching "<strong>{searchQuery}</strong>"
                </span>
              )}
            </div>

            {/* Sorting Dropdown */}
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
                <option value="default">Featured Traditional</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {sortedProducts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e8e0d2",
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
              <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
                No oils found matching your search
              </h3>
              <p style={{ color: "#57655d", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                Try searching for groundnut, sesame, coconut, mustard, or pooja deepam oil.
              </p>
              <button
                type="button"
                className="btn-primary-glow"
                onClick={() => setSearchQuery("")}
              >
                View All Traditional Oils
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
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
        )}%2C%20I%20would%20like%20to%20place%20an%20order%20for%20cold%20pressed%20oils.`}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-wa-btn"
        title="Direct WhatsApp with Oil Mill"
        aria-label="Direct WhatsApp with Oil Mill"
      >
        <MessageCircle size={28} />
      </a>

      {/* Modals & Slide-overs */}
      <CartDrawer />
      <BillPreviewModal />
      <ProductModal />
      <AdminModal />

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
