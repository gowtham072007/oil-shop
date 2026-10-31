import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { Plus, Minus, ShoppingBag, Check } from "lucide-react";

export const ProductCard = ({ product }) => {
  const { addToCart, setQuickViewProduct, shopSettings } = useShop();

  // Selected Pack Size / Variant
  const variants = product.variants && product.variants.length > 0
    ? product.variants
    : [{ id: "v-default", size: "1 Litre", price: product.price || 300, stock: 10, unit: "Bottle" }];

  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [isAddedAnim, setIsAddedAnim] = useState(false);

  // Extract display size (e.g., "200 ml", "500 ml", "1 Litre")
  const displaySize = selectedVariant?.size || (product.name.match(/\b(200\s*ml|500\s*ml|1\s*Litre|1\s*L)\b/i)?.[0]) || "1 Litre";

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
            {product.featured && <span className="badge-tag">⭐ Popular</span>}
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

        {/* Prominent Bottle Quantity / Size Badge on Photo */}
        <div className="photo-quantity-pill">
          {displaySize}
        </div>
      </div>

      {/* Body Details */}
      <div className="product-card-body">
        <div className="product-brand">{product.brand || shopSettings.shopName || "Poomani Chekku Ennai"}</div>

        <h3
          className="product-title"
          onClick={() => setQuickViewProduct(product)}
        >
          {product.name}
        </h3>

        {product.regionalName && (
          <div className="product-regional-name">{product.regionalName}</div>
        )}

        {/* Clear Quantity Highlight Tag */}
        <div className="product-pack-size-highlight">
          <span className="pack-label">Quantity / அளவு:</span>
          <span className="pack-val">{displaySize}</span>
        </div>

        <div className="product-oil-type" style={{ marginBottom: "0.85rem" }}>
          <span>🌿 100% Pure Edible Oil</span>
        </div>

        {/* Pack Size Selector (when multiple variants exist) */}
        {variants.length > 1 && (
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
        )}

        {/* Price & Quantity Stepper Row */}
        <div className="card-price-action-row" style={{ alignItems: "center", marginBottom: "0.5rem" }}>
          <div className="product-price-box">
            <span className="product-price-value">₹{formatINR(selectedVariant.price)}</span>
            <span className="product-price-unit">
              per {displaySize} ({selectedVariant.unit || "Bottle"})
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

        {/* Action: Full Width Add to Cart */}
        <div style={{ marginTop: "0.65rem", width: "100%" }}>
          <button
            id={`add-to-cart-${product.id}`}
            type="button"
            className="btn-add-cart"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "0.65rem 1rem",
              fontSize: "0.9rem",
              borderRadius: "8px",
            }}
          >
            {isAddedAnim ? (
              <>
                <Check size={16} />
                Added to Cart!
              </>
            ) : isOutOfStock ? (
              "Sold Out"
            ) : (
              <>
                <ShoppingBag size={16} />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
