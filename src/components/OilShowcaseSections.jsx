import React from "react";
import { useShop } from "../context/ShopContext";
import { ShoppingBag, ArrowRight, Sparkles } from "lucide-react";

/**
 * 2. Coconut Oil Section
 * 3. Sesame Oil Section
 * 4. Groundnut Oil Section
 *
 * Requirements:
 * - Coconut Oil: heading "Pure Coconut Oil", bottles 1 Litre, 500 ml, 250 ml
 * - Sesame Oil: heading "Traditional Sesame Oil", bottles 1 Litre, 500 ml, 250 ml
 * - Groundnut Oil: heading "Natural Groundnut Oil", bottles 1 Litre, 500 ml
 * - Responsive, width: 100%, height: auto, maintain aspect ratio without stretching/distortion.
 * - Green, white and golden traditional oil-shop theme.
 */
const SHOWCASE_ITEMS = [
  {
    id: "coconut",
    sectionId: "section-coconut-oil",
    heading: "Pure Coconut Oil",
    regionalName: "தேங்காய் எண்ணெய்",
    subtitle: "Naturally extracted cold pressed oil • Pure, unrefined & fresh from mill",
    bottleSizes: ["1 Litre", "500 ml", "250 ml"],
    image: "/images/poomani_coconut_oil_advertisement.jpg",
    alt: "Poomani Pure Coconut Oil (தேங்காய் எண்ணெய்) — 1 Litre, 500 ml and 250 ml bottles. Pure, Natural, Healthy Traditional Cold-Pressed Coconut Oil",
    buttonText: "Order Pure Coconut Oil",
  },
  {
    id: "sesame",
    sectionId: "section-sesame-oil",
    heading: "Traditional Sesame Oil",
    regionalName: "நல்லெண்ணெய்",
    subtitle: "Traditional Mara Chekku Gingelly Oil • Rich aroma & natural nutrients",
    bottleSizes: ["1 Litre", "500 ml", "250 ml"],
    image: "/images/poomani_sesame_oil_advertisement.jpg",
    alt: "Poomani Traditional Sesame Oil (நல்லெண்ணெய்) — 1 Litre, 500 ml and 250 ml bottles. Traditional Cold-Pressed Sesame Oil for a Healthy Life",
    buttonText: "Order Traditional Sesame Oil",
  },
  {
    id: "groundnut",
    sectionId: "section-groundnut-oil",
    heading: "Natural Groundnut Oil",
    regionalName: "கடலை எண்ணெய்",
    subtitle: "Cold-pressed from handpicked peanuts • Traditional goodness for daily cooking",
    bottleSizes: ["1 Litre", "500 ml"],
    image: "/images/poomani_groundnut_oil_advertisement.jpg",
    alt: "Poomani Natural Groundnut Oil (கடலை எண்ணெய்) — 1 Litre and 500 ml bottles. Traditional Goodness for a Healthy Life",
    buttonText: "Order Natural Groundnut Oil",
  },
];

export const OilShowcaseSections = () => {
  const { setSelectedCategory } = useShop();

  const handleOrderClick = (categoryId) => {
    if (setSelectedCategory) {
      setSelectedCategory(categoryId);
    }
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {SHOWCASE_ITEMS.map((item) => (
        <section
          key={item.id}
          id={item.sectionId}
          className="homepage-oil-showcase-section"
          aria-label={item.heading}
        >
          <div className="container">
            {/* Section Heading & Regional Metadata */}
            <div className="showcase-header">
              <div className="showcase-badge-pill">
                <Sparkles size={13} className="gold-sparkle-icon" />
                <span className="showcase-regional-tag">{item.regionalName}</span>
                <span className="showcase-bullet" aria-hidden="true">•</span>
                <span className="showcase-sizes-tag">
                  Bottles: {item.bottleSizes.join(" • ")}
                </span>
              </div>

              <h2 className="showcase-title">{item.heading}</h2>
              <p className="showcase-subtitle">{item.subtitle}</p>
            </div>

            {/* Responsive Showcase Advertisement Card */}
            <div
              className="showcase-image-card"
              onClick={() => handleOrderClick(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleOrderClick(item.id);
              }}
              title={`${item.heading} — Click to view pack sizes & add to cart`}
            >
              <img
                src={item.image}
                alt={item.alt}
                className="showcase-banner-img"
                loading="lazy"
              />
            </div>

            {/* Attractive Call-to-Action Action */}
            <div className="showcase-cta-bar">
              <button
                type="button"
                className="showcase-order-btn"
                onClick={() => handleOrderClick(item.id)}
                title={`Order ${item.heading} online`}
              >
                <ShoppingBag size={17} />
                <span>{item.buttonText}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </section>
      ))}
    </>
  );
};

