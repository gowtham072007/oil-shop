import React, { useState } from "react";
import { useShop } from "../context/ShopContext";
import {
  X,
  Copy,
  Check,
  Send,
  AlertTriangle,
  Receipt,
  ExternalLink,
} from "lucide-react";

export const BillPreviewModal = () => {
  const { previewOrder, setPreviewOrder, confirmOrderRedirect, showNotification } = useShop();
  const [copied, setCopied] = useState(false);

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
    confirmOrderRedirect(previewOrder.orderNumber);
    // Open official WhatsApp click-to-chat URL in new window
    window.open(previewOrder.waUrl, "_blank", "noopener,noreferrer");
  };

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
          <h3 id="bill-modal-title">
            <Receipt size={20} color="#e5b94c" />
            Official WhatsApp Bill Review ({previewOrder.orderNumber})
          </h3>
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
          {/* Mandatory Submission Notice */}
          <div className="whatsapp-mandatory-alert">
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
              <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Important Notice</strong>
                Your order is not submitted until you send the WhatsApp message in the chat!
                Click the button below to review and manually send your pre-filled bill.
              </div>
            </div>
          </div>

          {/* Formatted Bill Receipt Preview */}
          <div style={{ marginBottom: "0.5rem", fontWeight: "700", fontSize: "0.85rem", color: "#09331d" }}>
            Generated Order Invoice:
          </div>
          <pre className="bill-receipt-paper" id="whatsapp-bill-preview-content">
            {previewOrder.billText}
          </pre>
        </div>

        {/* Modal Actions */}
        <div className="bill-modal-actions">
          <button
            id="copy-bill-btn"
            type="button"
            className="btn-copy-bill"
            onClick={handleCopyBill}
            title="Copy plain bill text"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
            <span>{copied ? "Copied!" : "Copy Bill"}</span>
          </button>

          <button
            id="proceed-to-whatsapp-btn"
            type="button"
            className="btn-proceed-wa"
            onClick={handleSendToWhatsApp}
          >
            <Send size={18} />
            <span>Open & Send on WhatsApp</span>
            <ExternalLink size={15} style={{ opacity: 0.8 }} />
          </button>
        </div>
      </div>
    </div>
  );
};
