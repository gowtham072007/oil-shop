import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import {
  formatINR,
  generateWhatsAppOrderBillText,
  openWhatsAppOrder,
  getStandardOilNames,
  PERMANENT_ADMIN_WHATSAPP,
  PERMANENT_ADMIN_WHATSAPP_DISPLAY,
} from "../utils/billGenerator";
import {
  X,
  Copy,
  Check,
  Send,
  FileText,
  Receipt,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

export const BillPreviewModal = () => {
  const {
    previewOrder,
    setPreviewOrder,
    confirmOrderRedirect,
    clearCart,
    shopSettings,
    showNotification,
  } = useShop();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("bill"); // 'bill' | 'text'
  const [isSent, setIsSent] = useState(false);

  if (!previewOrder) return null;

  const billText =
    previewOrder.billText ||
    generateWhatsAppOrderBillText(previewOrder, shopSettings);

  const handleCopyBill = () => {
    if (billText) {
      navigator.clipboard.writeText(billText);
      setCopied(true);
      showNotification("Order Bill message copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Primary action: Send Order on WhatsApp
   * 1. Records confirmation
   * 2. Clears shopping cart
   * 3. Launches WhatsApp directed to fixed store owner number (+91 6385755368)
   * 4. Pre-fills the structured Customer Order Bill message for the customer to review and press Send
   */
  const handleSendToWhatsApp = () => {
    confirmOrderRedirect(previewOrder.orderNumber);
    clearCart();
    setIsSent(true);

    showNotification(
      `Opening WhatsApp with order bill addressed to +91 63857 55368...`,
      "info"
    );

    // Open WhatsApp with prefilled Customer Order Bill
    openWhatsAppOrder(PERMANENT_ADMIN_WHATSAPP, billText);
  };

  const items = previewOrder.items || [];
  const totalItems = items.reduce(
    (sum, it) => sum + (parseInt(it.quantity, 10) || 1),
    0
  );

  return (
    <div className="modal-backdrop" onClick={() => setPreviewOrder(null)}>
      <div
        className="bill-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-modal-title"
        style={{ maxWidth: "700px" }}
      >
        {/* Modal Header */}
        <div className="bill-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt size={22} color="#deb869" />
            <h3 id="bill-modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
              Customer Order Bill ({previewOrder.orderNumber})
            </h3>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setPreviewOrder(null)}
            aria-label="Close bill preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="bill-modal-body">
          {/* RECIPIENT BANNER: CLEARLY CONFIRMS FIXED ADMIN DESTINATION */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "0.65rem 1rem",
              marginBottom: "1rem",
              fontSize: "0.82rem",
              color: "#166534",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <Send size={15} color="#16a34a" />
              <span>
                <strong>WhatsApp Order Recipient:</strong> Store Owner ({PERMANENT_ADMIN_WHATSAPP_DISPLAY})
              </span>
            </div>
            <div style={{ color: "#15803d", fontSize: "0.78rem" }}>
              Customer: <strong>{previewOrder.customerName}</strong> ({previewOrder.customerPhone})
            </div>
          </div>

          {/* STATUS NOTIFICATION IF OPENED */}
          {isSent && (
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                marginBottom: "1.25rem",
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.08)",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <CheckCircle size={22} color="#16a34a" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: "#166534", fontSize: "0.95rem" }}>
                  WhatsApp Opened with Order Bill!
                </strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#15803d" }}>
                  Your bill for order <strong>#{previewOrder.orderNumber}</strong> is ready. Please tap <strong>Send</strong> in WhatsApp to deliver the order to the store owner ({PERMANENT_ADMIN_WHATSAPP_DISPLAY}).
                </p>
              </div>
            </div>
          )}

          {/* VIEW TOGGLE TABS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.35rem", background: "#ede8dd", padding: "3px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("bill")}
                style={{
                  background: activeTab === "bill" ? "#ffffff" : "transparent",
                  color: activeTab === "bill" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: activeTab === "bill" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <FileText size={14} />
                <span>Order Bill View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("text")}
                style={{
                  background: activeTab === "text" ? "#ffffff" : "transparent",
                  color: activeTab === "text" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: activeTab === "text" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Receipt size={14} />
                <span>WhatsApp Text Format</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyBill}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.78rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "#1e293b",
              }}
            >
              {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Bill Text"}</span>
            </button>
          </div>

          {/* TAB 1: PROFESSIONAL CUSTOMER ORDER BILL LAYOUT */}
          {activeTab === "bill" && (
            <div
              className="invoice-paper"
              style={{
                padding: "1.25rem",
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
              }}
            >
              {/* 1. Header */}
              <div
                style={{
                  textAlign: "center",
                  borderBottom: "2px solid #09331d",
                  paddingBottom: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#09331d", letterSpacing: "0.5px" }}>
                  🌿 POOMANI CHEKKU ENNAI
                </div>
                <div style={{ fontSize: "0.95rem", color: "#b45309", fontWeight: "700", margin: "2px 0 6px 0" }}>
                  பூமணி செக்கு எண்ணெய்
                </div>
                <div
                  style={{
                    display: "inline-block",
                    background: "#09331d",
                    color: "#deb869",
                    padding: "0.2rem 1.1rem",
                    borderRadius: "4px",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    letterSpacing: "1px",
                  }}
                >
                  CUSTOMER ORDER BILL
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "0.75rem",
                    fontSize: "0.82rem",
                    color: "#475569",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <span>
                    <strong>Order No:</strong>{" "}
                    <code
                      style={{
                        background: "#f1f5f9",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        color: "#09331d",
                        fontWeight: "700",
                      }}
                    >
                      {previewOrder.orderNumber}
                    </code>
                  </span>
                  <span>
                    <strong>Date & Time:</strong> {previewOrder.date}
                  </span>
                </div>
              </div>

              {/* 2. Customer Details */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.85rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "1rem",
                  fontSize: "0.84rem",
                }}
              >
                <strong
                  style={{
                    color: "#09331d",
                    fontSize: "0.82rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  *CUSTOMER DETAILS*
                </strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem 1rem" }}>
                  <div>
                    <strong>Name:</strong> {previewOrder.customerName || "Valued Customer"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {previewOrder.customerPhone || "—"}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <strong>Address:</strong>{" "}
                    {previewOrder.customerAddress || previewOrder.address || "—"}
                  </div>
                  {previewOrder.customerCity && (
                    <div>
                      <strong>City:</strong> {previewOrder.customerCity}
                    </div>
                  )}
                  {previewOrder.customerPincode && (
                    <div>
                      <strong>Pincode:</strong> {previewOrder.customerPincode}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Order Items */}
              <div style={{ marginBottom: "1rem" }}>
                <strong
                  style={{
                    color: "#09331d",
                    fontSize: "0.82rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  *ORDER ITEMS*
                </strong>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {items.map((item, idx) => {
                    const sNo = idx + 1;
                    const std = getStandardOilNames(item.name, item.regionalName);
                    const packSize = item.packSize || item.selectedVariant?.size || "1 Litre";
                    const hasSize =
                      std.combined.toLowerCase().includes(packSize.toLowerCase()) ||
                      /\b(200\s*ml|500\s*ml|1\s*litre|1\s*l|5\s*litre|5\s*l)\b/i.test(std.combined);
                    const itemTitle = hasSize ? std.combined : `${std.combined} – ${packSize}`;
                    const rate = Number(item.rate || item.price || 0);
                    const amount = Number(item.amount || rate * (item.quantity || 1));

                    return (
                      <div
                        key={idx}
                        style={{
                          background: "#fcfbf7",
                          border: "1px solid #ebd9b5",
                          borderRadius: "6px",
                          padding: "0.6rem 0.85rem",
                          fontSize: "0.84rem",
                        }}
                      >
                        <div style={{ fontWeight: "700", color: "#09331d", marginBottom: "3px" }}>
                          {sNo}. {itemTitle}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "1.5rem",
                            fontSize: "0.8rem",
                            color: "#475569",
                            marginLeft: "1rem",
                          }}
                        >
                          <span>
                            Quantity: <strong>{item.quantity}</strong>
                          </span>
                          <span>
                            Rate: <strong>₹{formatINR(rate)}</strong>
                          </span>
                          <span>
                            Amount: <strong>₹{formatINR(amount)}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Totals & Payment Method */}
              <div
                style={{
                  borderTop: "2px solid #09331d",
                  paddingTop: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ maxWidth: "340px", marginLeft: "auto", fontSize: "0.88rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span>Total Items:</span>
                    <strong>{totalItems}</strong>
                  </div>
                  {previewOrder.discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#16a34a" }}>
                      <span>Discount:</span>
                      <span>-₹{formatINR(previewOrder.discount)}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0 4px 0",
                      borderTop: "1px dashed #cbd5e1",
                      marginTop: "6px",
                      fontSize: "1.1rem",
                      fontWeight: "800",
                      color: "#09331d",
                    }}
                  >
                    <span>Grand Total:</span>
                    <span>₹{formatINR(previewOrder.grandTotal)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      fontSize: "0.84rem",
                      color: "#475569",
                    }}
                  >
                    <span>Payment Method:</span>
                    <strong>{previewOrder.paymentMethod || "Cash"}</strong>
                  </div>
                </div>
              </div>

              {/* 5. Footer */}
              <div
                style={{
                  textAlign: "center",
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "0.75rem",
                  fontSize: "0.82rem",
                  color: "#475569",
                }}
              >
                <div>Thank you for choosing</div>
                <div style={{ fontWeight: "800", color: "#09331d", marginTop: "2px" }}>
                  POOMANI CHEKKU ENNAI
                </div>
                <div style={{ fontWeight: "700", color: "#b45309", marginTop: "2px" }}>
                  நன்றி! 🙏
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP FORMATTED MESSAGE */}
          {activeTab === "text" && (
            <div>
              <div
                style={{
                  marginBottom: "0.5rem",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  color: "#09331d",
                }}
              >
                WhatsApp Message (Pre-formatted text forwarded to shop):
              </div>
              <pre
                style={{
                  background: "#f8fafc",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "0.82rem",
                  fontFamily: "Consolas, Menlo, Monaco, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: "1.5",
                  maxHeight: "380px",
                  overflowY: "auto",
                  color: "#0f172a",
                }}
              >
                {billText}
              </pre>
            </div>
          )}
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="bill-modal-actions">
          {/* Copy Bill Text */}
          <button
            id="copy-invoice-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleCopyBill}
            title="Copy formatted WhatsApp bill message"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Bill Text"}</span>
          </button>

          {/* Primary CTA: Send Order on WhatsApp */}
          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className="btn-proceed-wa"
            onClick={handleSendToWhatsApp}
            title="Open WhatsApp directed to store owner (+91 63857 55368) with prefilled order bill"
          >
            <Send size={18} />
            <span>Send Order on WhatsApp</span>
          </button>
        </div>

        {/* Post-submission note */}
        {isSent && (
          <div
            style={{
              padding: "0.85rem 1.25rem",
              background: "#ecfdf5",
              borderTop: "1px solid #a7f3d0",
              color: "#065f46",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Check size={17} color="#059669" />
              <span>Order Bill routed to WhatsApp (+91 63857 55368). Please tap Send in WhatsApp.</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOrder(null)}
              style={{
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.4rem 0.95rem",
                fontSize: "0.82rem",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Done / Return to Shop
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
