import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import {
  formatINR,
  numberToIndianRupeesWords,
  generateWhatsAppTaxInvoiceText,
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
  Sparkles,
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
  const [activeTab, setActiveTab] = useState("invoice"); // 'invoice' | 'text'
  const [isSent, setIsSent] = useState(false);

  if (!previewOrder) return null;

  const invoiceText =
    previewOrder.billText ||
    generateWhatsAppTaxInvoiceText(previewOrder, shopSettings);

  const handleCopyInvoice = () => {
    if (invoiceText) {
      navigator.clipboard.writeText(invoiceText);
      setCopied(true);
      showNotification("Tax Invoice message copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Primary action: Send Order on WhatsApp
   * 1. Records confirmation
   * 2. Clears shopping cart
   * 3. Launches WhatsApp directed to fixed store owner number (+91 6385755368)
   * 4. Pre-fills the structured Tax Invoice message for the customer to review and press Send
   */
  const handleSendToWhatsApp = () => {
    confirmOrderRedirect(previewOrder.orderNumber);
    clearCart();
    setIsSent(true);

    showNotification(
      `Opening WhatsApp with Tax Invoice addressed to +91 63857 55368...`,
      "success"
    );

    // Open WhatsApp with prefilled Tax Invoice
    openWhatsAppOrder(PERMANENT_ADMIN_WHATSAPP, invoiceText);
  };

  const items = previewOrder.items || [];
  const taxableValue = Math.max(
    0,
    (Number(previewOrder.subtotal) || 0) - (Number(previewOrder.discount) || 0)
  );
  const gstRate = Number(shopSettings?.gstRate) || 0;
  const hasGst = Boolean(shopSettings?.gstin && gstRate > 0);
  const halfRate = hasGst ? (gstRate / 2).toFixed(1) : "0";
  const halfTax = hasGst ? Math.round((taxableValue * (gstRate / 2)) / 100) : 0;
  const totalTax = halfTax * 2;
  const amountInWords = numberToIndianRupeesWords(previewOrder.grandTotal);

  return (
    <div className="modal-backdrop" onClick={() => setPreviewOrder(null)}>
      <div
        className="bill-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-modal-title"
        style={{ maxWidth: "720px" }}
      >
        {/* Modal Header */}
        <div className="bill-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt size={22} color="#e5b94c" />
            <h3 id="bill-modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
              Customer Tax Invoice ({previewOrder.orderNumber})
            </h3>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setPreviewOrder(null)}
            aria-label="Close invoice preview"
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

          {/* SUCCESS STATUS IF SENT */}
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
                  WhatsApp Opened with Tax Invoice!
                </strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#15803d" }}>
                  Your order <strong>#{previewOrder.orderNumber}</strong> has been prepared. Please tap <strong>Send</strong> in WhatsApp to deliver the invoice directly to the shop owner ({PERMANENT_ADMIN_WHATSAPP_DISPLAY}).
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
                onClick={() => setActiveTab("invoice")}
                style={{
                  background: activeTab === "invoice" ? "#ffffff" : "transparent",
                  color: activeTab === "invoice" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: activeTab === "invoice" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <FileText size={14} />
                <span>Tax Invoice Layout</span>
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
                <span>WhatsApp Message Format</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyInvoice}
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
              <span>{copied ? "Copied to Clipboard!" : "Copy WhatsApp Text"}</span>
            </button>
          </div>

          {/* TAB 1: OFFICIAL TAX INVOICE STRUCTURE */}
          {activeTab === "invoice" && (
            <div className="invoice-paper" style={{ padding: "1.25rem", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              {/* 1. Invoice Header */}
              <div style={{ textAlign: "center", borderBottom: "2px solid #09331d", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                <h2 style={{ margin: "0 0 2px 0", fontSize: "1.35rem", color: "#09331d", fontWeight: "800", letterSpacing: "0.5px" }}>
                  POOMANI CHEKKU ENNAI
                </h2>
                <div style={{ fontSize: "1rem", color: "#b45309", fontWeight: "700", marginBottom: "0.5rem" }}>
                  பூமணி செக்கு எண்ணெய்
                </div>
                <div
                  style={{
                    display: "inline-block",
                    background: "#09331d",
                    color: "#deb869",
                    padding: "0.25rem 1.25rem",
                    borderRadius: "4px",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    letterSpacing: "1px",
                  }}
                >
                  TAX INVOICE
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", fontSize: "0.82rem", color: "#475569", flexWrap: "wrap", gap: "0.5rem" }}>
                  <span><strong>Invoice Type:</strong> Original</span>
                  <span><strong>Invoice No:</strong> <code style={{ background: "#f8fafc", padding: "2px 6px", borderRadius: "4px", color: "#09331d", fontWeight: "700" }}>{previewOrder.orderNumber}</code></span>
                  <span><strong>Date & Time:</strong> {previewOrder.date}</span>
                </div>
              </div>

              {/* 2 & 3. Seller and Buyer Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", background: "#f8fafc", padding: "0.85rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                <div>
                  <strong style={{ color: "#09331d", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>
                    *SELLER DETAILS*
                  </strong>
                  <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "#0f172a" }}>
                    {shopSettings?.shopName || "Poomani Chekku Ennai"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    <strong>Address:</strong> {shopSettings?.address || "Gopalasamuthiram (கோபாலசமுத்திரம்), Tamil Nadu"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    <strong>Contact:</strong> {shopSettings?.phoneDisplay || PERMANENT_ADMIN_WHATSAPP_DISPLAY}
                  </div>
                  {shopSettings?.gstin && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                      <strong>GSTIN:</strong> {shopSettings.gstin}
                    </div>
                  )}
                </div>

                <div>
                  <strong style={{ color: "#09331d", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>
                    *BUYER DETAILS*
                  </strong>
                  <div style={{ fontSize: "0.84rem", fontWeight: "700", color: "#0f172a" }}>
                    {previewOrder.customerName || "Valued Customer"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    <strong>Phone:</strong> {previewOrder.customerPhone || "—"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    <strong>Address:</strong> {previewOrder.customerAddress || previewOrder.address || "—"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: "2px" }}>
                    <strong>State:</strong> {previewOrder.customerState || previewOrder.state || "Tamil Nadu"}
                  </div>
                </div>
              </div>

              {/* 4. Order Details – Invoice Table */}
              <div style={{ marginBottom: "1rem" }}>
                <strong style={{ color: "#09331d", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                  *ORDER DETAILS – INVOICE ITEMS*
                </strong>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "#09331d", color: "#ffffff", textAlign: "left" }}>
                        <th style={{ padding: "6px 8px", width: "40px" }}>Sl.</th>
                        <th style={{ padding: "6px 8px" }}>Particulars</th>
                        <th style={{ padding: "6px 8px", textAlign: "center", width: "70px" }}>Quantity</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: "80px" }}>Rate</th>
                        <th style={{ padding: "6px 8px", textAlign: "right", width: "90px" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const sNo = item.sNo || idx + 1;
                        const std = getStandardOilNames(item.name, item.regionalName);
                        const particulars = `${std.combined} – ${item.packSize || "1 Litre"}`;
                        const rate = Number(item.rate || item.price || 0);
                        const amount = Number(item.amount || rate * (item.quantity || 1));

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "8px", color: "#64748b" }}>{sNo}</td>
                            <td style={{ padding: "8px" }}>
                              <strong style={{ color: "#0f172a" }}>{particulars}</strong>
                            </td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.quantity}</td>
                            <td style={{ padding: "8px", textAlign: "right" }}>₹{formatINR(rate)}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "700" }}>₹{formatINR(amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Invoice Totals */}
              <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ maxWidth: "340px", marginLeft: "auto", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span>Subtotal:</span>
                    <span>₹{formatINR(previewOrder.subtotal)}</span>
                  </div>
                  {previewOrder.discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#16a34a" }}>
                      <span>Discount:</span>
                      <span>-₹{formatINR(previewOrder.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span>Taxable Value:</span>
                    <span>₹{formatINR(taxableValue)}</span>
                  </div>
                  {hasGst && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
                        <span>CGST ({halfRate}%):</span>
                        <span>₹{formatINR(halfTax)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
                        <span>SGST ({halfRate}%):</span>
                        <span>₹{formatINR(halfTax)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#64748b" }}>
                        <span>Total Tax:</span>
                        <span>₹{formatINR(totalTax)}</span>
                      </div>
                    </>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0 4px 0",
                      borderTop: "2px solid #09331d",
                      marginTop: "6px",
                      fontSize: "1.1rem",
                      fontWeight: "800",
                      color: "#09331d",
                    }}
                  >
                    <span>GRAND TOTAL:</span>
                    <span>₹{formatINR(previewOrder.grandTotal)}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#fefce8",
                    border: "1px solid #fef08a",
                    padding: "0.5rem 0.85rem",
                    borderRadius: "6px",
                    marginTop: "0.75rem",
                    fontSize: "0.82rem",
                    color: "#854d0e",
                  }}
                >
                  <strong>Amount in Words:</strong> {amountInWords}
                </div>
              </div>

              {/* 6. Footer */}
              <div style={{ textAlign: "center", borderTop: "1px dashed #cbd5e1", paddingTop: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>
                <div style={{ fontWeight: "700", color: "#09331d" }}>For Poomani Chekku Ennai</div>
                <div style={{ marginTop: "2px" }}>Thank you for your purchase!</div>
              </div>
            </div>
          )}

          {/* TAB 2: WHATSAPP FORMATTED MESSAGE */}
          {activeTab === "text" && (
            <div>
              <div style={{ marginBottom: "0.5rem", fontWeight: "700", fontSize: "0.85rem", color: "#09331d" }}>
                WhatsApp Tax Invoice Message (Pre-formatted text sent to shop):
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
                {invoiceText}
              </pre>
            </div>
          )}
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="bill-modal-actions">
          {/* Copy Invoice Text */}
          <button
            id="copy-invoice-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleCopyInvoice}
            title="Copy formatted WhatsApp invoice message"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Invoice Text"}</span>
          </button>

          {/* Primary CTA: Send Tax Invoice on WhatsApp */}
          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className="btn-proceed-wa"
            onClick={handleSendToWhatsApp}
            title="Open WhatsApp directed to store owner (+91 63857 55368) with prefilled tax invoice"
          >
            <Send size={18} />
            <span>Send Tax Invoice on WhatsApp</span>
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
              <span>Tax Invoice prepared and routed to WhatsApp (+91 63857 55368).</span>
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
