import React from "react";

/**
 * 1. Main Homepage Banner
 * Image: Poomani Natural Oils Banner(1).png (/images/poomani_natural_oils_banner.jpg)
 * - Display as the main hero banner at the top of the homepage.
 * - Show the Poomani brand name and all three oil products.
 * - Make it full-width and responsive.
 * - Maintain the original image quality and aspect ratio.
 */
export const HeroBanner = () => {
  const scrollToCatalog = () => {
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      className="hero-section hero-banner-prominent"
      aria-label="Poomani Chekku Ennai Main Hero Banner"
    >
      <div className="container">
        <div
          className="hero-main-banner-card"
          onClick={scrollToCatalog}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") scrollToCatalog();
          }}
          title="Poomani Chekku Ennai — Pure Natural Traditional Cold-Pressed Oils. Click to browse & order."
        >
          <img
            src="/images/poomani_natural_oils_banner.jpg"
            alt="Poomani Chekku Ennai — Pure. Natural. Traditional. Cold-Pressed Coconut Oil, Sesame Oil, and Groundnut Oil"
            className="hero-main-banner-img"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};
