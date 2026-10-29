import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { sanitizeCustomerText } from "../utils/customerOilFilter";
import { Plus, Minus, ShoppingBag, Check, MessageCircle } from "lucide-react";

export const ProductCard = ({ product }) => {
  const { addToCart, setQuickViewProduct, shopSettings } = useShop();

  // Selected Pack Size / Variant
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [{ id: "v-default", size: "1 Litre", price: product.price || 300, stock: 10, unit: "Bottle" }];

  const [selectedVariant, setSelectedVariant] = useState(variants[1] || variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isAddedAnim, setIsAddedAnim] = useState(false);

  // Stock status logic
  const currentStock = selectedVariant.stock ?? 10;
  const isOutOfStock = !product.inStock || currentStock <= 0;
  const isLowStock = !isOutOfStock && currentStock <= 5;

  const handleIncrement = () => {
    if (quantity < currentStock) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedVariant, quantity);
    setIsAddedAnim(true);
    setTimeout(() => {
      setIsAddedAnim(false);
      setQuantity(1);
    }, 1200);
  };

  const lineTotal = (selectedVariant.price || 0) * quantity;
  const productWaText = encodeURIComponent(
    `Hello ${shopSettings.shopName}, I would like to order:\n` +
    `• Product: ${product.name} (${product.regionalName || ""})\n` +
    `• Pack Size: ${selectedVariant.size}\n` +
    `• Quantity: ${quantity}\n` +
    `• Price: ₹${formatINR(lineTotal)}\n\n` +
    `Please confirm availability and delivery details.`
  );
  const productWaUrl = `https://wa.me/${shopSettings.whatsappNumber}?text=${productWaText}`;

  return (
    <div className="product-card" id={`product-${product.id}`}>
      {/* Product Image Area */}
      <div
        className="product-image-wrap"
        onClick={() => setQuickViewProduct(product)}
        title="Click to view detailed product information"
      >
        <img src={product.image} alt={product.name} loading="lazy" />

        {/* Top Badges */}
        <div className="card-top-badges">
          <div className="d-flex flex-column gap-1">
            {product.featured && <span className="badge-tag">⭐ Best Seller</span>}
          </div>

          <span
            className={`badge-stock ${
              isOutOfStock ? "out" : isLowStock ? "low" : "in"
            }`}
          >
            {isOutOfStock
              ? "Out of Stock"
              : isLowStock
              ? `Only ${currentStock} left`
              : "In Stock"}
          </span>
        </div>
      </div>

      {/* Body Details */}
      <div className="product-card-body">
        <div className="product-brand">{product.brand || shopSettings.shopName || "Poomani Oils"}</div>

        <h3
          className="product-title"
          onClick={() => setQuickViewProduct(product)}
        >
          {product.name}
        </h3>

        {product.regionalName && (
          <div className="product-regional-name">{product.regionalName}</div>
        )}

        <div className="product-oil-type">
          <span>🌿 100% Pure Edible Oil</span>
        </div>

        <p className="product-desc-excerpt">{sanitizeCustomerText(product.description)}</p>

        {/* Pack Size Selector */}
        <div className="pack-size-selector-wrap">
          <div className="pack-size-label">Select Pack Size:</div>
          <div className="pack-size-pills">
            {variants.map((v) => {
              const isSelected = selectedVariant.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={`size-pill-btn ${isSelected ? "active" : ""}`}
                  onClick={() => {
                    setSelectedVariant(v);
                    setQuantity(1);
                  }}
                  title={`₹${v.price} / ${v.size}`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price & Quantity Stepper Row */}
        <div className="card-price-action-row" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
          <div className="product-price-box">
            <span className="product-price-value">₹{formatINR(selectedVariant.price)}</span>
            <span className="product-price-unit">
              per {selectedVariant.size} ({selectedVariant.unit || "Bottle"})
            </span>
          </div>

          {/* Stepper */}
          <div className="qty-stepper">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1 || isOutOfStock}
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="qty-val">{quantity}</span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={quantity >= currentStock || isOutOfStock}
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Dual Actions: Add to Cart + Order on WhatsApp */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.6rem" }}>
          <button
            id={`add-to-cart-${product.id}`}
            type="button"
            className="btn-add-cart"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={{ width: "100%", justifyContent: "center", padding: "0.6rem 0.5rem", fontSize: "0.84rem" }}
          >
            {isAddedAnim ? (
              <>
                <Check size={15} />
                Added!
              </>
            ) : isOutOfStock ? (
              "Sold Out"
            ) : (
              <>
                <ShoppingBag size={15} />
                Add to Cart
              </>
            )}
          </button>

          <a
            href={productWaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-pill"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "0.6rem 0.5rem",
              fontSize: "0.84rem",
              whiteSpace: "nowrap",
            }}
            title={`Order ${product.name} on WhatsApp`}
          >
            <MessageCircle size={15} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
};
