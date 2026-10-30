import React, { useState, useEffect } from "react";
import { useShop } from "../context/ShopContext";
import { formatINR, cleanWhatsAppNumber } from "../utils/billGenerator";
import { generateBillImage, downloadBillImageFile, dispatchOrderPhotoBillToWhatsApp } from "../utils/billImageCanvas";
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
    setIsAdminOpen,
  } = useShop();

  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("image"); // Default to 'image' for Photo Bill first
  const [isSent, setIsSent] = useState(false);
  const [apiStatus, setApiStatus] = useState(null); // { status: 'delivered'|'failed'|'unconfigured', messageId, error, recipient }
  const [generatedImgUrl, setGeneratedImgUrl] = useState(null);
  const [publicBillUrl, setPublicBillUrl] = useState("");
  const [downloadedFileName, setDownloadedFileName] = useState("");

  // Dynamically generate the bill image in the background as soon as previewOrder loads
  useEffect(() => {
    if (!previewOrder) {
      setGeneratedImgUrl(null);
      setIsSent(false);
      setApiStatus(null);
      return;
    }

    if (previewOrder.whatsappStatus) {
      setApiStatus({
        status: previewOrder.whatsappStatus,
        messageId: previewOrder.whatsappMessageId,
        error: previewOrder.whatsappError,
        metaDetails: previewOrder.whatsappMetaDetails,
        stage: previewOrder.whatsappStage,
        recipient: previewOrder.whatsappRecipient || cleanWhatsAppNumber(shopSettings?.whatsappNumber),
      });
      if (previewOrder.whatsappStatus === "delivered") {
        setIsSent(true);
      }
    } else {
      setIsSent(false);
      setApiStatus(null);
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
   * Primary action: Send Order on WhatsApp (Direct Photo Bill via Meta Cloud API)
   * 1. Validates that store owner WhatsApp recipient number is configured
   * 2. Generates the bill PNG using actual cart and customer details
   * 3. Dispatches image directly to store owner's entered WhatsApp number via Meta Cloud API
   * 4. Reports verified API delivery status or clear configuration requirement
   */
  const handleSendToWhatsApp = async () => {
    if (!isAdminPhoneValid) {
      showNotification(
        "Shop WhatsApp number is not configured by the store owner. Please configure it in the Admin Dashboard Settings.",
        "error"
      );
      return;
    }

    setIsGenerating(true);
    setApiStatus(null);
    try {
      const result = await dispatchOrderPhotoBillToWhatsApp({
        order: previewOrder,
        shopSettings,
      });

      if (result.success && result.apiSent) {
        setGeneratedImgUrl(result.dataUrl);
        confirmOrderRedirect(previewOrder.orderNumber);
        clearCart();
        setIsSent(true);
        setApiStatus({
          status: "delivered",
          messageId: result.messageId,
          recipient: result.recipient || cleanAdminPhone,
        });
        showNotification(
          `Bill photo delivered directly to store owner (+${result.recipient || cleanAdminPhone}) via WhatsApp Business API!`,
          "success"
        );
      } else {
        setIsSent(false);
        setApiStatus({
          status: result.notConfigured ? "unconfigured" : "failed",
          error: result.error || "Meta WhatsApp Business API dispatch failed.",
          metaDetails: result.metaDetails,
          stage: result.stage,
          recipient: result.recipient || cleanAdminPhone,
        });
        showNotification(
          result.error || "Failed to dispatch bill photo via WhatsApp API.",
          "error"
        );
      }
    } catch (err) {
      console.error("[BillPreview] Order dispatch error:", err);
      setIsSent(false);
      setApiStatus({
        status: "failed",
        error: err.message || "Failed to dispatch bill photo.",
        recipient: cleanAdminPhone,
      });
      showNotification("Could not dispatch bill photo: " + err.message, "error");
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
          {apiStatus && apiStatus.status === "delivered" ? (
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                <CheckCircle size={24} color="#16a34a" />
                <h4 style={{ margin: 0, color: "#166534", fontSize: "1.05rem" }}>
                  Bill Photo Delivered to Store Owner via WhatsApp!
                </h4>
              </div>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", color: "#1e3a29", lineHeight: 1.5 }}>
                Your order <strong>#{previewOrder.orderNumber}</strong> has been transmitted directly to the store owner (+{apiStatus.recipient || cleanAdminPhone}) via the official Meta WhatsApp Business Cloud API. Your shopping cart has been cleared.
              </p>
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.82rem",
                  color: "#166534",
                }}
              >
                <div>
                  <strong>WhatsApp Delivery Status:</strong> <span style={{ color: "#15803d", fontWeight: "700" }}>✓ Verified Delivered</span>
                </div>
                {apiStatus.messageId && (
                  <div style={{ marginTop: "4px" }}>
                    <strong>Meta Message ID:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{apiStatus.messageId}</code>
                  </div>
                )}
                <div style={{ marginTop: "4px", color: "#15803d" }}>
                  <strong>Recipient:</strong> Store Owner (+{apiStatus.recipient || cleanAdminPhone})
                </div>
              </div>
            </div>
          ) : apiStatus && (apiStatus.status === "unconfigured" || apiStatus.status === "failed") ? (
            <div
              style={{
                background: "#fef2f2",
                border: "2px solid #fca5a5",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
                boxShadow: "0 2px 8px rgba(220, 38, 38, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                <AlertTriangle size={24} color="#dc2626" />
                <h4 style={{ margin: 0, color: "#991b1b", fontSize: "1.05rem" }}>
                  {apiStatus.status === "unconfigured"
                    ? "WhatsApp Business Cloud API Setup Required"
                    : "WhatsApp API Delivery Failed"}
                </h4>
              </div>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.86rem", color: "#7f1d1d", lineHeight: 1.5 }}>
                {apiStatus.error || "The bill photo could not be sent via WhatsApp Business Cloud API."}
              </p>

              {/* Exact Meta Graph API error codes & diagnosis */}
              {apiStatus.metaDetails && (
                <div
                  style={{
                    background: "#fff1f2",
                    border: "1px dashed #fda4af",
                    borderRadius: "6px",
                    padding: "0.55rem 0.85rem",
                    marginBottom: "0.75rem",
                    fontSize: "0.78rem",
                    color: "#9f1239",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: "700", marginBottom: "2px" }}>
                    Meta WhatsApp Cloud API Diagnostics:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                    {apiStatus.metaDetails.code && (
                      <span>
                        Error Code: <strong>{apiStatus.metaDetails.code}</strong>
                      </span>
                    )}
                    {apiStatus.metaDetails.error_subcode && (
                      <span>
                        Subcode: <strong>{apiStatus.metaDetails.error_subcode}</strong>
                      </span>
                    )}
                    {apiStatus.metaDetails.type && (
                      <span>
                        Type: <code>{apiStatus.metaDetails.type}</code>
                      </span>
                    )}
                  </div>
                  {apiStatus.metaDetails.fbtrace_id && (
                    <div style={{ fontSize: "0.72rem", color: "#be123c", marginTop: "3px" }}>
                      Meta Trace ID: <code>{apiStatus.metaDetails.fbtrace_id}</code>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontSize: "0.82rem",
                  color: "#991b1b",
                }}
              >
                <div>
                  <strong>Recipient Store Owner Number:</strong> +{apiStatus.recipient || cleanAdminPhone}
                </div>
                <div style={{ marginTop: "4px", color: "#64748b" }}>
                  The store owner can configure permanent Meta WhatsApp Cloud API credentials (Phone Number ID & Access Token) in Admin Settings &gt; Meta WhatsApp Business Settings.
                </div>
              </div>

              {/* Retry & Admin Action Buttons */}
              <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSendToWhatsApp}
                  disabled={isGenerating || !isAdminPhoneValid}
                  style={{
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.45rem 0.95rem",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    cursor: isGenerating ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                  }}
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span>Retry Sending Bill Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewOrder(null);
                    setIsAdminOpen(true);
                  }}
                  style={{
                    background: "#f1f5f9",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.82rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  ⚙️ Open Admin Settings
                </button>
              </div>
            </div>
          ) : (
            /* PRE-SUBMISSION PHOTO BILL NOTICE */
            <div className="whatsapp-mandatory-alert">
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
                <Sparkles size={20} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Official Photo Bill Ready:</strong> Your verified invoice image has been generated below with Poomani Chekku Ennai branding and exact order details.
                  When you click <strong>"Send Bill Photo on WhatsApp"</strong>, the website dispatches this bill photo directly to the store owner's entered WhatsApp number (<strong>+{cleanAdminPhone}</strong>) via Meta WhatsApp Business API.
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

          {/* 3. Primary CTA: Send Bill Photo on WhatsApp via Meta API */}
          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className={`btn-proceed-wa ${isSent ? "btn-proceed-wa-sent" : ""}`}
            onClick={handleSendToWhatsApp}
            disabled={isGenerating || !isAdminPhoneValid}
            title={
              !isAdminPhoneValid
                ? "Store WhatsApp number is not configured by the admin in Settings"
                : "Send customer order bill photo directly to store owner's WhatsApp"
            }
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Sending to WhatsApp...</span>
              </>
            ) : !isAdminPhoneValid ? (
              <>
                <AlertTriangle size={18} color="#ffffff" />
                <span>Admin WhatsApp Number Required</span>
              </>
            ) : isSent ? (
              <>
                <Check size={18} />
                <span>Bill Photo Delivered to Store Owner</span>
              </>
            ) : apiStatus && apiStatus.status === "failed" ? (
              <>
                <RefreshCw size={18} />
                <span>Retry Sending on WhatsApp</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Send Order on WhatsApp</span>
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
