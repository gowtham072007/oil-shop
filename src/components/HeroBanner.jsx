import React, { useState, useEffect, useRef, useCallback } from "react";
import { useShop } from "../context/ShopContext";

/**
 * 4 Canonical Posters for Poomani Chekku Ennai (in exact required order):
 * 1. Poomani Traditional Cold-Pressed Oils(3).png — Combined oils poster
 * 2. Poomani Coconut Oil Natural Goodness(2).png — Coconut Oil poster
 * 3. Poomani Sesame Oil_ Pure Natural Goodness.png — Sesame Oil poster
 * 4. Poomani Groundnut Oil Traditional Goodness(1).png — Groundnut Oil poster
 */
const POSTERS = [
  {
    id: "combined-oils",
    name: "Poomani Traditional Cold-Pressed Oils(3).png",
    title: "Poomani Traditional Cold-Pressed Oils",
    tamilTitle: "பூமணி செக்கு எண்ணெய்",
    subtitle: "Combined oils poster",
    src: "/images/posters/poster_1_combined_oils.jpg",
    alt: "Poomani Traditional Cold-Pressed Oils — Combined oils poster: Pure, Natural, Traditional Coconut, Sesame, and Groundnut Oils",
    categoryTarget: null,
  },
  {
    id: "coconut-oil",
    name: "Poomani Coconut Oil Natural Goodness(2).png",
    title: "Poomani Coconut Oil Natural Goodness",
    tamilTitle: "தேங்காய் எண்ணெய்",
    subtitle: "Coconut Oil poster",
    src: "/images/posters/poster_2_coconut_oil.jpg",
    alt: "Poomani Coconut Oil Natural Goodness — 100% Pure & Natural Cold-Pressed Coconut Oil (1 Litre, 500 ml, 200 ml)",
    categoryTarget: "coconut",
  },
  {
    id: "sesame-oil",
    name: "Poomani Sesame Oil_ Pure Natural Goodness.png",
    title: "Poomani Sesame Oil Pure Natural Goodness",
    tamilTitle: "நல்லெண்ணெய்",
    subtitle: "Sesame Oil poster",
    src: "/images/posters/poster_3_sesame_oil.jpg",
    alt: "Poomani Sesame Oil Pure Natural Goodness — Traditional Cold-Pressed Gingelly / Sesame Oil (1 Litre, 500 ml, 200 ml)",
    categoryTarget: "sesame",
  },
  {
    id: "groundnut-oil",
    name: "Poomani Groundnut Oil Traditional Goodness(1).png",
    title: "Poomani Groundnut Oil Traditional Goodness",
    tamilTitle: "கடலை எண்ணெய்",
    subtitle: "Groundnut Oil poster",
    src: "/images/posters/poster_4_groundnut_oil.jpg",
    alt: "Poomani Groundnut Oil Traditional Goodness — Pure & Natural Cold-Pressed Groundnut Oil (1 Litre, 500 ml)",
    categoryTarget: "groundnut",
  },
];

export const HeroBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartXRef = useRef(null);

  // Shop context for direct category selection on click
  let setSelectedCategory = null;
  try {
    const shopCtx = useShop();
    setSelectedCategory = shopCtx?.setSelectedCategory;
  } catch {
    // fallback
  }

  // Set up 2-second automatic sliding timer
  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % POSTERS.length);
    }, 2000); // exactly 2 seconds
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoPlay]);

  // Navigate to a specific poster when user clicks a dot
  const goToSlide = (index) => {
    setCurrentIndex(index);
    startAutoPlay(); // Reset timer so it shows for a full 2 seconds
  };

  // Scroll to catalog section or select category on poster click
  const handlePosterClick = (poster) => {
    if (poster.categoryTarget && setSelectedCategory) {
      setSelectedCategory(poster.categoryTarget);
    }
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // swipe left -> next
        setCurrentIndex((prev) => (prev + 1) % POSTERS.length);
      } else {
        // swipe right -> prev
        setCurrentIndex((prev) => (prev - 1 + POSTERS.length) % POSTERS.length);
      }
      startAutoPlay();
    }
    touchStartXRef.current = null;
  };

  return (
    <section className="hero-section hero-banner-prominent" aria-label="Poomani Chekku Ennai Automatic Poster Showcase">
      <div className="container">
        <div className="poster-carousel-card">
          {/* Automatic Slider Frame */}
          <div
            className="poster-carousel-viewport"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="poster-carousel-track"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {POSTERS.map((poster, index) => (
                <div
                  key={poster.id}
                  className={`poster-carousel-slide ${index === currentIndex ? "active" : ""}`}
                  onClick={() => handlePosterClick(poster)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handlePosterClick(poster);
                  }}
                  title={`${poster.title} - Click to explore pure oils`}
                >
                  <img
                    src={poster.src}
                    alt={poster.alt}
                    className="poster-carousel-img"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Small Navigation Dots Below Slider */}
          <div className="poster-carousel-dots" role="tablist" aria-label="Poster carousel dots">
            {POSTERS.map((poster, index) => (
              <button
                key={poster.id}
                type="button"
                className={`poster-carousel-dot ${index === currentIndex ? "active" : ""}`}
                onClick={() => goToSlide(index)}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Show ${poster.title}`}
                title={`Poster ${index + 1}: ${poster.title}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
