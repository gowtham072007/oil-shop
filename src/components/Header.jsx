import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import {
  Search,
  ShoppingCart,
  PhoneCall,
  ShieldCheck,
  X,
} from "lucide-react";

export const Header = () => {
  const {
    shopSettings,
    totalCartCount,
    setIsCartOpen,
    setIsAdminOpen,
    searchQuery,
    setSearchQuery,
  } = useShop();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="top-announcement">
        <span className="badge">Mara Chekku Purity</span>
        <span className="announcement-text">
          Stone & Wood-Churned Cold-Pressed Oils • FSSAI #{shopSettings.fssaiNumber || "12421008000421"} • Free delivery on orders above ₹{shopSettings.freeDeliveryThreshold}
        </span>
      </div>

      {/* Main Sticky Header */}
      <header className="main-header">
        <div className="container">
          <div className="header-inner">
            {/* Brand Logo & Name */}
            <div
              className="brand-logo-wrap"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              title="Return to top"
            >
              <div className="brand-icon-emblem">🪔</div>
              <div className="brand-text">
                <h1>
                  <span className="brand-name-en">{shopSettings.shopName}</span>
                  {shopSettings.shopNameTamil && (
                    <span className="brand-name-ta">
                      {shopSettings.shopNameTamil}
                    </span>
                  )}
                </h1>
                <div className="tagline">
                  <span className="tagline-en">{shopSettings.tagline}</span>
                  {shopSettings.taglineTamil && (
                    <span className="tagline-ta">
                      {shopSettings.taglineTamil}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Live Search Bar */}
            <div className="header-search">
              <Search className="search-icon" size={18} />
              <input
                id="search-input"
                type="text"
                placeholder="Search groundnut, sesame, coconut, pooja oil..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#85958c",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Header Actions */}
            <div className="header-actions">
              {/* Mobile Search Toggle Icon */}
              <button
                type="button"
                className="btn-mobile-search-toggle d-block-sm"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label="Toggle mobile search"
                title="Search oils"
              >
                {mobileSearchOpen ? <X size={20} /> : <Search size={20} />}
              </button>

              {/* WhatsApp Quick Link (Desktop/Tablet) */}
              <a
                href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
                  shopSettings.shopName
                )}%2C%20I%20have%20an%20inquiry%20about%20your%20cold%20pressed%20oils.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-pill d-none-sm"
                title="Chat with Shop on WhatsApp"
              >
                <PhoneCall size={16} />
                <span>WhatsApp</span>
              </a>

              {/* Admin Portal Toggle */}
              <button
                id="admin-portal-btn"
                className="btn-admin-pill"
                onClick={() => setIsAdminOpen(true)}
                title="Shop Owner Admin Area"
                aria-label="Admin Portal"
              >
                <ShieldCheck size={16} />
                <span className="d-none-sm">Admin</span>
              </button>

              {/* Cart Bubble */}
              <button
                id="cart-drawer-trigger-btn"
                className="btn-cart-bubble"
                onClick={() => setIsCartOpen(true)}
                title="View Shopping Cart"
                aria-label="Open Shopping Cart"
              >
                <ShoppingCart size={20} />
                {totalCartCount > 0 && (
                  <span className="cart-badge-count">{totalCartCount}</span>
                )}
              </button>
            </div>
          </div>

          {/* Expandable Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className="mobile-search-dropdown">
              <div className="mobile-search-input-wrap">
                <Search size={18} className="mobile-search-icon" />
                <input
                  type="text"
                  placeholder="Search groundnut, sesame, coconut..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mobile-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
