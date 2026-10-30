import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR, cleanWhatsAppNumber } from "../utils/billGenerator";
import { dispatchOrderPhotoBillToWhatsApp } from "../utils/billImageCanvas";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  Check,
  Send,
  AlertCircle,
  MapPin,
  User,
  Phone,
  FileText,
  CreditCard,
  Loader2,
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
    initiateWhatsAppCheckout,
    confirmOrderRedirect,
    showNotification,
    setPreviewOrder,
  } = useShop();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Customer form inputs
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
    address: "",
    city: "Bengaluru",
    pincode: "",
    paymentMethod: "Cash",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState({});

  if (!isCartOpen) return null;

  // Validate form and directly initiate WhatsApp Photo Bill dispatch sequence
  const validateAndProceed = async (e) => {
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
      errors.address = "Complete address is required";
    }

    if (!customerDetails.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(customerDetails.pincode.trim())) {
      errors.pincode = "Enter valid 6-digit PIN code";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Verify store owner WhatsApp recipient number is configured
    const cleanAdminPhone = cleanWhatsAppNumber(shopSettings?.whatsappNumber);
    if (!cleanAdminPhone || cleanAdminPhone.length < 10) {
      showNotification(
        "Shop WhatsApp recipient number is not configured by the store owner. Please configure it in the Admin Dashboard Settings.",
        "error"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create order record and open preview modal
      const order = initiateWhatsAppCheckout(customerDetails);
      if (!order) return;

      // 2. Dynamically generate professional bill photo & dispatch directly to store owner's WhatsApp
      const result = await dispatchOrderPhotoBillToWhatsApp({
        order,
        shopSettings,
      });

      if (result.success && result.apiSent) {
        setPreviewOrder({
          ...order,
          whatsappStatus: "delivered",
          whatsappMessageId: result.messageId,
          whatsappRecipient: result.recipient || cleanAdminPhone,
          billDataUrl: result.dataUrl,
        });
        confirmOrderRedirect(order.orderNumber);
        showNotification(
          `Bill photo delivered directly to store owner (+${result.recipient || cleanAdminPhone}) via WhatsApp Business API!`,
          "success"
        );
      } else {
        setPreviewOrder({
          ...order,
          whatsappStatus: result.notConfigured ? "unconfigured" : "failed",
          whatsappError: result.error || "Meta WhatsApp Business API dispatch failed.",
          whatsappRecipient: result.recipient || cleanAdminPhone,
          billDataUrl: result.dataUrl,
        });
        showNotification(
          result.error || "WhatsApp Business API dispatch failed.",
          "error"
        );
      }
    } catch (err) {
      console.error("[CartDrawer] Order dispatch error:", err);
      showNotification("Could not dispatch bill photo: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {cart.length > 0 && (
              <button
                type="button"
                className="btn-clear-cart-header"
                onClick={() => {
                  clearCart();
                  showNotification("Shopping cart has been cleared", "info");
                }}
                title="Remove all items from shopping cart"
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "0.28rem 0.6rem",
                  borderRadius: "6px",
                  fontSize: "0.74rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Trash2 size={12} />
                Clear Cart
              </button>
            )}
            <button
              type="button"
              className="btn-close"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
            >
              <X size={18} />
            </button>
          </div>
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

              {/* Customer Checkout Details Form */}
              <div className="checkout-details-section">
                <h4>
                  <MapPin size={18} color="#124e2c" />
                  Customer Information & Contact Address
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
                  <label htmlFor="cust-address">Customer Address (Door No, Street, Area) *</label>
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
                    <option value="Cash">Cash (நேரில் பணம்)</option>
                    <option value="UPI (GPay / PhonePe / Paytm)">
                      UPI (GPay / PhonePe / Paytm)
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
                    placeholder="e.g. Preferred bottle packing, order instructions"
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Generating Bill Photo & Sending to Store Owner...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Send Order on WhatsApp</span>
                </>
              )}
            </button>

            <div className="cart-footer-notice">
              📸 Automatically generates your official invoice photo bill and dispatches directly to the store owner's WhatsApp.
            </div>
          </div>
        )}
      </div>
    </>
  );
};
