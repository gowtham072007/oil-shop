import React, { useState, useEffect } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR } from "../utils/billGenerator";
import { generateBillImage, downloadBillImageFile } from "../utils/billImageCanvas";
import { uploadBillImageApi, sendWhatsAppBillApi } from "../utils/api";
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
  Image as ImageIcon,
  Paperclip,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState("invoice"); // 'invoice' | 'image' | 'text'
  const [isSent, setIsSent] = useState(false);
  const [generatedImgUrl, setGeneratedImgUrl] = useState(null);
  const [publicBillUrl, setPublicBillUrl] = useState("");
  const [downloadedFileName, setDownloadedFileName] = useState("");

  // Dynamically generate the bill image in the background as soon as previewOrder loads
  useEffect(() => {
    if (!previewOrder) {
      setGeneratedImgUrl(null);
      setIsSent(false);
      return;
    }

    let isMounted = true;
    generateBillImage(previewOrder, shopSettings, "png")
      .then(async (result) => {
        if (!isMounted) return;
        setGeneratedImgUrl(result.dataUrl);

        // Upload to server persistent storage in the background for permanent URL hosting
        try {
          const uploadRes = await uploadBillImageApi(previewOrder.orderNumber, result.dataUrl);
          if (uploadRes && uploadRes.publicUrl && isMounted) {
            setPublicBillUrl(uploadRes.publicUrl);
          }
        } catch (uploadErr) {
          console.warn("[BillPreview] Background bill upload:", uploadErr.message);
        }
      })
      .catch((err) => {
        console.warn("[BillPreview] Dynamic canvas generation error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [previewOrder, shopSettings]);

  if (!previewOrder) return null;

  const handleCopyBill = () => {
    if (previewOrder.billText) {
      navigator.clipboard.writeText(previewOrder.billText);
      setCopied(true);
      showNotification("Bill text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Primary action: Send Order to WhatsApp
   * 1. Dynamically generates & auto-downloads the bill image file (PNG) to customer device
   * 2. Clears shopping cart and applied coupon
   * 3. Checks/dispatches via server-side Meta WhatsApp Cloud API if enabled
   * 4. Opens WhatsApp with prefilled matching bill text
   * 5. Displays guided 3-step attachment instructions inside the modal
   */
  const handleSendToWhatsApp = async () => {
    setIsGenerating(true);
    try {
      // 1. Auto-download the exact generated bill image to the customer's phone / PC Downloads
      const downloadRes = await downloadBillImageFile(previewOrder, shopSettings, "png");
      setDownloadedFileName(downloadRes.fileName);

      // 2. Clear cart and active coupons immediately upon ordering
      confirmOrderRedirect(previewOrder.orderNumber);
      clearCart();

      // 3. Optional: Trigger server-side dispatch if WhatsApp Cloud API is configured
      try {
        await sendWhatsAppBillApi({
          orderNumber: previewOrder.orderNumber,
          customerPhone: previewOrder.customerPhone,
          billDataUrl: downloadRes.dataUrl,
          billText: previewOrder.billText,
        });
      } catch (cloudErr) {
        console.warn("[BillPreview] WhatsApp Cloud API background send:", cloudErr.message);
      }

      // 4. Open WhatsApp click-to-chat URL in new window with pre-filled order details
      window.open(previewOrder.waUrl, "_blank", "noopener,noreferrer");

      // 5. Update UI state to show next-step attachment guidance
      setIsSent(true);
      showNotification("Bill image downloaded! Please attach it in WhatsApp chat.", "success");
    } catch (err) {
      console.error("[BillPreview] Order dispatch error:", err);
      // Fallback: still open WhatsApp even if canvas failed
      confirmOrderRedirect(previewOrder.orderNumber);
      clearCart();
      window.open(previewOrder.waUrl, "_blank", "noopener,noreferrer");
      setIsSent(true);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Explicit Download button (supports PNG or JPEG)
   */
  const handleDownloadBill = async (format = "png") => {
    setIsGenerating(true);
    try {
      const res = await downloadBillImageFile(previewOrder, shopSettings, format);
      setDownloadedFileName(res.fileName);
      showNotification(`Bill image downloaded successfully (${res.fileName})!`, "success");
    } catch (err) {
      console.error("[BillPreview] Download error:", err);
      showNotification("Failed to generate bill image: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Native Mobile Web Share API:
   * On mobile devices (Android Chrome, iOS Safari), this allows sharing both the bill image file AND caption directly to WhatsApp!
   */
  const handleShareBill = async () => {
    setIsGenerating(true);
    try {
      const { blob, fileName, dataUrl } = await downloadBillImageFile(previewOrder, shopSettings, "png");
      setDownloadedFileName(fileName);
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Poomani Oils Bill ${previewOrder.orderNumber}`,
          text: previewOrder.billText,
        });
        confirmOrderRedirect(previewOrder.orderNumber);
        clearCart();
        setIsSent(true);
        showNotification("Bill image shared! Select WhatsApp to complete order.");
      } else {
        // Fallback: open WhatsApp and guide user
        window.open(previewOrder.waUrl, "_blank", "noopener,noreferrer");
        confirmOrderRedirect(previewOrder.orderNumber);
        clearCart();
        setIsSent(true);
        showNotification(`Bill downloaded (${fileName})! Attach it in WhatsApp.`, "info");
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
  const fileNameDisplay = downloadedFileName || `Poomani_Oils_Bill_${previewOrder.orderNumber}.png`;

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
          {/* POST-SUBMISSION GUIDED STEP BANNER */}
          {isSent ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "2px solid #86efac",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                boxShadow: "0 2px 8px rgba(22, 163, 74, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <CheckCircle size={24} color="#16a34a" />
                <h4 style={{ margin: 0, color: "#166534", fontSize: "1.05rem" }}>
                  WhatsApp Chat Opened & Bill Image Downloaded!
                </h4>
              </div>

              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", color: "#1e3a29", lineHeight: 1.5 }}>
                Your cart has been cleared and your order is logged. To complete your order with <strong>Poomani Oils</strong>, attach your bill image:
              </p>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.84rem",
                  color: "#1e3a29",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ background: "#22c55e", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", flexShrink: 0 }}>1</span>
                  <span>
                    <strong>Bill Image Saved:</strong> Look for <code>{fileNameDisplay}</code> in your device <strong>Downloads</strong> or <strong>Gallery</strong>.
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ background: "#22c55e", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", flexShrink: 0 }}>2</span>
                  <span>
                    <strong>In WhatsApp:</strong> Your order text is already pre-filled in the message box.
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{ background: "#22c55e", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", flexShrink: 0 }}>3</span>
                  <span>
                    Tap the <Paperclip size={14} style={{ display: "inline", verticalAlign: "middle" }} /> <strong>Paperclip (or ➕ Plus on mobile)</strong>, select the bill image, and tap <strong>Send</strong>!
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                <a
                  href={previewOrder.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-proceed-wa"
                  style={{
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.82rem",
                    textDecoration: "none",
                  }}
                >
                  <Send size={15} />
                  <span>Re-open WhatsApp Chat</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadBill("png")}
                  className="btn-bill-action secondary"
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                >
                  <Download size={14} />
                  <span>Re-download Bill (PNG)</span>
                </button>
              </div>
            </div>
          ) : (
            /* PRE-SUBMISSION MANDATORY NOTICE */
            <div className="whatsapp-mandatory-alert">
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Ready to Order:</strong> Your verified invoice bill is prepared below.
                  When you tap <strong>"Send Order to WhatsApp"</strong>, the official bill image is downloaded to your device and WhatsApp opens with your order summary so you can attach and send!
                </div>
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
            {/* View Tabs */}
            <div style={{ display: "flex", gap: "0.35rem", background: "#ede8dd", padding: "3px", borderRadius: "8px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                style={{
                  background: activeTab === "invoice" ? "#ffffff" : "transparent",
                  color: activeTab === "invoice" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: activeTab === "invoice" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <FileText size={14} />
                <span>Invoice Table</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("image")}
                style={{
                  background: activeTab === "image" ? "#ffffff" : "transparent",
                  color: activeTab === "image" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: activeTab === "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <ImageIcon size={14} />
                <span>Bill Image View</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("text")}
                style={{
                  background: activeTab === "text" ? "#ffffff" : "transparent",
                  color: activeTab === "text" ? "#09331d" : "#57655d",
                  border: "none",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  boxShadow: activeTab === "text" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Receipt size={14} />
                <span>WhatsApp Text</span>
              </button>
            </div>

            {/* Quick Download Format Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <button
                type="button"
                onClick={() => handleDownloadBill("png")}
                className="btn-bill-action secondary"
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem" }}
                title="Download bill as high-resolution PNG image"
                disabled={isGenerating}
              >
                <Download size={13} />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBill("jpeg")}
                className="btn-bill-action secondary"
                style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem" }}
                title="Download bill as JPEG image"
                disabled={isGenerating}
              >
                <Download size={13} />
                <span>Download JPEG</span>
              </button>
            </div>
          </div>

          {/* TAB 1: STRUCTURED INVOICE TABLE */}
          {activeTab === "invoice" && (
            <div className="invoice-paper" id="invoice-printable-view">
              {/* Invoice Top Header */}
              <div className="invoice-header">
                <img
                  src="/images/logo.png"
                  alt="Poomani Oils Logo"
                  className="invoice-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
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

          {/* TAB 2: LIVE GENERATED CANVAS BILL IMAGE */}
          {activeTab === "image" && (
            <div style={{ textAlign: "center", background: "#f8f5ee", padding: "1rem", borderRadius: "8px", border: "1px solid #e8e0d2" }}>
              <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#57655d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>Dynamically Generated High-Resolution Bill Image:</strong></span>
                <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "600" }}>✓ 2x Retina Sharp PNG</span>
              </div>

              {generatedImgUrl ? (
                <div>
                  <img
                    src={generatedImgUrl}
                    alt={`Poomani Oils Bill ${previewOrder.orderNumber}`}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "6px",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                      border: "1px solid #ddd",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#78716c" }}>
                    Tip: You can right-click or long-press the image to save or copy it directly.
                  </div>
                </div>
              ) : (
                <div style={{ padding: "3rem 1rem" }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 0.5rem" }} />
                  <p>Rendering dynamic bill canvas...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WHATSAPP RAW TEXT */}
          {activeTab === "text" && (
            <div>
              <div style={{ marginBottom: "0.5rem", fontWeight: "700", fontSize: "0.85rem", color: "#09331d" }}>
                WhatsApp Pre-filled Order Message:
              </div>
              <pre className="bill-receipt-paper" id="whatsapp-bill-preview-content">
                {previewOrder.billText}
              </pre>
            </div>
          )}
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="bill-modal-actions">
          {/* 1. Download Bill Image Button */}
          <button
            id="download-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={() => handleDownloadBill("png")}
            disabled={isGenerating}
            title="Download invoice as PNG image"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span>Download Bill (PNG)</span>
          </button>

          {/* 2. Web Share (Mobile Friendly with Image Attachment) */}
          <button
            id="share-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleShareBill}
            disabled={isGenerating}
            title="Share bill image on supported mobile devices"
          >
            <Share2 size={16} />
            <span>Share with Bill Image</span>
          </button>

          {/* 3. Copy Text */}
          <button
            id="copy-bill-btn"
            type="button"
            className="btn-bill-action secondary"
            onClick={handleCopyBill}
            title="Copy formatted WhatsApp message text"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          {/* 4. Primary CTA: Send Order to WhatsApp */}
          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className={`btn-proceed-wa ${isSent ? "btn-proceed-wa-sent" : ""}`}
            onClick={handleSendToWhatsApp}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Preparing Order Bill...</span>
              </>
            ) : isSent ? (
              <>
                <Check size={18} />
                <span>Order Dispatched (Cart Cleared)</span>
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

        {/* Persistent bottom status / close button if sent */}
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
              <span>Cart emptied. Order bill is saved under your Orders Log.</span>
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
