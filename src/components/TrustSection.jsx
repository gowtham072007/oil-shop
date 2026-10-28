import React from "react";
import { Award, ShieldCheck, Heart, Truck } from "lucide-react";

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
              <h4>Vaagai Mara Chekku</h4>
              <p>Traditional wood pestle rotates slowly under 40°C to preserve vital nutrients.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <ShieldCheck size={22} />
            </div>
            <div className="trust-info">
              <h4>100% Unrefined & Pure</h4>
              <p>Naturally settled through cotton muslin cloth. Zero chemical bleaching or hexane.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <Heart size={22} />
            </div>
            <div className="trust-info">
              <h4>Rich in Antioxidants</h4>
              <p>Natural Vitamin E, plant sterols, and authentic nutty aroma preserved intact.</p>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-icon-box">
              <Truck size={22} />
            </div>
            <div className="trust-info">
              <h4>WhatsApp Billing & Delivery</h4>
              <p>Instant itemized WhatsApp invoice generation with prompt door delivery.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
