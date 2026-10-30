import React, { useState, useEffect } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR, cleanWhatsAppNumber } from "../utils/billGenerator";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("image"); // Default to 'image' for Photo Bill first
  const [isSent, setIsSent] = useState(false);
  const [shareMethod, setShareMethod] = useState(""); // 'native' | 'download'
  const [generatedImgUrl, setGeneratedImgUrl] = useState(null);
  const [publicBillUrl, setPublicBillUrl] = useState("");
  const [downloadedFileName, setDownloadedFileName] = useState("");

  // Dynamically generate the bill image in the background as soon as previewOrder loads
  useEffect(() => {
    if (!previewOrder) {
      setGeneratedImgUrl(null);
      setIsSent(false);
      setShareMethod("");
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
      showNotification("Order summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cleanAdminPhone = cleanWhatsAppNumber(shopSettings?.whatsappNumber);
  const isAdminPhoneValid = Boolean(cleanAdminPhone && cleanAdminPhone.length >= 10);
  const shopPhoneFormatted = cleanAdminPhone ? `+${cleanAdminPhone}` : "";

  /**
   * Primary action: Send Order on WhatsApp (Photo Bill)
   * 1. Validates that shop admin WhatsApp recipient is configured
   * 2. Generates the bill using the actual cart and customer information
   * 3. Converts the bill into a high-quality PNG image
   * 4. Uses Web Share API with file sharing where supported (Android, iPhone)
   * 5. Fallback: downloads the bill image file and opens WhatsApp chat addressed to ADMIN number
   * 6. Never shows false success on user cancellation (AbortError)
   */
  const handleSendToWhatsApp = async () => {
    // 0. Ensure admin recipient phone is configured
    if (!isAdminPhoneValid) {
      showNotification(
        "Shop WhatsApp number is not configured by the store owner. Please configure it in the Admin Dashboard Settings.",
        "error"
      );
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Generate high-resolution bill image file
      const result = await generateBillImage(previewOrder, shopSettings, "png");
      const cleanOrder = String(previewOrder.orderNumber || "order").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `Poomani_Chekku_Ennai_Bill_${cleanOrder}.png`;
      setDownloadedFileName(fileName);
      setGeneratedImgUrl(result.dataUrl);

      // Create File object for Web Share API
      const billFile = new File([result.blob], fileName, { type: "image/png" });

      // Clean short caption for sharing - order confirmation details
      const shortMessage = `Please find my Poomani Chekku Ennai order bill attached.\n\n*Order ID:* ${previewOrder.orderNumber}\n*Customer:* ${previewOrder.customerName}\n*Phone:* ${previewOrder.customerPhone}\n*Grand Total:* ₹${formatINR(previewOrder.grandTotal)}`;

      // 2. Check if device natively supports file sharing (Android mobile, iOS Safari, etc.)
      const canShareFile = Boolean(
        navigator.canShare &&
        navigator.share &&
        navigator.canShare({ files: [billFile] })
      );

      if (canShareFile) {
        try {
          await navigator.share({
            files: [billFile],
            title: `Poomani Chekku Ennai Bill - ${previewOrder.orderNumber}`,
            text: shortMessage,
          });

          // ONLY on actual share completion (when user picks WhatsApp and completes sharing):
          confirmOrderRedirect(previewOrder.orderNumber);
          clearCart();
          setIsSent(true);
          setShareMethod("native");
          showNotification(`Bill photo shared successfully to WhatsApp! Order delivered to shop owner (+${cleanAdminPhone}).`, "success");
        } catch (shareErr) {
          // If the customer dismissed or cancelled the native share sheet:
          if (shareErr.name === "AbortError") {
            // DO NOT show a false success message!
            showNotification("Share cancelled. Tap again when ready to send bill photo.", "info");
            return;
          }
          console.warn("[BillPreview] Native file share failed, falling back to download:", shareErr);
          await executeFallbackDownloadAndWhatsApp(result, fileName, shortMessage, cleanAdminPhone);
        }
      } else {
        // 3. Fallback for Desktop & browsers without Web Share file support
        await executeFallbackDownloadAndWhatsApp(result, fileName, shortMessage, cleanAdminPhone);
      }
    } catch (err) {
      console.error("[BillPreview] Order dispatch error:", err);
      showNotification("Could not prepare bill photo: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Fallback for Desktop / non-share browsers:
   * Downloads the bill photo to customer's device and opens WhatsApp chat addressed STRICTLY to the admin's number.
   * Never sends to customer's own phone number.
   */
  const executeFallbackDownloadAndWhatsApp = async (imageResult, fileName, shortMessage, adminRecipientPhone) => {
    // 1. Download image automatically
    const link = document.createElement("a");
    link.download = fileName;
    link.href = imageResult.dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 200);

    // 2. Open WhatsApp click-to-chat with short message directed to SHOP ADMIN number
    const targetAdminPhone = adminRecipientPhone || cleanAdminPhone;
    const waText = `${shortMessage}\n\n(Bill photo downloaded: ${fileName} - please attach and send to confirm your order)`;
    const waUrl = `https://api.whatsapp.com/send?phone=${targetAdminPhone}&text=${encodeURIComponent(waText)}`;

    // 3. Optional background server dispatch if configured (routes to admin number on server)
    try {
      await sendWhatsAppBillApi({
        orderNumber: previewOrder.orderNumber,
        customerPhone: previewOrder.customerPhone,
        customerName: previewOrder.customerName,
        billDataUrl: imageResult.dataUrl,
        billText: previewOrder.billText,
      });
    } catch (cloudErr) {
      console.warn("[BillPreview] WhatsApp Cloud API background send:", cloudErr.message);
    }

    // 4. Open WhatsApp in new tab
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // 5. Update state
    confirmOrderRedirect(previewOrder.orderNumber);
    clearCart();
    setIsSent(true);
    setShareMethod("download");
    showNotification(`Bill photo downloaded (${fileName})! Opening WhatsApp chat with shop owner (+${targetAdminPhone}).`, "success");
  };

  /**
   * Explicit Download button (supports PNG or JPEG)
   */
  const handleDownloadBill = async (format = "png") => {
    setIsGenerating(true);
    try {
      const res = await downloadBillImageFile(previewOrder, shopSettings, format);
      setDownloadedFileName(res.fileName);
      showNotification(`Bill photo downloaded successfully (${res.fileName})!`, "success");
    } catch (err) {
      console.error("[BillPreview] Download error:", err);
      showNotification("Failed to generate bill image: " + err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const items = previewOrder.items || [];
  const fileNameDisplay = downloadedFileName || `Poomani_Chekku_Ennai_Bill_${previewOrder.orderNumber}.png`;

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
          {/* WARNING BANNER IF ADMIN WHATSAPP IS NOT CONFIGURED */}
          {!isAdminPhoneValid && (
            <div
              className="admin-phone-missing-alert"
              style={{
                background: "#fffbeb",
                border: "1.5px solid #f59e0b",
                borderRadius: "10px",
                padding: "0.85rem 1.1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.12)",
              }}
            >
              <AlertTriangle size={22} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ color: "#92400e", fontSize: "0.95rem", display: "block", marginBottom: "0.25rem" }}>
                  Shop WhatsApp Recipient Number Not Configured
                </strong>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#78350f", lineHeight: 1.45 }}>
                  The store owner has not configured a valid WhatsApp recipient number in the Admin Dashboard Settings. Customer order bills cannot be dispatched via WhatsApp until the store owner enters a valid mobile number with country code.
                </p>
              </div>
            </div>
          )}

          {/* RECIPIENT BANNER: CLEARLY CONFIRMS ORDER IS SENT TO SHOP OWNER, NOT CUSTOMER */}
          {isAdminPhoneValid && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "8px",
                padding: "0.6rem 0.95rem",
                marginBottom: "1rem",
                fontSize: "0.82rem",
                color: "#166534",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Send size={14} color="#16a34a" />
                <span>
                  <strong>WhatsApp Order Recipient:</strong> Store Owner (+{cleanAdminPhone})
                </span>
              </div>
              <div style={{ color: "#15803d", fontSize: "0.78rem" }}>
                Customer: <strong>{previewOrder.customerName}</strong> ({previewOrder.customerPhone})
              </div>
            </div>
          )}

          {/* POST-SUBMISSION STATUS BANNER */}
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
              {shareMethod === "native" ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                    <CheckCircle size={24} color="#16a34a" />
                    <h4 style={{ margin: 0, color: "#166534", fontSize: "1.05rem" }}>
                      Bill Photo Shared to WhatsApp!
                    </h4>
                  </div>
                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", color: "#1e3a29", lineHeight: 1.5 }}>
                    Your order <strong>#{previewOrder.orderNumber}</strong> has been forwarded with your bill photo attached directly to the store owner (+{cleanAdminPhone}). Your shopping cart has been cleared.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                    <CheckCircle size={24} color="#16a34a" />
                    <h4 style={{ margin: 0, color: "#166534", fontSize: "1.05rem" }}>
                      Bill Photo Downloaded & WhatsApp Chat Opened!
                    </h4>
                  </div>

                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", color: "#1e3a29", lineHeight: 1.5 }}>
                    Your cart has been cleared. To finalize your order with <strong>Poomani Chekku Ennai</strong> (+{cleanAdminPhone}):
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
                        <strong>Bill Photo Saved:</strong> Look for <code>{fileNameDisplay}</code> in your device <strong>Downloads</strong> or <strong>Gallery</strong>.
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ background: "#22c55e", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", flexShrink: 0 }}>2</span>
                      <span>
                        <strong>In WhatsApp Chat:</strong> Click the <Paperclip size={14} style={{ display: "inline", verticalAlign: "middle" }} /> <strong>Attach (or ➕ Plus on mobile)</strong> button in the chat with +{cleanAdminPhone}.
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                      <span style={{ background: "#22c55e", color: "#fff", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "700", flexShrink: 0 }}>3</span>
                      <span>
                        Select the bill photo and click <strong>Send</strong> to confirm your order!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                <a
                  href={`https://api.whatsapp.com/send?phone=${cleanAdminPhone}&text=${encodeURIComponent(
                    `Please find my Poomani Chekku Ennai order bill attached.\n\n*Order ID:* ${previewOrder.orderNumber}\n*Customer:* ${previewOrder.customerName}\n*Grand Total:* ₹${formatINR(previewOrder.grandTotal)}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-proceed-wa"
                  style={{
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.82rem",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <Send size={15} />
                  <span>Open WhatsApp Chat (+{cleanAdminPhone})</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleDownloadBill("png")}
                  className="btn-bill-action secondary"
                  style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}
                  disabled={isGenerating}
                >
                  <Download size={14} />
                  <span>Re-download Bill (PNG)</span>
                </button>
              </div>
            </div>
          ) : (
            /* PRE-SUBMISSION PHOTO BILL NOTICE */
            <div className="whatsapp-mandatory-alert">
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                <Sparkles size={20} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Official Photo Bill Ready:</strong> Your verified invoice image has been generated below.
                  When you tap <strong>"Send Bill Photo on WhatsApp"</strong>, your phone or browser opens the sharing screen with the bill photo attached so you can send it directly to Poomani Chekku Ennai!
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
                  gap: "0.35rem",
                  boxShadow: activeTab === "image" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <ImageIcon size={14} />
                <span>Bill Photo View (Official)</span>
              </button>

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
                  gap: "0.35rem",
                  boxShadow: activeTab === "invoice" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <FileText size={14} />
                <span>Invoice Table</span>
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
                  gap: "0.35rem",
                  boxShadow: activeTab === "text" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Receipt size={14} />
                <span>Order Summary</span>
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

          {/* TAB 1: LIVE GENERATED CANVAS BILL IMAGE (DEFAULT) */}
          {activeTab === "image" && (
            <div style={{ textAlign: "center", background: "#f8f5ee", padding: "1rem", borderRadius: "8px", border: "1px solid #e8e0d2" }}>
              <div style={{ marginBottom: "0.75rem", fontSize: "0.85rem", color: "#57655d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><strong>Official Photo Bill Image:</strong></span>
                <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: "700" }}>✓ 2x HD Retina Quality</span>
              </div>

              {generatedImgUrl ? (
                <div>
                  <img
                    src={generatedImgUrl}
                    alt={`Poomani Chekku Ennai Bill ${previewOrder.orderNumber}`}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      borderRadius: "6px",
                      boxShadow: "0 6px 20px rgba(9, 51, 29, 0.12)",
                      border: "1.5px solid #d4af37",
                      display: "block",
                      margin: "0 auto",
                    }}
                  />
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#78716c" }}>
                    Tip: On mobile or PC, you can long-press or right-click to copy or save this bill image.
                  </div>
                </div>
              ) : (
                <div style={{ padding: "3rem 1rem", color: "#09331d" }}>
                  <Loader2 size={26} className="animate-spin" style={{ margin: "0 auto 0.6rem" }} />
                  <p style={{ fontWeight: "600" }}>Generating your official photo bill image...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STRUCTURED INVOICE TABLE */}
          {activeTab === "invoice" && (
            <div className="invoice-paper" id="invoice-printable-view">
              {/* Invoice Top Header */}
              <div className="invoice-header">
                <img
                  src="/images/logo.png"
                  alt="Poomani Chekku Ennai Logo"
                  className="invoice-logo"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <div className="invoice-brand-title">
                  POOMANI CHEKKU ENNAI — பூமணி செக்கு எண்ணெய்
                </div>
                <div className="invoice-brand-subtitle">
                  Customer Order Bill / வாடிக்கையாளர் ஆர்டர் ரசீது
                </div>
                <div className="invoice-mill-details">
                  {shopSettings.address || "Gopalasamuthiram (கோபாலசமுத்திரம்), Tamil Nadu"} • Phone: {shopPhoneFormatted}
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
                    <span className="meta-val">{previewOrder.paymentMethod || "Cash"}</span>
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
                    <span className="meta-label">Customer Address:</span>
                    <span className="meta-val">{previewOrder.customerAddress || previewOrder.address || previewOrder.deliveryAddress || "Direct Order"}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Bill Table */}
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>S.No.</th>
                      <th style={{ textAlign: "left" }}>Product Name / பொருள்</th>
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

                  {previewOrder.discount > 0 && (
                    <div className="summary-line discount">
                      <span>Discount:</span>
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
                  Thank you for choosing Poomani Chekku Ennai! 100% Pure & Unrefined Edible Cooking Oils.
                </div>
                <div className="footer-sub">
                  Official WhatsApp Order Confirmation • Gopalasamuthiram, Tamil Nadu
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDER SUMMARY */}
          {activeTab === "text" && (
            <div>
              <div style={{ marginBottom: "0.5rem", fontWeight: "700", fontSize: "0.85rem", color: "#09331d" }}>
                Order Summary Reference:
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

          {/* 2. Copy Text */}
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

          {/* 3. Primary CTA: Send Bill Photo on WhatsApp */}
          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className={`btn-proceed-wa ${isSent ? "btn-proceed-wa-sent" : ""}`}
            onClick={handleSendToWhatsApp}
            disabled={isGenerating || !isAdminPhoneValid}
            title={
              !isAdminPhoneValid
                ? "Store WhatsApp number is not configured by the admin in Settings"
                : "Send customer order bill photo on WhatsApp to store owner"
            }
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating Bill Photo...</span>
              </>
            ) : !isAdminPhoneValid ? (
              <>
                <AlertTriangle size={18} color="#ffffff" />
                <span>Admin WhatsApp Number Required</span>
              </>
            ) : isSent ? (
              <>
                <Check size={18} />
                <span>Order Forwarded (Cart Cleared)</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Send Bill Photo on WhatsApp</span>
                <Share2 size={15} style={{ opacity: 0.9 }} />
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
              <span>Order recorded. Your bill photo is ready under Orders Log.</span>
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
