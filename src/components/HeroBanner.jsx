import React from "react";
import { useShop } from "../context/ShopContext";
import { Sparkles, Check, ArrowRight, ShieldCheck, HeartHandshake } from "lucide-react";

export const HeroBanner = () => {
  const { shopSettings, setIsCartOpen } = useShop();

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
              100% Traditional Vaagai Wood Churned (Mara Chekku)
            </div>

            <h2 className="hero-title">
              Purest Cold-Pressed Oils,{" "}
              <span className="gold-highlight">Direct From Mill</span> To Your Kitchen
            </h2>

            <p className="hero-description">
              Crushed at low RPM in traditional wooden pestles below 40°C.
              Retains natural antioxidants, authentic rural flavor, golden clarity,
              and rich vitamins. Zero chemical refining, zero mineral oils, zero preservatives.
            </p>

            {/* USPs Row */}
            <div className="hero-usp-row">
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>Traditional Wood Chekku</span>
              </div>
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>Unbleached & Unrefined</span>
              </div>
              <div className="hero-usp-item">
                <span className="check-icon">
                  <Check size={14} />
                </span>
                <span>FSSAI Certified Purity</span>
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
                Browse Fresh Oils
                <ArrowRight size={18} />
              </button>

              <a
                href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%20${encodeURIComponent(
                  shopSettings.shopName
                )}%2C%20I%20would%20like%20to%20order%20cold%20pressed%20oils.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary-outline"
              >
                <span>💬 Direct Mill WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Right Visual Photo Card */}
          <div className="hero-visual-card">
            <img
              src="/images/hero_banner.jpg"
              alt="Traditional Indian Cold Pressed Oils in Glass Bottles and Brass Urns"
              loading="eager"
            />
            <div className="hero-visual-overlay">
              <div className="caption-title">Heritage Stone & Wood Cold Press</div>
              <div className="caption-sub">
                Groundnut • Sesame (Gingelly) • Virgin Coconut • Mustard • Pooja Deepam
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
