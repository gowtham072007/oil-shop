export const DEFAULT_SHOP_SETTINGS = {
  shopName: "Poomani Oils",
  shopNameTamil: "பூமணி ஆயில்ஸ்",
  tagline: "Authentic Wood-Pressed (Mara Chekku) Cold Pressed Oils",
  taglineTamil: "பாரம்பரிய மரச்செக்கு சுத்தமான எண்ணெய்",
  whatsappNumber: "919876543210", // Strictly Country Code + Digits without +, spaces, or dashes
  phoneDisplay: "+91 98765 43210",
  email: "contact@poomanioils.com",
  address: "Shop No. 18, Temple Car Street, Near Raja Veedhi, Erode, Tamil Nadu - 638001",
  fssaiNumber: "12421008000421",
  workingHours: "Mon - Sat: 8:00 AM - 9:00 PM | Sun: 8:00 AM - 2:00 PM",
  deliveryCharge: 50,
  freeDeliveryThreshold: 999,
  adminPin: "1234",
  currency: "₹",
};

export const DEFAULT_CATEGORIES = [
  { id: "all", name: "All Oils", regionalName: "அனைத்து எண்ணெய்", icon: "Droplets", description: "Complete range of cold-pressed oils" },
  { id: "groundnut", name: "Groundnut Oil", regionalName: "கடலை எண்ணெய்", icon: "Nut", description: "Wood pressed Kadalai Ennai for daily cooking" },
  { id: "sesame", name: "Sesame / Gingelly", regionalName: "நல்லெண்ணெய்", icon: "Sparkles", description: "Traditional Nalla Ennai with palm jaggery" },
  { id: "coconut", name: "Coconut Oil", regionalName: "தேங்காய் எண்ணெய்", icon: "Palmtree", description: "100% Pure sulphur-free copra oil" },
  { id: "mustard", name: "Mustard Oil", regionalName: "கடுகு எண்ணெய்", icon: "Flower2", description: "Pungent Kachi Ghani cold-pressed mustard oil" },
  { id: "sunflower", name: "Sunflower Oil", regionalName: "சூரியகாந்தி எண்ணெய்", icon: "Sun", description: "Light & heart-friendly unrefined sunflower oil" },
  { id: "pooja", name: "Deepam & Pooja Oil", regionalName: "தீப பூஜை எண்ணெய்", icon: "Flame", description: "Pancha Deepam aromatic sacred lamp oil" },
];

export const DEMO_PRODUCT_IDS = [
  "prod-1",
  "prod-2",
  "prod-3",
  "prod-4",
  "prod-5",
  "prod-6",
];

// Start with empty catalog - no preloaded demo/sample products
export const DEFAULT_PRODUCTS = [];

export const DEFAULT_COUPONS = [
  { code: "WELCOME50", type: "flat", value: 50, minOrder: 500, description: "Flat ₹50 OFF on orders above ₹500" },
  { code: "PURE10", type: "percent", value: 10, maxDiscount: 150, minOrder: 800, description: "10% OFF up to ₹150 on orders above ₹800" },
  { code: "FESTIVE100", type: "flat", value: 100, minOrder: 1500, description: "Flat ₹100 OFF on orders above ₹1500" },
];
