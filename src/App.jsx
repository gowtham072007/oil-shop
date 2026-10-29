import React, { useState } from "react";
import { ShopProvider, useShop } from "./context/ShopContext";
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { TrustSection } from "./components/TrustSection";
import { CategoryTabs } from "./components/CategoryTabs";
import { ProductCard } from "./components/ProductCard";
import { UnavailableOilCard } from "./components/UnavailableOilCard";
import { ProductModal } from "./components/ProductModal";
import { CartDrawer } from "./components/CartDrawer";
import { BillPreviewModal } from "./components/BillPreviewModal";
import { AdminModal } from "./components/AdminModal";
import { Footer } from "./components/Footer";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { filterCustomerProducts, PERMITTED_OILS } from "./utils/customerOilFilter";
import {
  MessageCircle,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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

  // Check which of the 3 permitted oils should be visible based on tab selection & search
  const visibleOilDefs = PERMITTED_OILS.filter((oil) => {
    if (selectedCategory !== "all" && selectedCategory !== oil.id) {
      return false;
    }
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchName = oil.name.toLowerCase().includes(query);
      const matchReg = oil.regionalName.toLowerCase().includes(query);
      const matchDesc = oil.description.toLowerCase().includes(query);
      const matchKeywords = oil.keywords.some((kw) => kw.includes(query));
      const hasMatchingProduct = sortedProducts.some((p) => p.customerOilId === oil.id);
      return matchName || matchReg || matchDesc || matchKeywords || hasMatchingProduct;
    }
    return true;
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
              Displaying <strong>{visibleOilDefs.length}</strong> {visibleOilDefs.length === 1 ? "oil category" : "oil categories"}
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

          {/* Products Grid: Render each permitted oil (actual product if configured, or unavailable notice) */}
          {visibleOilDefs.length === 0 ? (
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
                No oils found matching your search
              </h3>
              <p style={{ color: "#57655d", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                We specialize exclusively in three pure edible cooking oils: <strong>Coconut Oil (தேங்காய் எண்ணெய்)</strong>, <strong>Sesame Oil (நல்லெண்ணெய்)</strong>, and <strong>Groundnut Oil (கடலை எண்ணெய்)</strong>.
              </p>
              <button
                type="button"
                className="btn-primary-glow"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                View Our Three Pure Oils
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {visibleOilDefs.map((oilDef) => {
                // Check if the shop owner has configured real products for this oil
                const matchingProducts = sortedProducts.filter(
                  (p) => p.customerOilId === oilDef.id
                );

                if (matchingProducts.length > 0) {
                  return matchingProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ));
                }

                // If no product is configured in the database, show clean unavailable card (never invent fake prices or stock)
                return <UnavailableOilCard key={oilDef.id} oilDefinition={oilDef} />;
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
