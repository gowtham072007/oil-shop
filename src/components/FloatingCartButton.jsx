import React, { useState, useEffect, useRef } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { ShoppingCart, ArrowRight } from "lucide-react";

export const FloatingCartButton = () => {
  const { totalCartCount, cartSummary, setIsCartOpen, isCartOpen } = useShop();

  const [isPulsing, setIsPulsing] = useState(false);
  const prevCountRef = useRef(totalCartCount);

  // Trigger bounce animation whenever an item is added or quantity increases
  useEffect(() => {
    if (totalCartCount > prevCountRef.current && totalCartCount > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 700);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = totalCartCount;
  }, [totalCartCount]);

  // Only display floating button when cart has at least 1 item and cart drawer is not already open
  if (totalCartCount <= 0 || isCartOpen) {
    return null;
  }

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  return (
    <button
      id="floating-cart-button"
      type="button"
      onClick={handleOpenCart}
      className={`floating-cart-btn ${isPulsing ? "pulsing" : ""}`}
      aria-label={`View Shopping Cart: ${totalCartCount} ${
        totalCartCount === 1 ? "item" : "items"
      }, Total ₹${formatINR(cartSummary.grandTotal)}`}
      title="View your shopping cart"
    >
      <div className="floating-cart-icon-wrap">
        <ShoppingCart size={22} color="#deb869" className="floating-cart-icon" />
        <span className="floating-cart-badge">{totalCartCount}</span>
      </div>

      <div className="floating-cart-text-wrap">
        <span className="floating-cart-title">
          Cart ({totalCartCount} {totalCartCount === 1 ? "item" : "items"})
        </span>
        <span className="floating-cart-amount">
          ₹{formatINR(cartSummary.grandTotal)}
        </span>
      </div>

      <ArrowRight size={16} color="#deb869" className="floating-cart-arrow" />
    </button>
  );
};
