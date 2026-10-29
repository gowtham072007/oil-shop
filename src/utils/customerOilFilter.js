/**
 * Customer-Facing Oil Filter & Presentation Utility
 *
 * Enforces the strict rule:
 * Customer website displays ONLY three oil types:
 * 1. Coconut Oil — தேங்காய் எண்ணெய்
 * 2. Sesame Oil — நல்லெண்ணெய்
 * 3. Groundnut Oil — கடலை எண்ணெய்
 *
 * All Mara Chekku / wood-pressed references and other oil types
 * (sunflower, castor, mustard, palm, pooja, etc.) are excluded from public view.
 */

export const PERMITTED_OILS = [
  {
    id: "coconut",
    name: "Coconut Oil",
    regionalName: "தேங்காய் எண்ணெய்",
    keywords: ["coconut", "தேங்காய்", "copra", "thengai", "virgin coconut"],
    description: "100% pure edible coconut oil with authentic natural aroma, perfect for traditional cooking, baking, and dietary wellness.",
    defaultImage: "/images/coconut_oil.jpg",
  },
  {
    id: "sesame",
    name: "Sesame Oil",
    regionalName: "நல்லெண்ணெய்",
    keywords: ["sesame", "gingelly", "நல்லெண்ணெய்", "til", "nalla ennai", "ellu", "gingelly oil"],
    description: "Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.",
    defaultImage: "/images/sesame_oil.jpg",
  },
  {
    id: "groundnut",
    name: "Groundnut Oil",
    regionalName: "கடலை எண்ணெய்",
    keywords: ["groundnut", "peanut", "கடலை", "kadalai", "groundnut oil", "peanut oil"],
    description: "Pure edible groundnut oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.",
    defaultImage: "/images/groundnut_oil.jpg",
  },
];

export const PERMITTED_OIL_IDS = ["coconut", "sesame", "groundnut"];

/**
 * Remove any Mara Chekku or unverified wood-pressed claims from descriptions
 */
export function sanitizeCustomerText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/mara chekku/gi, "pure edible")
    .replace(/wood[- ]pressed/gi, "cold-extracted")
    .replace(/wooden pestle/gi, "traditional")
    .replace(/vaagai wood/gi, "traditional")
    .replace(/vaagai/gi, "")
    .replace(/chekku/gi, "")
    .replace(/மரச்செக்கு/g, "பாரம்பரிய சுத்தமான")
    .replace(/வாகை/g, "")
    .trim();
}

/**
 * Identify if a product belongs to one of the three permitted oil types.
 * Returns 'coconut' | 'sesame' | 'groundnut' | null
 */
export function identifyPermittedOilType(product) {
  if (!product) return null;

  const searchable = [
    product.category || "",
    product.name || "",
    product.regionalName || "",
    product.oilType || "",
    product.description || "",
  ]
    .join(" ")
    .toLowerCase();

  // Check prohibited oils first (mustard, sunflower, castor, palm, pooja, deepam)
  const prohibitedKeywords = [
    "mustard",
    "கடுகு",
    "sunflower",
    "சூரியகாந்தி",
    "castor",
    "விளக்கெண்ணெய்",
    "palm",
    "pooja",
    "deepam",
    "தீபம்",
    "பூஜை",
    "pancha deepam",
  ];

  for (const badKw of prohibitedKeywords) {
    if (searchable.includes(badKw)) {
      return null; // Prohibited oil, never show on public site
    }
  }

  // Check matching permitted oil
  for (const oil of PERMITTED_OILS) {
    if (product.category === oil.id) {
      return oil.id;
    }
    for (const kw of oil.keywords) {
      if (searchable.includes(kw.toLowerCase())) {
        return oil.id;
      }
    }
  }

  return null;
}

/**
 * Format product strictly for customer presentation with exact names & cleaned descriptions
 */
export function formatCustomerProduct(product) {
  const oilType = identifyPermittedOilType(product);
  if (!oilType) return null;

  const def = PERMITTED_OILS.find((o) => o.id === oilType);

  return {
    ...product,
    customerOilId: oilType,
    name: def.name,
    regionalName: def.regionalName,
    oilType: "100% Pure Edible Oil",
    description: sanitizeCustomerText(product.description) || def.description,
    image: product.image || def.defaultImage,
    brand: product.brand || "Poomani Oils",
  };
}

/**
 * Filter customer catalog to only include permitted oils matching category and search query
 */
export function filterCustomerProducts(products, selectedCategory = "all", searchQuery = "") {
  if (!Array.isArray(products)) return [];

  const validProducts = [];

  for (const p of products) {
    const oilType = identifyPermittedOilType(p);
    if (!oilType) continue; // Exclude non-permitted oils

    const formatted = formatCustomerProduct(p);
    if (!formatted) continue;

    // Filter by customer category tab
    if (selectedCategory !== "all" && selectedCategory !== oilType) {
      continue;
    }

    // Filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchName = formatted.name.toLowerCase().includes(query);
      const matchRegional = formatted.regionalName.toLowerCase().includes(query);
      const matchDesc = formatted.description.toLowerCase().includes(query);
      const matchOilId = oilType.toLowerCase().includes(query);
      if (!matchName && !matchRegional && !matchDesc && !matchOilId) {
        continue;
      }
    }

    validProducts.push(formatted);
  }

  return validProducts;
}

/**
 * Get customer-facing category tabs with real count of products configured
 */
export function getCustomerCategories(products = []) {
  const permitted = filterCustomerProducts(products, "all", "");

  const getCount = (oilId) => {
    if (oilId === "all") return permitted.length;
    return permitted.filter((p) => p.customerOilId === oilId).length;
  };

  return [
    {
      id: "all",
      name: "All Three Oils",
      regionalName: "அனைத்து 3 எண்ணெய்",
      icon: "Droplets",
      count: getCount("all"),
    },
    {
      id: "coconut",
      name: "Coconut Oil",
      regionalName: "தேங்காய் எண்ணெய்",
      icon: "Palmtree",
      count: getCount("coconut"),
    },
    {
      id: "sesame",
      name: "Sesame Oil",
      regionalName: "நல்லெண்ணெய்",
      icon: "Sparkles",
      count: getCount("sesame"),
    },
    {
      id: "groundnut",
      name: "Groundnut Oil",
      regionalName: "கடலை எண்ணெய்",
      icon: "Nut",
      count: getCount("groundnut"),
    },
  ];
}

