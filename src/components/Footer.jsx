import React from "react";
import { useShop } from "../context/ShopContext";
import { cleanWhatsAppNumber } from "../utils/billGenerator";
import { MapPin, Phone, Clock, ShieldCheck } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";

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
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#e5b94c", fontSize: "0.82rem", fontWeight: "600", marginTop: "0.75rem" }}>
              <ShieldCheck size={16} />
              <span>FSSAI License No: {shopSettings.fssaiNumber || "22426277000360"}</span>
            </div>

            {/* Official Instagram Profile */}
            <div style={{ marginTop: "0.85rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#c8d8ce", display: "block", marginBottom: "0.4rem", fontWeight: "600" }}>
                Official Instagram:
              </span>
              <a
                href="https://www.instagram.com/poomanichekkuennai?utm_source=qr&exln=bWt5ODFxaW4zdmhj"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-instagram-footer"
                title="Follow @poomanichekkuennai on Instagram"
                aria-label="Follow Poomani Chekku Ennai on Instagram"
              >
                <InstagramIcon size={17} color="#deb869" />
                <span>@poomanichekkuennai</span>
              </a>
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
              <div style={{ fontSize: "0.85rem", color: "#c8d8ce", lineHeight: "1.5" }}>
                <strong style={{ color: "#ffffff", display: "block", marginBottom: "0.15rem" }}>
                  MARIAPPAN C/O POOMANI CHEKKU ENNAI
                </strong>
                <div>28 UNION ROAD, KEELALINE,</div>
                <div>BRANCH POST OFFICE GOPALASAMUDRAM,</div>
                <div>CHERANMAHADEVI BLOCK,</div>
                <div>TIRUNELVELI, TAMIL NADU – 627414.</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Phone size={16} color="#e5b94c" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: "0.85rem", color: "#c8d8ce" }}>
                {shopSettings.phoneDisplay || "+91 63857 55368"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Clock size={16} color="#e5b94c" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ fontSize: "0.82rem", color: "#c8d8ce", lineHeight: "1.45" }}>
                <div><strong>Monday – Saturday:</strong> 09:00 AM – 08:00 PM</div>
                <div><strong>Sunday:</strong> 09:00 AM – 01:00 PM</div>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct */}
          <div className="footer-col">
            <h4>WhatsApp Orders</h4>
            <p style={{ fontSize: "0.85rem" }}>
              Direct WhatsApp ordering & quick customer support.
            </p>
            <a
              href={`https://wa.me/${cleanWhatsAppNumber(shopSettings?.whatsappNumber)}?text=Hello%2C%20I%20would%20like%20to%20order%20Poomani%20Chekku%20Ennai.`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-pill"
              style={{ display: "inline-flex", marginTop: "0.5rem" }}
            >
              💬 WhatsApp: {shopSettings?.phoneDisplay || (shopSettings?.whatsappNumber ? `+${shopSettings.whatsappNumber}` : "")}
            </a>

            {/* Social Media Link */}
            <div style={{ marginTop: "0.85rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#c8d8ce", display: "block", marginBottom: "0.4rem", fontWeight: "600" }}>
                Social Media:
              </span>
              <a
                href="https://www.instagram.com/poomanichekkuennai?utm_source=qr&exln=bWt5ODFxaW4zdmhj"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-instagram-footer"
                title="Follow @poomanichekkuennai on Instagram"
                aria-label="Follow Poomani Chekku Ennai on Instagram"
              >
                <InstagramIcon size={17} color="#deb869" />
                <span>Follow on Instagram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} {shopSettings.shopName} (<span style={{ fontFamily: "var(--font-tamil)" }}>{shopSettings.shopNameTamil && !shopSettings.shopNameTamil.includes("ஆயில்") ? shopSettings.shopNameTamil : "பூமணி செக்கு எண்ணெய்"}</span>). All rights reserved.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <span>100% Pure Chekku Ennai • Pure Quality • Direct WhatsApp Billing</span>
            <span style={{ color: "rgba(222, 184, 105, 0.4)" }}>•</span>
            <a
              href="https://www.instagram.com/poomanichekkuennai?utm_source=qr&exln=bWt5ODFxaW4zdmhj"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#deb869",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: "600",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              title="Official Instagram: @poomanichekkuennai"
            >
              <InstagramIcon size={14} color="#deb869" />
              <span>@poomanichekkuennai</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
