import React from "react";
import { useShop } from "../context/ShopContext";
import { cleanWhatsAppNumber } from "../utils/billGenerator";
import { MapPin, Phone, Clock, ShieldCheck } from "lucide-react";

export const Footer = () => {
  const { shopSettings, setSelectedCategory } = useShop();

  return (
    <footer className="shop-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Shop Column */}
          <div className="footer-col">
            <h4 style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <img
                  src="/images/logo.png"
                  alt="Poomani Chekku Ennai Logo"
                  style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "50%", flexShrink: 0 }}
                />
                {shopSettings.shopName || "Poomani Chekku Ennai"}
              </span>
              <span style={{ fontSize: "0.92rem", color: "#e5b94c", paddingLeft: "2.6rem", fontWeight: "600", fontFamily: "var(--font-tamil)" }}>
                {shopSettings.shopNameTamil && !shopSettings.shopNameTamil.includes("ஆயில்")
                  ? shopSettings.shopNameTamil
                  : "பூமணி செக்கு எண்ணெய்"}
              </span>
            </h4>
            <p>
              Wholesome edible cooking oils crafted with pure quality and honesty.
              100% unadulterated, unrefined, and packed with everyday natural nutrition.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#e5b94c", fontSize: "0.82rem", fontWeight: "600", marginTop: "0.5rem" }}>
              <ShieldCheck size={16} />
              <span>FSSAI License No: {shopSettings.fssaiNumber || "12421008000421"}</span>
            </div>
          </div>

          {/* Quick Categories */}
          <div className="footer-col">
            <h4>Our Three Pure Oils</h4>
            <ul>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("coconut")}
                >
                  Coconut Oil — தேங்காய் எண்ணெய்
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("sesame")}
                >
                  Sesame Oil — நல்லெண்ணெய்
                </a>
              </li>
              <li>
                <a
                  href="#oil-catalog-section"
                  onClick={() => setSelectedCategory("groundnut")}
                >
                  Groundnut Oil — கடலை எண்ணெய்
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
              href={`https://wa.me/${cleanWhatsAppNumber(shopSettings?.whatsappNumber)}?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20pure%20edible%20cooking%20oils.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-pill"
              style={{ display: "inline-flex", marginTop: "0.5rem" }}
            >
              💬 WhatsApp: {shopSettings?.phoneDisplay || (shopSettings?.whatsappNumber ? `+${shopSettings.whatsappNumber}` : "")}
            </a>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} {shopSettings.shopName} (<span style={{ fontFamily: "var(--font-tamil)" }}>{shopSettings.shopNameTamil && !shopSettings.shopNameTamil.includes("ஆயில்") ? shopSettings.shopNameTamil : "பூமணி செக்கு எண்ணெய்"}</span>). All rights reserved. Pure edible chekku ennai.
          </div>
          <div>
            100% Pure Edible Chekku Ennai • Pure Quality • Direct WhatsApp Billing
          </div>
        </div>
      </div>
    </footer>
  );
};
