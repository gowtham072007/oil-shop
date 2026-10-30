import React, { useEffect, useRef, useState } from "react";

export const TrustSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    // Fallback for environments without IntersectionObserver
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`trust-bar ${isVisible ? "is-visible" : ""}`}
      aria-label="Poomani Chekku Ennai — 100% Pure & Natural Features"
    >
      <div className="container">
        <div className="trust-banner-wrap">
          <picture>
            <source
              type="image/png"
              srcSet="/images/trust_features_banner_4k.png"
            />
            <img
              src="/images/trust_features_banner.jpg"
              srcSet="/images/trust_features_banner.jpg 1x, /images/trust_features_banner_4k.png 2x"
              alt="Poomani Chekku Ennai Features: 100% Pure & Natural • Unrefined & Unadulterated • Rich in Nutrients • Instant WhatsApp Billing"
              className="trust-banner-img"
              loading="lazy"
              width="3840"
              height="740"
            />
          </picture>
        </div>
      </div>
    </section>
  );
};
