import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { generateBillImage } from "../utils/billImageCanvas";
import {
  X,
  Copy,
  Check,
  Send,
  Download,
  Share2,
  FileText,
  AlertTriangle,
  Receipt,
  ExternalLink,
  Loader2,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!previewOrder) return null;

  const handleCopyBill = () => {
    if (previewOrder.billText) {
      navigator.clipboard.writeText(previewOrder.billText);
      setCopied(true);
      showNotification("Bill text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendToWhatsApp = () => {
    setIsSent(true);
    confirmOrderRedirect(previewOrder.orderNumber);
    clearCart();
    try {
      localStorage.removeItem("oil_shop_cart");
    } catch {
      // ignore
    }

    // Open official WhatsApp click-to-chat URL in new window
    window.open(previewOrder.waUrl, "_blank", "noopener,noreferrer");
    showNotification("Order sent to WhatsApp! Your shopping cart has been cleared.", "success");
  };

  const handleDownloadBill = async () => {
    setIsGenerating(true);
    try {
      const { dataUrl } = await generateBillImage(previewOrder, shopSettings);
      const link = document.createElement("a");
      link.download = `Poomani_Oils_Bill_${previewOrder.orderNumber}.png`;
      link.href = dataUrl;
      link.click();
      showNotification("Bill image downloaded successfully!");
    } catch (err) {
      console.error("[BillPreview] Download error:", err);
      showNotification("Failed to generate bill image: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareBill = async () => {
    setIsGenerating(true);
    try {
      const { blob, dataUrl } = await generateBillImage(previewOrder, shopSettings);
      const fileName = `Poomani_Oils_Bill_${previewOrder.orderNumber}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Poomani Oils Bill ${previewOrder.orderNumber}`,
          text: `Customer Order Bill for ${previewOrder.orderNumber} from Poomani Oils`,
        });
        showNotification("Bill image shared successfully!");
      } else {
        // Fallback: download the file
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        showNotification("Bill image downloaded! You can attach it in WhatsApp.", "info");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("[BillPreview] Share error:", err);
        showNotification("Could not share bill image: " + err.message, "error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const items = previewOrder.items || [];

  return (
    <div className="modal-backdrop" onClick={() => setPreviewOrder(null)}>
      <div
        className="bill-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-modal-title"
      >
        {/* Modal Header */}
        <div className="bill-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt size={22} color="#e5b94c" />
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
          {/* WhatsApp Submission Alert */}
          <div className="whatsapp-mandatory-alert">
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Important:</strong> Your pre-filled invoice bill is ready below.
                Click <strong>"Send Order to WhatsApp"</strong> to submit this order directly to the mill.
                You can also <strong>download or share the bill image</strong> to keep or attach in your chat.
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
            <button
              type="button"
              className="btn-view-toggle"
              onClick={() => setShowRawText(!showRawText)}
            >
              <FileText size={14} />
              <span>{showRawText ? "View Invoice Design" : "View WhatsApp Text Message"}</span>
            </button>
          </div>

          {showRawText ? (
            /* Plain WhatsApp Text Preview */
            <div>
              <div style={{ marginBottom: "0.5rem", fontWeight: "700", fontSize: "0.85rem", color: "#09331d" }}>
                WhatsApp Pre-filled Message:
              </div>
              <pre className="bill-receipt-paper" id="whatsapp-bill-preview-content">
                {previewOrder.billText}
              </pre>
            </div>
          ) : (
            /* Professional Invoice Paper */
            <div className="invoice-paper" id="invoice-printable-view">
              {/* Invoice Top Header */}
              <div className="invoice-header">
                <img
                  src="/images/logo.png"
                  alt="Poomani Oils Logo"
                  className="invoice-logo"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
                <div className="invoice-brand-title">
                  POOMANI OILS — பூமணி செக்கு எண்ணெய்
                </div>
                <div className="invoice-brand-subtitle">
                  Customer Order Bill / வாடிக்கையாளர் ஆர்டர் ரசீது
                </div>
                <div className="invoice-mill-details">
                  {shopSettings.address || "Gopalasamuthiram (கோபாலசமுத்திரம்), Tamil Nadu"} • Phone: +91 63857 55368
                  <br />
                  FSSAI Certified #{shopSettings.fssaiNumber || "12421008000421"}
                </div>
              </div>

              <div className="invoice-gold-divider" />

              {/* Order & Customer Metadata Card */}
              <div className="invoice-meta-card">
                <div className="invoice-meta-col">
                  <div className="meta-line">
                    <span className="meta-label">Bill / Order ID:</span>
                    <strong className="meta-val highlight">{previewOrder.orderNumber}</strong>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Date & Time:</span>
                    <span className="meta-val">{previewOrder.date}</span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Payment Method:</span>
                    <span className="meta-val">{previewOrder.paymentMethod || "Cash on Delivery"}</span>
                  </div>
                </div>

                <div className="invoice-meta-col">
                  <div className="meta-line">
                    <span className="meta-label">Customer Name:</span>
                    <strong className="meta-val">{previewOrder.customerName || "Customer"}</strong>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Phone Number:</span>
                    <span className="meta-val">{previewOrder.customerPhone || "—"}</span>
                  </div>
                  <div className="meta-line">
                    <span className="meta-label">Delivery Address:</span>
                    <span className="meta-val">{previewOrder.deliveryAddress || "Direct Order"}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Bill Table */}
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>S.No.</th>
                      <th style={{ textAlign: "left" }}>Product Name</th>
                      <th style={{ width: "110px", textAlign: "center" }}>Quantity/Size</th>
                      <th style={{ width: "60px", textAlign: "center" }}>Qty</th>
                      <th style={{ width: "100px", textAlign: "right" }}>Unit Price</th>
                      <th style={{ width: "110px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const sNo = item.sNo || idx + 1;
                      const enName = item.oilNameEn || item.name || "Pure Edible Oil";
                      const taName = item.oilNameTa || item.regionalName || "";

                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                          <td style={{ textAlign: "center", fontWeight: "600", color: "#57655d" }}>
                            {sNo}
                          </td>
                          <td>
                            <div className="product-table-name-en">{enName}</div>
                            {taName && (
                              <div className="product-table-name-ta">{taName}</div>
                            )}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "600", color: "#1f2923" }}>
                            {item.packSize}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "700", color: "#09331d" }}>
                            {item.quantity}
                          </td>
                          <td style={{ textAlign: "right", color: "#57655d" }}>
                            ₹{formatINR(item.rate)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "#09331d" }}>
                            ₹{formatINR(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Calculations */}
              <div className="invoice-summary-section">
                <div className="invoice-summary-box">
                  <div className="summary-line">
                    <span>Subtotal:</span>
                    <strong>₹{formatINR(previewOrder.subtotal)}</strong>
                  </div>

                  <div className="summary-line">
                    <span>Delivery Charge:</span>
                    <span>
                      {previewOrder.deliveryCharge === 0 ? (
                        <strong style={{ color: "#16a34a" }}>FREE</strong>
                      ) : (
                        `₹${formatINR(previewOrder.deliveryCharge)}`
                      )}
                    </span>
                  </div>

                  {previewOrder.discount > 0 && (
                    <div className="summary-line discount">
                      <span>Discount Coupon:</span>
                      <strong>-₹{formatINR(previewOrder.discount)}</strong>
                    </div>
                  )}

                  <div className="summary-line grand-total">
                    <span>Grand Total / மொத்தத் தொகை:</span>
                    <strong className="grand-val">₹{formatINR(previewOrder.grandTotal)}</strong>
                  </div>
                </div>
              </div>

              {/* Invoice Footer Seal */}
              <div className="invoice-footer">
                <div className="footer-thankyou">
                  Thank you for choosing Poomani Oils! 100% Pure & Unrefined Edible Cooking Oils.
                </div>
                <div className="footer-sub">
                  Official WhatsApp Order Confirmation • Gopalasamuthiram, Tamil Nadu
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bill-modal-actions">
          <button
            id="download-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleDownloadBill}
            disabled={isGenerating}
            title="Download invoice as PNG image"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Download Bill (PNG)</span>
          </button>

          <button
            id="share-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleShareBill}
            disabled={isGenerating}
            title="Share bill image on supported mobile devices"
          >
            <Share2 size={16} />
            <span>Share Bill</span>
          </button>

          <button
            id="copy-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleCopyBill}
            title="Copy plain bill text"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className={`btn-proceed-wa ${isSent ? "btn-proceed-wa-sent" : ""}`}
            onClick={handleSendToWhatsApp}
          >
            {isSent ? (
              <>
                <Check size={18} />
                <span>Sent to WhatsApp (Cart Cleared)</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Send Order to WhatsApp</span>
                <ExternalLink size={15} style={{ opacity: 0.8 }} />
              </>
            )}
          </button>
        </div>

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
              <span>Order sent to WhatsApp! Your shopping cart is now empty.</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOrder(null)}
              style={{
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "0.35rem 0.8rem",
                fontSize: "0.78rem",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
