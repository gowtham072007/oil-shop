import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { Plus, Minus, ShoppingBag, Eye, Check, AlertCircle } from "lucide-react";

export const ProductCard = ({ product }) => {
  const { addToCart, setQuickViewProduct } = useShop();

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

  return (
    <div className="product-card" id={`product-${product.id}`}>
      {/* Product Image Area */}
      <div
        className="product-image-wrap"
        onClick={() => setQuickViewProduct(product)}
        title="Click to view detailed extraction & nutritional facts"
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
        <div className="product-brand">{product.brand || "Traditional Mill"}</div>

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
          <span>🌿 {product.oilType}</span>
        </div>

        <p className="product-desc-excerpt">{product.description}</p>

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

        {/* Price & Action Row */}
        <div className="card-price-action-row">
          <div className="product-price-box">
            <span className="product-price-value">₹{formatINR(selectedVariant.price)}</span>
            <span className="product-price-unit">
              per {selectedVariant.size} ({selectedVariant.unit || "Bottle"})
            </span>
          </div>

          {/* Stepper + Add to Cart */}
          <div className="card-controls-group">
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

            <button
              id={`add-to-cart-${product.id}`}
              type="button"
              className="btn-add-cart"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              {isAddedAnim ? (
                <>
                  <Check size={16} />
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
          </div>
        </div>
      </div>
    </div>
  );
};
