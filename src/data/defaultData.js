export const DEFAULT_SHOP_SETTINGS = {
  shopName: "Poomani Chekku Ennai",
  shopNameTamil: "பூமணி செக்கு எண்ணெய்",
  tagline: "Authentic Cold-Pressed (Chekku) Pure Edible Oils",
  taglineTamil: "பாரம்பரிய செக்கு சுத்தமான எண்ணெய்",
  whatsappNumber: "916385755368", // Official phone number from brand poster
  phoneDisplay: "+91 63857 55368",
  email: "contact@poomanichekkuennai.com",
  address: "Gopalasamuthiram (கோபாலசமுத்திரம்), Tamil Nadu",
  fssaiNumber: "12421008000421",
  workingHours: "Mon - Sat: 8:00 AM - 9:00 PM | Sun: 8:00 AM - 2:00 PM",
  deliveryCharge: 0,
  freeDeliveryThreshold: 0,
  adminPin: "1234",
  currency: "₹",
};

export const DEFAULT_CATEGORIES = [
  { id: "all", name: "All Oils", regionalName: "அனைத்து எண்ணெய்", icon: "Droplets", description: "Complete range of pure edible cooking oils" },
  { id: "coconut", name: "Coconut Oil", regionalName: "தேங்காய் எண்ணெய்", icon: "Palmtree", description: "100% Pure edible coconut oil" },
  { id: "sesame", name: "Sesame Oil", regionalName: "நல்லெண்ணெய்", icon: "Sparkles", description: "Pure edible sesame / gingelly oil" },
  { id: "groundnut", name: "Groundnut Oil", regionalName: "கடலை எண்ணெய்", icon: "Nut", description: "Pure edible groundnut / peanut oil" },
];

export const DEFAULT_8_PRODUCTS = [
  // Coconut Oil — தேங்காய் எண்ணெய் (3 sizes)
  {
    id: "prod-coconut-200ml",
    name: "Coconut Oil – 200 ml",
    regionalName: "தேங்காய் எண்ணெய் – 200 மி.லி",
    category: "coconut",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/coconut_oil.jpg",
    imageFileName: "coconut_oil.jpg",
    description: "100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.",
    price: 90,
    inStock: true,
    featured: false,
    variants: [
      { id: "v-coconut-200ml", size: "200 ml", price: 90, stock: 50, unit: "Bottle", sortOrder: 1 },
    ],
  },
  {
    id: "prod-coconut-500ml",
    name: "Coconut Oil – 500 ml",
    regionalName: "தேங்காய் எண்ணெய் – 500 மி.லி",
    category: "coconut",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/coconut_oil.jpg",
    imageFileName: "coconut_oil.jpg",
    description: "100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.",
    price: 190,
    inStock: true,
    featured: true,
    variants: [
      { id: "v-coconut-500ml", size: "500 ml", price: 190, stock: 50, unit: "Bottle", sortOrder: 2 },
    ],
  },
  {
    id: "prod-coconut-1l",
    name: "Coconut Oil – 1 Litre",
    regionalName: "தேங்காய் எண்ணெய் – 1 லிட்டர்",
    category: "coconut",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/coconut_oil.jpg",
    imageFileName: "coconut_oil.jpg",
    description: "100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.",
    price: 360,
    inStock: true,
    featured: false,
    variants: [
      { id: "v-coconut-1l", size: "1 Litre", price: 360, stock: 50, unit: "Bottle", sortOrder: 3 },
    ],
  },

  // Sesame Oil — நல்லெண்ணெய் (3 sizes)
  {
    id: "prod-sesame-200ml",
    name: "Sesame Oil – 200 ml",
    regionalName: "நல்லெண்ணெய் – 200 மி.லி",
    category: "sesame",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/sesame_oil.jpg",
    imageFileName: "sesame_oil.jpg",
    description: "Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.",
    price: 110,
    inStock: true,
    featured: false,
    variants: [
      { id: "v-sesame-200ml", size: "200 ml", price: 110, stock: 40, unit: "Bottle", sortOrder: 1 },
    ],
  },
  {
    id: "prod-sesame-500ml",
    name: "Sesame Oil – 500 ml",
    regionalName: "நல்லெண்ணெய் – 500 மி.லி",
    category: "sesame",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/sesame_oil.jpg",
    imageFileName: "sesame_oil.jpg",
    description: "Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.",
    price: 230,
    inStock: true,
    featured: true,
    variants: [
      { id: "v-sesame-500ml", size: "500 ml", price: 230, stock: 40, unit: "Bottle", sortOrder: 2 },
    ],
  },
  {
    id: "prod-sesame-1l",
    name: "Sesame Oil – 1 Litre",
    regionalName: "நல்லெண்ணெய் – 1 லிட்டர்",
    category: "sesame",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/sesame_oil.jpg",
    imageFileName: "sesame_oil.jpg",
    description: "Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.",
    price: 440,
    inStock: true,
    featured: false,
    variants: [
      { id: "v-sesame-1l", size: "1 Litre", price: 440, stock: 40, unit: "Bottle", sortOrder: 3 },
    ],
  },

  // Groundnut Oil — கடலை எண்ணெய் (2 sizes)
  {
    id: "prod-groundnut-500ml",
    name: "Groundnut Oil – 500 ml",
    regionalName: "கடலை எண்ணெய் – 500 மி.லி",
    category: "groundnut",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/groundnut_oil.jpg",
    imageFileName: "groundnut_oil.jpg",
    description: "Pure edible groundnut oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.",
    price: 170,
    inStock: true,
    featured: true,
    variants: [
      { id: "v-groundnut-500ml", size: "500 ml", price: 170, stock: 45, unit: "Bottle", sortOrder: 1 },
    ],
  },
  {
    id: "prod-groundnut-1l",
    name: "Groundnut Oil – 1 Litre",
    regionalName: "கடலை எண்ணெய் – 1 லிட்டர்",
    category: "groundnut",
    brand: "Poomani Chekku Ennai",
    oilType: "100% Pure Edible Oil",
    image: "/images/groundnut_oil.jpg",
    imageFileName: "groundnut_oil.jpg",
    description: "Pure edible groundnut oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.",
    price: 320,
    inStock: true,
    featured: false,
    variants: [
      { id: "v-groundnut-1l", size: "1 Litre", price: 320, stock: 60, unit: "Bottle", sortOrder: 2 },
    ],
  },
];

export const DEMO_PRODUCT_IDS = [
  "prod-1",
  "prod-2",
  "prod-3",
  "prod-4",
  "prod-5",
  "prod-6",
];

// Exactly 8 default products organized across 3 oil categories
export const DEFAULT_PRODUCTS = DEFAULT_8_PRODUCTS;

export const DEFAULT_COUPONS = [
  { code: "WELCOME50", type: "flat", value: 50, minOrder: 500, description: "Flat ₹50 OFF on orders above ₹500" },
  { code: "PURE10", type: "percent", value: 10, maxDiscount: 150, minOrder: 800, description: "10% OFF up to ₹150 on orders above ₹800" },
  { code: "FESTIVE100", type: "flat", value: 100, minOrder: 1500, description: "Flat ₹100 OFF on orders above ₹1500" },
];
