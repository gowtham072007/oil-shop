import React from "react";
import { useShop } from "../context/ShopContext";
import {
  Droplets,
  Nut,
  Sparkles,
  Palmtree,
  Flower2,
  Sun,
  Flame,
  LayoutGrid,
} from "lucide-react";

// Icon mapping helper
const getCategoryIcon = (iconName) => {
  switch (iconName) {
    case "Nut":
      return <Nut size={16} />;
    case "Sparkles":
      return <Sparkles size={16} />;
    case "Palmtree":
      return <Palmtree size={16} />;
    case "Flower2":
      return <Flower2 size={16} />;
    case "Sun":
      return <Sun size={16} />;
    case "Flame":
      return <Flame size={16} />;
    case "Droplets":
    default:
      return <Droplets size={16} />;
  }
};

export const CategoryTabs = () => {
  const { categories, selectedCategory, setSelectedCategory, products } = useShop();

  const getProductCount = (catId) => {
    if (catId === "all") return products.length;
    return products.filter(
      (p) =>
        p.category === catId ||
        p.name?.toLowerCase().includes(catId) ||
        p.regionalName?.toLowerCase().includes(catId) ||
        p.oilType?.toLowerCase().includes(catId) ||
        p.description?.toLowerCase().includes(catId)
    ).length;
  };

  return (
    <div className="category-nav-wrapper">
      {categories.map((cat) => {
        const count = getProductCount(cat.id);
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
            <span className="badge-pill">{count}</span>
          </button>
        );
      })}
    </div>
  );
};
