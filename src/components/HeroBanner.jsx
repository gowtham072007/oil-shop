import React from "react";
import { useShop } from "../context/ShopContext";
import { Sparkles, Check, ArrowRight } from "lucide-react";

export const HeroBanner = () => {
  const { shopSettings } = useShop();

  const scrollToCatalog = () => {
    const el = document.getElementById("oil-catalog-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          {/* Left Content */}
          <div className="hero-content">
            <div className="hero-badge-tag">
              <Sparkles size={14} />
              100% Pure & Natural Edible Oils • தூய சமையல் எண்ணெய்
            </div>

            <h2 className="hero-title">
              Pure Edible Cooking Oils,{" "}
              <span className="gold-highlight">Direct From Mill</span> To Your Kitchen
            </h2>

            <p className="hero-description">
              Naturally extracted edible cooking oils for wholesome everyday family meals.
              Enjoy the authentic natural aroma, golden clarity, and natural nutrients
              of pure Coconut Oil, Sesame Oil, and Groundnut Oil.
              Zero chemical refining, zero artificial additives, zero preservatives.
            </p>

            {/* USPs Row */}
            <div className="hero-usp-row">
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>100% Pure & Unrefined</span>
              </div>
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>Zero Chemical Additives</span>
              </div>
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>FSSAI Certified Quality</span>
              </div>
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>Instant WhatsApp Billing</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="hero-cta-group">
              <button
                id="hero-shop-now-btn"
                className="btn-primary-glow"
                onClick={scrollToCatalog}
              >
                Browse Our 3 Pure Oils
                <ArrowRight size={18} />
              </button>

              <a
                href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
                  shopSettings.shopName
                )}%2C%20I%20would%20like%20to%20order%20pure%20edible%20cooking%20oils.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary-outline"
              >
                <span>💬 Order on WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Visual Photo Card */}
          <div className="hero-visual-card">
            <img
              src="/images/hero_banner.jpg"
              alt="Poomani Oils - Pure Coconut Oil, Sesame Oil, and Groundnut Oil"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
