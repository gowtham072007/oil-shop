/**
 * Utility to validate, calculate, and format WhatsApp bills strictly conforming to requirements.
 */

// Format currency in Indian format
export const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num);
};

// Generate unique order reference (e.g., OS-2026-8392)
export const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `OS-${year}-${randomDigits}`;
};

// Format clean WhatsApp phone number: only digits, no '+', no spaces, no punctuation
export const cleanWhatsAppNumber = (phone) => {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  // If user entered 10 digits (e.g. 9876543210), prepend default India country code 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  // If user entered 11 digits starting with 0 (e.g. 09876543210), replace leading 0 with 91
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = `91${digits.slice(1)}`;
  }
  return digits;
};

// Clean customer phone (10 digits display/validation)
export const cleanCustomerPhone = (phone) => {
  if (!phone) return "";
  return String(phone).replace(/\D/g, "").slice(-10);
};

/**
 * Server/App authoritative bill calculation.
 * Never trusts client entered grand totals. Re-calculates strictly from item rate and qty.
 */
export const calculateOrderTotals = (cartItems, shopSettings, appliedCoupon) => {
  let subtotal = 0;
  const verifiedItems = cartItems.map((item) => {
    const unitPrice = Number(item.selectedVariant?.price || item.price || 0);
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    return {
      name: item.name,
      packSize: item.selectedVariant?.size || item.packSize || "1 Litre",
      quantity,
      rate: unitPrice,
      amount: lineTotal,
    };
  });

  // Calculate delivery charges
  const freeThreshold = Number(shopSettings.freeDeliveryThreshold) || 999;
  const standardDelivery = Number(shopSettings.deliveryCharge) || 50;
  let deliveryCharge = 0;
  if (subtotal > 0) {
    deliveryCharge = subtotal >= freeThreshold ? 0 : standardDelivery;
  }

  // Calculate discount from coupon
  let discount = 0;
  if (appliedCoupon && subtotal >= (appliedCoupon.minOrder || 0)) {
    if (appliedCoupon.type === "percent") {
      const calcDiscount = Math.round((subtotal * appliedCoupon.value) / 100);
      discount = appliedCoupon.maxDiscount ? Math.min(calcDiscount, appliedCoupon.maxDiscount) : calcDiscount;
    } else if (appliedCoupon.type === "flat") {
      discount = appliedCoupon.value;
    }
  }

  // Grand total cannot be negative
  const grandTotal = Math.max(0, subtotal + deliveryCharge - discount);

  return {
    verifiedItems,
    subtotal,
    deliveryCharge,
    discount,
    grandTotal,
    isFreeDelivery: deliveryCharge === 0 && subtotal > 0,
    amountForFreeDelivery: Math.max(0, freeThreshold - subtotal),
  };
};

/**
 * Generates the bill text adhering to the required format:
 *
 * OIL SHOP - CUSTOMER ORDER
 * Order No: [Unique order reference]
 * Date: [Date and time]
 * Customer Name: [Customer name]
 * Phone: [Customer phone]
 * Delivery Address: [Customer address]
 * ORDER DETAILS
 * [Product name]
 * Pack Size: [Size]
 * Quantity: [Quantity]
 * Rate: ₹[Unit price]
 * Amount: ₹[Line total]
 * ...
 * Subtotal: ₹[Subtotal]
 * Delivery: ₹[Delivery charge]
 * Discount: ₹[Discount]
 * GRAND TOTAL: ₹[Final total]
 * Payment Method: [Selected method]
 * Customer Notes: [Notes]
 * Thank you for shopping with us!
 */
export const generateWhatsAppBillText = (order) => {
  const lines = [];

  lines.push("OIL SHOP - CUSTOMER ORDER");
  lines.push(`Order No: ${order.orderNumber}`);
  lines.push(`Date: ${order.date}`);
  lines.push(`Customer Name: ${order.customerName}`);
  lines.push(`Phone: ${order.customerPhone}`);
  lines.push(`Delivery Address: ${order.deliveryAddress}`);
  lines.push("ORDER DETAILS");

  order.items.forEach((item) => {
    lines.push(item.name);
    lines.push(`Pack Size: ${item.packSize}`);
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Rate: ₹${item.rate}`);
    lines.push(`Amount: ₹${item.amount}`);
  });

  lines.push(`Subtotal: ₹${order.subtotal}`);
  lines.push(`Delivery: ₹${order.deliveryCharge}`);
  lines.push(`Discount: ₹${order.discount}`);
  lines.push(`GRAND TOTAL: ₹${order.grandTotal}`);
  lines.push(`Payment Method: ${order.paymentMethod || "Cash on Delivery"}`);
  lines.push(`Customer Notes: ${order.customerNotes?.trim() ? order.customerNotes.trim() : "None"}`);
  lines.push("Thank you for shopping with us!");

  return lines.join("\n");
};

/**
 * Builds the official WhatsApp click-to-chat URL:
 * https://wa.me/COUNTRYCODEPHONENUMBER?text=ENCODED_MESSAGE
 */
export const buildWhatsAppUrl = (rawPhoneNumber, billText) => {
  const cleanPhone = cleanWhatsAppNumber(rawPhoneNumber);
  const encodedMessage = encodeURIComponent(billText);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
