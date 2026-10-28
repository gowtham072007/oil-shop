import React from "react";
import { useShop } from "../context/ShopContext";
import { MapPin, Phone, Mail, Clock, ShieldCheck, Heart } from "lucide-react";

export const Footer = () => {
  const { shopSettings, setSelectedCategory } = useShop();

  return (
    <footer className="shop-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Shop Column */}
          <div className="footer-col">
            <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🪔 {shopSettings.shopName}
            </h4>
            <p>
              Preserving ancient South Indian wood pestle (Mara Chekku) oil extraction traditions.
              Pure, unheated, unrefined, and full of natural life-giving nutrition.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#e5b94c", fontSize: "0.82rem", fontWeight: "600", marginTop: "0.5rem" }}>
              <ShieldCheck size={16} />
              <span>FSSAI License No: {shopSettings.fssaiNumber || "12421008000421"}</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="footer-col">
            <h4>Traditional Oils</h4>
            <ul>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("groundnut")}
                >
                  Wood-Pressed Groundnut Oil
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("sesame")}
                >
                  Pure Sesame / Gingelly Oil
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("coconut")}
                >
                  Cold-Pressed Virgin Coconut Oil
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("mustard")}
                >
                  Raw Kachi Ghani Mustard Oil
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("pooja")}
                >
                  Pancha Deepam Pooja Oil
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="footer-col">
            <h4>Mill & Shop Address</h4>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <MapPin size={18} color="#e5b94c" style={{ flexShrink: 0, marginTop: "2px" }} />
              <span style={{ fontSize: "0.85rem", color: "#c8d8ce" }}>
                {shopSettings.address}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Phone size={16} color="#e5b94c" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", color: "#c8d8ce" }}>
                {shopSettings.phoneDisplay || "+91 98765 43210"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Clock size={16} color="#e5b94c" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: "#c8d8ce" }}>
                {shopSettings.workingHours}
              </span>
            </div>
          </div>

          {/* WhatsApp Direct */}
          <div className="footer-col">
            <h4>WhatsApp Orders</h4>
            <p style={{ fontSize: "0.85rem" }}>
              Need bulk quantity for marriages, functions, or temples? Chat directly with the oil master on WhatsApp!
            </p>
            <a
              href={`https://wa.me/${shopSettings.whatsappNumber}?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20cold%20pressed%20oils.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-pill"
              style={{ display: "inline-flex", marginTop: "0.5rem" }}
            >
              💬 WhatsApp: {shopSettings.whatsappNumber}
            </a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} {shopSettings.shopName}. All rights reserved. Made with purity & tradition.
          </div>
          <div>
            100% Mara Chekku • Unrefined • Zero Hexane • Direct WhatsApp Billing
          </div>
        </div>
      </div>
    </footer>
  );
};
