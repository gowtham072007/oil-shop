import React from "react";
import { useShop } from "../context/ShopContext";
import { getCustomerCategories } from "../utils/customerOilFilter";
import {
  Droplets,
  Nut,
  Sparkles,
  Palmtree,
} from "lucide-react";

// Icon mapping helper for the 3 permitted oils
const getCategoryIcon = (iconName) => {
  switch (iconName) {
    case "Nut":
      return <Nut size={16} />;
    case "Sparkles":
      return <Sparkles size={16} />;
    case "Palmtree":
      return <Palmtree size={16} />;
    case "Droplets":
    default:
      return <Droplets size={16} />;
  }
};

export const CategoryTabs = () => {
  const { selectedCategory, setSelectedCategory, products } = useShop();
  const customerTabs = getCustomerCategories(products);

  // If there are no products in the catalog at all, don't show the category filter bar
  const totalCount = customerTabs.find((c) => c.id === "all")?.count || 0;
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="category-nav-wrapper">
      {customerTabs.map((cat) => {
        const isActive = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            id={`category-tab-${cat.id}`}
            className={`cat-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {getCategoryIcon(cat.icon)}
            <span>{cat.name}</span>
            {cat.regionalName && (
              <span style={{ fontSize: "0.78rem", opacity: 0.85 }}>({cat.regionalName})</span>
            )}
            <span className="badge-pill">{cat.count}</span>
          </button>
        );
      })}
    </div>
  );
};
