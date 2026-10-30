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
 * Standardize English and Tamil names for the 3 permitted oils
 */
export const getStandardOilNames = (name = "", regionalName = "") => {
  const combined = `${name} ${regionalName}`.toLowerCase();
  if (combined.includes("coconut") || combined.includes("தேங்காய்")) {
    return {
      en: "Coconut Oil",
      ta: "தேங்காய் எண்ணெய்",
      combined: "Coconut Oil — தேங்காய் எண்ணெய்",
    };
  }
  if (combined.includes("sesame") || combined.includes("gingelly") || combined.includes("நல்லெண்ணெய்")) {
    return {
      en: "Sesame Oil",
      ta: "நல்லெண்ணெய்",
      combined: "Sesame Oil — நல்லெண்ணெய்",
    };
  }
  if (combined.includes("groundnut") || combined.includes("peanut") || combined.includes("கடலை")) {
    return {
      en: "Groundnut Oil",
      ta: "கடலை எண்ணெய்",
      combined: "Groundnut Oil — கடலை எண்ணெய்",
    };
  }

  // Fallback to existing strings if already populated
  const enName = name.replace(/\s*[–-]\s*\d+\s*(ml|litre|l)\b/gi, "").trim() || "Pure Edible Oil";
  const taName = regionalName.replace(/\s*[–-]\s*\d+\s*(மி\.லி|லிட்டர்)\b/gi, "").trim() || "";
  return {
    en: enName,
    ta: taName,
    combined: taName ? `${enName} — ${taName}` : enName,
  };
};

/**
 * Server/App authoritative bill calculation.
 * Never trusts client entered grand totals. Re-calculates strictly from item rate and qty.
 */
export const calculateOrderTotals = (cartItems, shopSettings, appliedCoupon) => {
  let subtotal = 0;
  const verifiedItems = cartItems.map((item, index) => {
    const unitPrice = Number(item.selectedVariant?.price || item.price || 0);
    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = unitPrice * quantity;
    subtotal += lineTotal;

    const stdNames = getStandardOilNames(item.name, item.regionalName);
    const packSize = item.selectedVariant?.size || item.packSize || (item.name?.match(/\b(200\s*ml|500\s*ml|1\s*Litre|1\s*L)\b/i)?.[0]) || "1 Litre";

    return {
      sNo: index + 1,
      name: item.name,
      regionalName: item.regionalName || "",
      oilNameEn: stdNames.en,
      oilNameTa: stdNames.ta,
      fullName: stdNames.combined,
      packSize,
      quantity,
      rate: unitPrice,
      amount: lineTotal,
    };
  });

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

  // Grand total calculated strictly from product subtotal and applicable discounts
  const grandTotal = Math.max(0, subtotal - discount);

  return {
    verifiedItems,
    subtotal,
    deliveryCharge: 0,
    discount,
    grandTotal,
    isFreeDelivery: false,
    amountForFreeDelivery: 0,
  };
};

/**
 * Generates the professional bill text adhering to the user's requirements:
 */
export const generateWhatsAppBillText = (order) => {
  const lines = [];

  lines.push("🧾 *POOMANI CHEKKU ENNAI — பூமணி செக்கு எண்ணெய்*");
  lines.push("*Customer Order Bill / வாடிக்கையாளர் ஆர்டர் ரசீது*");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`*Bill No / Order ID:* ${order.orderNumber}`);
  lines.push(`*Date & Time:* ${order.date}`);
  lines.push(`*Customer Name:* ${order.customerName}`);
  lines.push(`*Phone Number:* ${order.customerPhone}`);
  const customerAddress = order.customerAddress || order.address || order.deliveryAddress;
  if (customerAddress) {
    lines.push(`*Customer Address:* ${customerAddress}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("*ORDERED PRODUCTS / ஆர்டர் பொருட்கள்:*");

  order.items.forEach((item, idx) => {
    const sNo = item.sNo || idx + 1;
    const displayName = item.fullName || (item.regionalName ? `${item.name} — ${item.regionalName}` : item.name);
    lines.push(`\n${sNo}. *${displayName}*`);
    lines.push(`   • Quantity/Size: ${item.packSize}`);
    lines.push(`   • Qty: ${item.quantity} bottle(s)`);
    lines.push(`   • Unit Price: ₹${formatINR(item.rate)}`);
    lines.push(`   • Amount: ₹${formatINR(item.amount)}`);
  });

  lines.push("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`*Subtotal:* ₹${formatINR(order.subtotal)}`);
  if (order.discount > 0) {
    lines.push(`*Discount:* -₹${formatINR(order.discount)}`);
  }
  lines.push(`*GRAND TOTAL / மொத்தத் தொகை:* ₹${formatINR(order.grandTotal)}`);
  lines.push(`*Payment Method:* ${order.paymentMethod || "Cash"}`);
  if (order.customerNotes && order.customerNotes !== "None") {
    lines.push(`*Notes:* ${order.customerNotes}`);
  }
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("Hello Poomani Chekku Ennai, I would like to confirm this order. Please check my order bill.");

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
