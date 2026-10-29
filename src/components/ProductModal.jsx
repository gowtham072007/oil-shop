import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { sanitizeCustomerText } from "../utils/customerOilFilter";
import { X, CheckCircle, ShoppingBag, ShieldCheck, Plus, Minus } from "lucide-react";

export const ProductModal = () => {
  const { quickViewProduct, setQuickViewProduct, addToCart } = useShop();

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [{ id: "v-default", size: "1 Litre", price: product.price || 300, stock: 10, unit: "Bottle" }];

  const activeVariant = selectedVariant && variants.some(v => v.id === selectedVariant.id)
    ? selectedVariant
    : variants[0];

  const handleAdd = () => {
    addToCart(product, activeVariant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="modal-backdrop" onClick={() => setQuickViewProduct(null)}>
      <div
        className="quick-view-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="cart-drawer-header">
          <h3>
            <ShieldCheck size={20} color="#e5b94c" />
            Product Details & Quality Highlights
          </h3>
          <button
            type="button"
            className="btn-close"
            onClick={() => setQuickViewProduct(null)}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="quick-view-grid">
          <div className="quick-view-media">
            <img src={product.image} alt={product.name} />
          </div>

          <div className="quick-view-content">
            <div className="product-brand">{product.brand || "Poomani Chekku Ennai"}</div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.25rem", color: "#09331d" }}>
              {product.name}
            </h2>
            {product.regionalName && (
              <div style={{ color: "#8c6819", fontWeight: "600", marginBottom: "0.5rem" }}>
                {product.regionalName}
              </div>
            )}

            <div className="product-oil-type" style={{ marginBottom: "1rem" }}>
              <span>🌿 100% Pure Edible Oil</span>
            </div>

            <p style={{ fontSize: "0.92rem", color: "#57655d", marginBottom: "1.25rem", lineHeight: "1.55" }}>
              {sanitizeCustomerText(product.description)}
            </p>

            {/* Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <h4 style={{ fontSize: "0.88rem", fontWeight: "700", marginBottom: "0.5rem", color: "#09331d" }}>
                  Key Purity & Health Highlights:
                </h4>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {product.benefits.map((b, idx) => (
                    <li
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.84rem",
                        color: "#1f2923",
                      }}
                    >
                      <CheckCircle size={15} color="#124e2c" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pack Size Choices */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div className="pack-size-label">Select Pack Size:</div>
              <div className="pack-size-pills">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`size-pill-btn ${activeVariant.id === v.id ? "active" : ""}`}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {v.size} — ₹{formatINR(v.price)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Price & Add to Cart */}
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "1rem",
                borderTop: "1px solid #e8e0d2",
              }}
            >
              <div>
                <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#09331d" }}>
                  ₹{formatINR(activeVariant.price)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#85958c" }}>
                  Includes all local taxes • FSSAI compliant
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div className="qty-stepper" style={{ height: "42px" }}>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-add-cart"
                  onClick={handleAdd}
                  style={{ padding: "0.75rem 1.4rem", fontSize: "0.95rem" }}
                >
                  {added ? (
                    <>
                      <CheckCircle size={18} />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
