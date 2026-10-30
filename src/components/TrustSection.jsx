import React, { useEffect, useRef, useState } from "react";
import { Award, ShieldCheck, Heart, Receipt } from "lucide-react";

export const TrustSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    // Graceful fallback for environments without IntersectionObserver
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

  const features = [
    {
      id: "feature-pure",
      icon: Award,
      title: "100% Pure & Natural",
      desc: "Natural edible oil extracted from premium whole coconut, sesame, and groundnut seeds.",
      delay: "0.08s",
    },
    {
      id: "feature-unrefined",
      icon: ShieldCheck,
      title: "Unrefined & Unadulterated",
      desc: "Naturally settled and filtered. Zero chemical bleaching, zero artificial preservatives.",
      delay: "0.20s",
    },
    {
      id: "feature-nutrients",
      icon: Heart,
      title: "Rich in Nutrients",
      desc: "Natural Vitamin E, plant sterols, and authentic culinary aroma preserved for healthy living.",
      delay: "0.32s",
    },
    {
      id: "feature-billing",
      icon: Receipt,
      title: "Instant WhatsApp Billing",
      desc: "Direct itemized invoice generation with easy order confirmation on WhatsApp.",
      delay: "0.44s",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className={`trust-bar ${isVisible ? "is-visible" : ""}`}
      aria-label="Key Oil Purity Highlights"
    >
      <div className="container">
        <div className="trust-grid">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="trust-card"
                style={{ "--card-delay": item.delay }}
              >
                <div className="trust-icon-box">
                  <Icon size={22} />
                </div>
                <div className="trust-info">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
