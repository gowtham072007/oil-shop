export const DEFAULT_SHOP_SETTINGS = {
  shopName: "Poomani Oils",
  shopNameTamil: "பூமணி ஆயில்ஸ்",
  tagline: "Authentic Wood-Pressed (Mara Chekku) Cold Pressed Oils",
  taglineTamil: "பாரம்பரிய மரச்செக்கு சுத்தமான எண்ணெய்",
  whatsappNumber: "916385755368", // Official phone number from brand poster
  phoneDisplay: "+91 63857 55368",
  email: "contact@poomanioils.com",
  address: "Gopalasamuthiram (கோபாலசமுத்திரம்), Tamil Nadu",
  fssaiNumber: "12421008000421",
  workingHours: "Mon - Sat: 8:00 AM - 9:00 PM | Sun: 8:00 AM - 2:00 PM",
  deliveryCharge: 50,
  freeDeliveryThreshold: 999,
  adminPin: "1234",
  currency: "₹",
};

export const DEFAULT_CATEGORIES = [
  { id: "all", name: "All Oils", regionalName: "அனைத்து எண்ணெய்", icon: "Droplets", description: "Complete range of pure edible cooking oils" },
  { id: "coconut", name: "Coconut Oil", regionalName: "தேங்காய் எண்ணெய்", icon: "Palmtree", description: "100% Pure edible coconut oil" },
  { id: "sesame", name: "Sesame Oil", regionalName: "நல்லெண்ணெய்", icon: "Sparkles", description: "Pure edible sesame / gingelly oil" },
  { id: "groundnut", name: "Groundnut Oil", regionalName: "கடலை எண்ணெய்", icon: "Nut", description: "Pure edible groundnut / peanut oil" },
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
