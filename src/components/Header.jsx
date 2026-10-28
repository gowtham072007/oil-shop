import React from "react";
import { useShop } from "../context/ShopContext";
import {
  Search,
  ShoppingCart,
  PhoneCall,
  ShieldCheck,
  X,
  Sparkles,
} from "lucide-react";

export const Header = () => {
  const {
    shopSettings,
    cart,
    totalCartCount,
    setIsCartOpen,
    setIsAdminOpen,
    searchQuery,
    setSearchQuery,
  } = useShop();

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="top-announcement">
        <span className="badge">100% Traditional Mara Chekku</span>
        <span>
          🌾 Stone & Wood-Churned Cold-Pressed Oils • FSSAI Lic. #{shopSettings.fssaiNumber || "12421008000421"} • Free delivery on orders above ₹{shopSettings.freeDeliveryThreshold}
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
                <h1>{shopSettings.shopName}</h1>
                <div className="tagline">{shopSettings.tagline}</div>
              </div>
            </div>

            {/* Live Search Bar */}
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
                  }}
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="header-actions">
              {/* WhatsApp Quick Link */}
              <a
                href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
                  shopSettings.shopName
                )}%2C%20I%20have%20an%20inquiry%20about%20your%20cold%20pressed%20oils.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp-pill"
                title="Chat with Shop on WhatsApp"
              >
                <PhoneCall size={16} />
                <span className="d-none-sm">WhatsApp</span>
              </a>

              {/* Admin Portal Toggle */}
              <button
                id="admin-portal-btn"
                className="btn-admin-pill"
                onClick={() => setIsAdminOpen(true)}
                title="Shop Owner Admin Area"
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
              >
                <ShoppingCart size={20} />
                {totalCartCount > 0 && (
                  <span className="cart-badge-count">{totalCartCount}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
