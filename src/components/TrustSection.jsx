import React from "react";
import { Award, ShieldCheck, Heart, Receipt } from "lucide-react";

export const TrustSection = () => {
  return (
    <section className="trust-bar">
      <div className="container">
        <div className="trust-grid">
          <div className="trust-card">
            <div className="trust-icon-box">
              <Award size={22} />
            </div>
            <div className="trust-info">
              <h4>100% Pure & Natural</h4>
              <p>Natural edible oil extracted from premium whole coconut, sesame, and groundnut seeds.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <ShieldCheck size={22} />
            </div>
            <div className="trust-info">
              <h4>Unrefined & Unadulterated</h4>
              <p>Naturally settled and filtered. Zero chemical bleaching, zero artificial preservatives.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <Heart size={22} />
            </div>
            <div className="trust-info">
              <h4>Rich in Nutrients</h4>
              <p>Natural Vitamin E, plant sterols, and authentic culinary aroma preserved for healthy living.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <Receipt size={22} />
            </div>
            <div className="trust-info">
              <h4>Instant WhatsApp Billing</h4>
              <p>Direct itemized invoice generation with easy order confirmation on WhatsApp.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
