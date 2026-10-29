import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Tag,
  Truck,
  Check,
  Send,
  AlertCircle,
  MapPin,
  User,
  Phone,
  FileText,
  CreditCard,
} from "lucide-react";

export const CartDrawer = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    shopSettings,
    cartSummary,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    couponError,
    initiateWhatsAppCheckout,
  } = useShop();

  // Coupon input state
  const [couponCodeInput, setCouponCodeInput] = useState("");

  // Customer form inputs
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    address: "",
    city: "Bengaluru",
    pincode: "",
    paymentMethod: "Cash on Delivery",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState({});

  if (!isCartOpen) return null;

  // Validate form before WhatsApp bill generation
  const validateAndProceed = (e) => {
    e.preventDefault();
    const errors = {};

    if (!customerDetails.name.trim()) {
      errors.name = "Customer Name is required";
    }

    const cleanDigits = customerDetails.phone.replace(/\D/g, "");
    if (!cleanDigits) {
      errors.phone = "Phone number is required";
    } else if (cleanDigits.length < 10) {
      errors.phone = "Enter valid 10-digit mobile number";
    }

    if (!customerDetails.address.trim()) {
      errors.address = "Complete delivery address is required";
    }

    if (!customerDetails.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(customerDetails.pincode.trim())) {
      errors.pincode = "Enter valid 6-digit PIN code";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      initiateWhatsAppCheckout(customerDetails);
    }
  };

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    const success = applyCoupon(couponCodeInput);
    if (success) setCouponCodeInput("");
  };

  const freeDeliveryThreshold = Number(shopSettings.freeDeliveryThreshold) || 999;
  const progressPercent = Math.min(100, Math.round((cartSummary.subtotal / freeDeliveryThreshold) * 100));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`drawer-backdrop ${isCartOpen ? "open" : ""}`}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Cart Drawer Panel */}
      <div className={`cart-drawer ${isCartOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="cart-drawer-header">
          <h3>
            <ShoppingBag size={20} />
            Your Shopping Cart ({cart.length} {cart.length === 1 ? "item" : "items"})
          </h3>
          <button
            type="button"
            className="btn-close"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer-body">
          {cart.length === 0 ? (
            <div className="cart-empty-view">
              <div className="cart-empty-icon">
                <ShoppingBag size={40} />
              </div>
              <h4>Your cart is empty</h4>
              <p>Explore our pure Coconut, Sesame, and Groundnut cooking oils.</p>
              <button
                type="button"
                className="btn-primary-glow"
                onClick={() => setIsCartOpen(false)}
              >
                Browse Pure Cooking Oils
              </button>
            </div>
          ) : (
            <>
              {/* Free Delivery Meter */}
              <div className="free-delivery-meter">
                <div className="meter-text">
                  <span>
                    <Truck size={15} style={{ display: "inline", marginRight: "4px" }} />
                    {cartSummary.isFreeDelivery
                      ? "🎉 You have qualified for FREE Home Delivery!"
                      : `Add ₹${formatINR(cartSummary.amountForFreeDelivery)} more for FREE Delivery!`}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="meter-bar">
                  <div
                    className="meter-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Cart Items List */}
              <div className="cart-items-list">
                {cart.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  return (
                    <div key={item.id} className="cart-item-card">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="cart-item-img"
                      />
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.name}</div>
                        <div className="cart-item-meta">
                          Pack: {item.selectedVariant?.size || "1 Litre"} • ₹{formatINR(item.price)} each
                        </div>

                        <div className="cart-item-controls">
                          {/* Quantity Stepper */}
                          <div className="qty-stepper">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="qty-val">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="cart-item-line-total">
                            ₹{formatINR(lineTotal)}
                          </div>

                          {/* Delete Item */}
                          <button
                            type="button"
                            className="btn-remove-item"
                            onClick={() => removeFromCart(item.id)}
                            title="Remove from cart"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Code Section */}
              <div className="coupon-box">
                {appliedCoupon ? (
                  <div className="coupon-active-badge">
                    <span>
                      <Tag size={14} style={{ display: "inline", marginRight: "5px" }} />
                      Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{formatINR(cartSummary.discount)})
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      style={{ color: "#dc2626", fontWeight: "700", fontSize: "0.8rem" }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="coupon-input-group">
                    <input
                      type="text"
                      placeholder="Enter promo code (e.g. WELCOME50)"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                    />
                    <button type="submit" className="btn-apply-coupon">
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <div className="form-error-msg" style={{ marginTop: "4px" }}>
                    {couponError}
                  </div>
                )}
              </div>

              {/* Customer Checkout Details Form */}
              <div className="checkout-details-section">
                <h4>
                  <MapPin size={18} color="#124e2c" />
                  Customer & Delivery Information
                </h4>

                <div className={`form-group ${formErrors.name ? "has-error" : ""}`}>
                  <label htmlFor="cust-name">Full Name *</label>
                  <input
                    id="cust-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={customerDetails.name}
                    onChange={(e) =>
                      setCustomerDetails({ ...customerDetails, name: e.target.value })
                    }
                  />
                  {formErrors.name && (
                    <div className="form-error-msg">{formErrors.name}</div>
                  )}
                </div>

                <div className={`form-group ${formErrors.phone ? "has-error" : ""}`}>
                  <label htmlFor="cust-phone">WhatsApp Mobile Number *</label>
                  <input
                    id="cust-phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={customerDetails.phone}
                    onChange={(e) =>
                      setCustomerDetails({
                        ...customerDetails,
                        phone: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                  {formErrors.phone && (
                    <div className="form-error-msg">{formErrors.phone}</div>
                  )}
                </div>

                <div className={`form-group ${formErrors.address ? "has-error" : ""}`}>
                  <label htmlFor="cust-address">Delivery Address (Door No, Street, Area) *</label>
                  <textarea
                    id="cust-address"
                    rows={2}
                    placeholder="House/Flat No., Building Name, Street, Landmark"
                    value={customerDetails.address}
                    onChange={(e) =>
                      setCustomerDetails({ ...customerDetails, address: e.target.value })
                    }
                  />
                  {formErrors.address && (
                    <div className="form-error-msg">{formErrors.address}</div>
                  )}
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="cust-city">City / District</label>
                    <input
                      id="cust-city"
                      type="text"
                      value={customerDetails.city}
                      onChange={(e) =>
                        setCustomerDetails({ ...customerDetails, city: e.target.value })
                      }
                    />
                  </div>

                  <div className={`form-group ${formErrors.pincode ? "has-error" : ""}`}>
                    <label htmlFor="cust-pincode">Pincode *</label>
                    <input
                      id="cust-pincode"
                      type="text"
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={customerDetails.pincode}
                      onChange={(e) =>
                        setCustomerDetails({
                          ...customerDetails,
                          pincode: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                    {formErrors.pincode && (
                      <div className="form-error-msg">{formErrors.pincode}</div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cust-payment">Preferred Payment Method</label>
                  <select
                    id="cust-payment"
                    value={customerDetails.paymentMethod}
                    onChange={(e) =>
                      setCustomerDetails({
                        ...customerDetails,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                    <option value="UPI on Delivery (GPay / PhonePe / Paytm)">
                      UPI on Delivery (GPay / PhonePe / Paytm)
                    </option>
                    <option value="Direct UPI Transfer to Mill">
                      Direct UPI Transfer to Mill
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="cust-notes">Customer Notes (Optional)</label>
                  <input
                    id="cust-notes"
                    type="text"
                    placeholder="e.g. Call before delivery, leave with security"
                    value={customerDetails.notes}
                    onChange={(e) =>
                      setCustomerDetails({ ...customerDetails, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer with Calculations & WhatsApp Order CTA */}
        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="bill-breakdown-table">
              <div className="bill-row">
                <span>Items Subtotal</span>
                <span>₹{formatINR(cartSummary.subtotal)}</span>
              </div>
              <div className="bill-row">
                <span>Delivery Charges</span>
                <span>
                  {cartSummary.deliveryCharge === 0 ? (
                    <strong style={{ color: "#16a34a" }}>FREE</strong>
                  ) : (
                    `₹${formatINR(cartSummary.deliveryCharge)}`
                  )}
                </span>
              </div>
              {cartSummary.discount > 0 && (
                <div className="bill-row" style={{ color: "#16a34a" }}>
                  <span>Discount</span>
                  <span>-₹{formatINR(cartSummary.discount)}</span>
                </div>
              )}
              <div className="bill-row grand-total">
                <span>Grand Total</span>
                <span>₹{formatINR(cartSummary.grandTotal)}</span>
              </div>
            </div>

            <button
              id="order-on-whatsapp-btn"
              type="button"
              className="btn-order-whatsapp-main"
              onClick={validateAndProceed}
            >
              <Send size={18} />
              Send Order to WhatsApp
            </button>

            <div className="cart-footer-notice">
              ⚠️ Note: Calculations are verified. Your bill will be prepared for WhatsApp review before sending.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
