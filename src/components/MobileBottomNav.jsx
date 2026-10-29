import React, { useEffect, useState } from "react";
import { useShop } from "../context/ShopContext";
import { Home, Droplets, ShoppingCart, MessageCircle } from "lucide-react";

export const MobileBottomNav = () => {
  const { totalCartCount, setIsCartOpen, shopSettings, isCartOpen } = useShop();
  const [activeTab, setActiveTab] = useState("home");

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const catalogEl = document.getElementById("oil-catalog-section");
      if (catalogEl) {
        const rect = catalogEl.getBoundingClientRect();
        if (rect.top <= 200 && rect.bottom >= 150) {
          setActiveTab("products");
          return;
        }
      }
      if (window.scrollY < 200) {
        setActiveTab("home");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHomeClick = () => {
    setActiveTab("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProductsClick = () => {
    setActiveTab("products");
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCartClick = () => {
    setActiveTab("cart");
    setIsCartOpen(true);
  };

  const waUrl = `https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
    shopSettings.shopName
  )}%2C%20I%20would%20like%20to%20inquire%20about%20ordering%20pure%20cooking%20oils.`;

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === "home" && !isCartOpen ? "active" : ""}`}
        onClick={handleHomeClick}
        aria-label="Go to Home"
      >
        <Home size={21} />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === "products" && !isCartOpen ? "active" : ""}`}
        onClick={handleProductsClick}
        aria-label="View Products"
      >
        <Droplets size={21} />
        <span>Products</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${isCartOpen ? "active" : ""}`}
        onClick={handleCartClick}
        aria-label={`View Cart with ${totalCartCount} items`}
      >
        <div className="bottom-nav-icon-wrap">
          <ShoppingCart size={21} />
          {totalCartCount > 0 && (
            <span className="bottom-nav-cart-badge">{totalCartCount}</span>
          )}
        </div>
        <span>Cart</span>
      </button>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bottom-nav-item whatsapp-nav-item"
        aria-label="Chat with mill on WhatsApp"
      >
        <MessageCircle size={21} />
        <span>WhatsApp</span>
      </a>
    </nav>
  );
};

