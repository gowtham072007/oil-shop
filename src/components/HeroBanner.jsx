import React from "react";

export const HeroBanner = () => {
  const scrollToCatalog = () => {
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero-section hero-banner-prominent">
      <div className="container">
        <div
          className="hero-full-banner-wrap"
          onClick={scrollToCatalog}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              scrollToCatalog();
            }
          }}
          title="Poomani Chekku Ennai - Click to browse our 3 pure oils: Coconut, Sesame, and Groundnut"
        >
          <img
            src="/images/hero_banner.jpg"
            alt="Poomani Chekku Ennai — பூமணி செக்கு எண்ணெய் | Pure. Natural. Traditional. 100% Pure & Unrefined Edible Cooking Oils (Coconut Oil, Sesame Oil, Groundnut Oil)"
            className="hero-full-banner-img"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};
