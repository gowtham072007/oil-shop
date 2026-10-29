import React from "react";
import { useShop } from "../context/ShopContext";
import { MessageCircle, Clock } from "lucide-react";

export const UnavailableOilCard = ({ oilDefinition }) => {
  const { shopSettings } = useShop();

  const waText = encodeURIComponent(
    `Hello ${shopSettings.shopName}, I would like to inquire about the availability of fresh ${oilDefinition.name} (${oilDefinition.regionalName}).`
  );
  const waUrl = `https://wa.me/${shopSettings.whatsappNumber}?text=${waText}`;

  return (
    <div className="product-card unavailable-card" id={`unavailable-${oilDefinition.id}`}>
      {/* Product Image Area */}
      <div className="product-image-wrap" style={{ position: "relative" }}>
        <img
          src={oilDefinition.defaultImage}
          alt={oilDefinition.name}
          loading="lazy"
          style={{ filter: "grayscale(15%)", opacity: 0.95 }}
        />

        {/* Top Badge */}
        <div className="card-top-badges">
          <span className="badge-stock out">
            Fresh Batch in Progress
          </span>
        </div>
      </div>

      {/* Body Details */}
      <div className="product-card-body">
        <div className="product-brand">{shopSettings.shopName || "Poomani Oils"}</div>

        <h3 className="product-title" style={{ cursor: "default" }}>
          {oilDefinition.name}
        </h3>

        <div className="product-regional-name">{oilDefinition.regionalName}</div>

        <div className="product-oil-type">
          <span>🌿 100% Pure Edible Oil</span>
        </div>

        <p className="product-desc-excerpt">{oilDefinition.description}</p>

        {/* Unavailable Notice Box */}
        <div
          style={{
            padding: "0.85rem",
            background: "#faf8f4",
            borderRadius: "10px",
            border: "1px dashed #d6cebf",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            fontSize: "0.82rem",
            color: "#6b7280",
          }}
        >
          <Clock size={16} color="#8c6819" style={{ flexShrink: 0, marginTop: "2px" }} />
          <div>
            <strong>Fresh batch arriving soon.</strong>
            <div>No pre-packaged stock is listed currently. You can inquire directly with the mill via WhatsApp.</div>
          </div>
        </div>

        {/* Action Button */}
        <div className="card-price-action-row" style={{ marginTop: "auto" }}>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-pill"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "0.65rem 1rem",
              fontSize: "0.88rem",
            }}
          >
            <MessageCircle size={16} />
            <span>Inquire on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
