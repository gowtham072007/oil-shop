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
 * Parse phone number into country code prefix (e.g. "+91") and local phone digits
 */
export const parseCountryAndLocalPhone = (rawPhone) => {
  if (!rawPhone) return { countryCode: "+91", localNumber: "" };
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length >= 12) {
    return { countryCode: "+91", localNumber: digits.slice(2) };
  }
  if (digits.startsWith("1") && digits.length === 11) {
    return { countryCode: "+1", localNumber: digits.slice(1) };
  }
  if (digits.startsWith("44") && digits.length >= 11) {
    return { countryCode: "+44", localNumber: digits.slice(2) };
  }
  if (digits.startsWith("971") && digits.length >= 11) {
    return { countryCode: "+971", localNumber: digits.slice(3) };
  }
  if (digits.startsWith("65") && digits.length >= 10) {
    return { countryCode: "+65", localNumber: digits.slice(2) };
  }
  if (digits.startsWith("60") && digits.length >= 11) {
    return { countryCode: "+60", localNumber: digits.slice(2) };
  }
  if (digits.length === 10) {
    return { countryCode: "+91", localNumber: digits };
  }
  return { countryCode: "+91", localNumber: digits };
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
      combined: "Coconut Oil / தேங்காய் எண்ணெய்",
    };
  }
  if (combined.includes("sesame") || combined.includes("gingelly") || combined.includes("நல்லெண்ணெய்")) {
    return {
      en: "Sesame Oil",
      ta: "நல்லெண்ணெய்",
      combined: "Sesame Oil / நல்லெண்ணெய்",
    };
  }
  if (combined.includes("groundnut") || combined.includes("peanut") || combined.includes("கடலை")) {
    return {
      en: "Groundnut Oil",
      ta: "கடலை எண்ணெய்",
      combined: "Groundnut Oil / கடலை எண்ணெய்",
    };
  }

  // Fallback to existing strings if already populated
  const enName = name.replace(/\s*[–-]\s*\d+\s*(ml|litre|l)\b/gi, "").trim() || "Pure Edible Oil";
  const taName = regionalName.replace(/\s*[–-]\s*\d+\s*(மி\.லி|லிட்டர்)\b/gi, "").trim() || "";
  return {
    en: enName,
    ta: taName,
    combined: taName ? `${enName} / ${taName}` : enName,
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

export const PERMANENT_ADMIN_WHATSAPP = "916385755368";
export const PERMANENT_ADMIN_WHATSAPP_DISPLAY = "+91 63857 55368";

/**
 * Converts a numeric amount into Indian Currency words (e.g. 1500 -> One Thousand Five Hundred Rupees Only)
 */
export const numberToIndianRupeesWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return "Zero Rupees Only";

  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const convertTwoDigits = (val) => {
    if (val < 20) return units[val];
    const t = tens[Math.floor(val / 10)];
    const u = units[val % 10];
    return u ? `${t} ${u}` : t;
  };

  const convertThreeDigits = (val) => {
    let str = "";
    const h = Math.floor(val / 100);
    const rem = val % 100;
    if (h > 0) {
      str += `${units[h]} Hundred`;
      if (rem > 0) str += " and ";
    }
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str;
  };

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  const parts = [];
  if (crore > 0) parts.push(`${convertThreeDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (rem > 0) parts.push(convertThreeDigits(rem));

  return `${parts.join(" ")} Rupees Only`;
};

/**
 * Generates the professional Customer Order Bill formatted specifically for WhatsApp messaging:
 * Follows the Poomani Chekku Ennai Customer Order Bill structure:
 * 1. Header (*POOMANI CHEKKU ENNAI*, *CUSTOMER ORDER BILL*)
 * 2. Order No & Date
 * 3. Customer Details (Name, Phone, Address, City, Pincode)
 * 4. Order Items (1. Product Name – Size, Quantity, Rate, Amount)
 * 5. Totals & Payment Method (Total Items, Grand Total, Payment Method)
 * 6. Footer (Thank you for choosing POOMANI CHEKKU ENNAI, நன்றி! 🙏)
 */
export const generateWhatsAppOrderBillText = (order, shopSettings = {}) => {
  const lines = [];

  // 1. Header
  lines.push("🌿 *POOMANI CHEKKU ENNAI*");
  lines.push("*பூமணி செக்கு எண்ணெய்*");
  lines.push("");
  lines.push("        *CUSTOMER ORDER BILL*");
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━");

  // 2. Order Metadata
  lines.push(`*Order No:* ${order.orderNumber}`);
  const orderDate =
    order.date ||
    new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  lines.push(`*Date & Time:* ${orderDate}`);
  lines.push("");

  // 3. Customer Details
  lines.push("*CUSTOMER DETAILS*");
  lines.push(`Name: ${order.customerName || "Valued Customer"}`);

  // Format customer phone
  let phoneDisplay = order.customerPhone || "";
  const phoneDigits = String(phoneDisplay).replace(/\D/g, "");
  if (phoneDigits.length === 10) {
    phoneDisplay = `+91 ${phoneDigits}`;
  } else if (phoneDigits.startsWith("91") && phoneDigits.length === 12) {
    phoneDisplay = `+91 ${phoneDigits.slice(2)}`;
  }
  lines.push(`Phone: ${phoneDisplay}`);

  const address =
    order.customerAddress ||
    order.address ||
    order.deliveryAddress ||
    "—";
  const city = order.customerCity || order.city || "";
  const pincode = order.customerPincode || order.pincode || "";

  lines.push(`Address: ${address}`);
  if (city) {
    lines.push(`City: ${city}`);
  }
  if (pincode) {
    lines.push(`Pincode: ${pincode}`);
  }
  lines.push("");

  // 4. Order Items
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push("*ORDER ITEMS*");
  lines.push("");

  let totalQuantity = 0;
  const items = order.items || [];

  items.forEach((item, index) => {
    const sNo = index + 1;
    const qty = parseInt(item.quantity, 10) || 1;
    totalQuantity += qty;
    const rate = Number(item.rate || item.price || 0);
    const amount = Number(item.amount || rate * qty);

    // Support English and Tamil product names with pack size
    const std = getStandardOilNames(item.name, item.regionalName);
    const packSize = item.packSize || item.selectedVariant?.size || "1 Litre";

    // Clean size from title if already present in base string
    const baseTitle = std.combined || item.name;
    const hasSize =
      baseTitle.toLowerCase().includes(packSize.toLowerCase()) ||
      /\b(200\s*ml|500\s*ml|1\s*litre|1\s*l|5\s*litre|5\s*l)\b/i.test(baseTitle);
    const itemTitle = hasSize ? baseTitle : `${baseTitle} – ${packSize}`;

    lines.push(`${sNo}. ${itemTitle}`);
    lines.push(`   Quantity: ${qty}`);
    lines.push(`   Rate: ₹${formatINR(rate)}`);
    lines.push(`   Amount: ₹${formatINR(amount)}`);
    lines.push("");
  });

  // 5. Totals & Payment Method
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`*Total Items:* ${totalQuantity}`);
  if (order.discount && Number(order.discount) > 0) {
    lines.push(`Discount: -₹${formatINR(order.discount)}`);
  }
  lines.push(`*Grand Total: ₹${formatINR(order.grandTotal)}*`);
  lines.push("");
  lines.push(`*Payment Method:* ${order.paymentMethod || "Cash"}`);
  lines.push("");

  // 6. Footer
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push("Thank you for choosing");
  lines.push("*POOMANI CHEKKU ENNAI*");
  lines.push("நன்றி! 🙏");

  return lines.join("\n");
};

/**
 * Generates the professional bill text adhering to the user's requirements:
 */
export const generateWhatsAppBillText = (order, shopSettings) => {
  return generateWhatsAppOrderBillText(order, shopSettings);
};

export const generateWhatsAppTaxInvoiceText = (order, shopSettings) => {
  return generateWhatsAppOrderBillText(order, shopSettings);
};

/**
 * Builds the official WhatsApp click-to-chat URL:
 * https://wa.me/COUNTRYCODEPHONENUMBER?text=ENCODED_MESSAGE
 */
export const buildWhatsAppUrl = (rawPhoneNumber, billText) => {
  const cleanPhone = cleanWhatsAppNumber(rawPhoneNumber) || PERMANENT_ADMIN_WHATSAPP;
  const encodedMessage = encodeURIComponent(billText);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Opens WhatsApp click-to-chat with the prefilled Tax Invoice
 */
export const openWhatsAppOrder = (rawPhoneNumber, invoiceText) => {
  const waUrl = buildWhatsAppUrl(rawPhoneNumber, invoiceText);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = waUrl;
  } else {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }
  return waUrl;
};
