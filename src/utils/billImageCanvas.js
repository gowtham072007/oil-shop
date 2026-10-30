import { formatINR, cleanWhatsAppNumber } from './billGenerator.js';
import { sendWhatsAppBillApi } from './api.js';

/**
 * Helper to wrap text into multiple lines within a maximum pixel width
 */
function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Helper to draw rounded rectangle with fill and stroke options
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Generate a high-resolution, professional invoice-style bill image (PNG / JPEG)
 * using HTML5 Canvas with sharp 2x retina scaling and brand styling.
 *
 * @param {Object} order - Full order object with items, customer details, and totals
 * @param {Object} shopSettings - Shop configuration (name, phone, address, fssai, etc.)
 * @param {string} format - 'png' or 'jpeg'
 * @returns {Promise<{ dataUrl: string, blob: Blob, canvas: HTMLCanvasElement, mimeType: string, ext: string }>}
 */
export async function generateBillImage(order, shopSettings = {}, format = 'png') {
  // Ensure custom web fonts (Noto Sans Tamil, Cinzel, Plus Jakarta Sans) are ready
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue gracefully
    }
  }

  const scale = 2; // 2x Retina scale factor for ultra-sharp rendering
  const width = 800;
  const isJpeg = format.toLowerCase() === 'jpeg' || format.toLowerCase() === 'jpg';
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
  const ext = isJpeg ? 'jpg' : 'png';

  // Calculate dynamic address lines & height
  const fullAddress = order.customerAddress || order.address || order.deliveryAddress || 'Direct Order';
  const items = order.items || [];
  const itemsCount = Math.max(1, items.length);
  const rowHeight = 52;

  // Measure address lines with a temporary canvas to get exact height
  let addrLines = [fullAddress];
  if (typeof document !== 'undefined') {
    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    mctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
    addrLines = wrapTextLines(mctx, fullAddress, 290);
  }
  const extraAddrHeight = Math.max(0, (addrLines.length - 1) * 16);
  const metaHeight = 114 + extraAddrHeight;

  // Dynamic layout coordinates
  const headerY = 56;
  const divY = headerY + 86;
  const metaY = divY + 14;
  const tableTopY = metaY + metaHeight + 16;
  const tableW = width - 80;
  const tableBottomY = tableTopY + 36 + (itemsCount * rowHeight);
  const summaryY = tableBottomY + 16;
  const hasDiscount = order.discount && order.discount > 0;
  const nextSummaryY = summaryY + (hasDiscount ? 60 : 38);
  const grandTotalBottomY = nextSummaryY + 44;
  const footerY = grandTotalBottomY + 26;
  const height = footerY + 56;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // 1. Paper Background - Clean ivory-white paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border with gold-champagne tint
  ctx.strokeStyle = '#deb869';
  ctx.lineWidth = 2;
  roundRect(ctx, 14, 14, width - 28, height - 28, 14, false, true);

  // Inner subtle border
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, 20, 20, width - 40, height - 40, 10, false, true);

  // Top Accent Bar - Royal Deep Forest Green & Polished Gold
  ctx.fillStyle = '#09331d';
  ctx.fillRect(20, 20, width - 40, 10);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(20, 30, width - 40, 3);

  // 2. Pre-load Logo Image
  let logoImg = null;
  if (typeof Image !== 'undefined') {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/images/logo.png';
      if (img.decode) {
        await img.decode();
        logoImg = img;
      } else {
        await new Promise((resolve) => {
          img.onload = () => { logoImg = img; resolve(); };
          img.onerror = resolve;
          setTimeout(resolve, 350);
        });
      }
    } catch {
      // Graceful fallback to text header
    }
  }

  // 3. Header Section
  const hasLogo = logoImg && logoImg.complete && logoImg.naturalWidth > 0;

  if (hasLogo) {
    // Draw circular gold medallion for logo
    const logoX = 52;
    const logoY = headerY - 4;
    const logoSize = 68;

    ctx.save();
    // Medallion background
    ctx.fillStyle = '#faf6ed';
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Clip circular logo
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  }

  // Brand Name Typography (English + Tamil)
  const titleX = hasLogo ? (width / 2 + 25) : (width / 2);
  ctx.textAlign = 'center';

  // English Brand Name
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 22px Cinzel, Georgia, serif';
  ctx.fillText('POOMANI CHEKKU ENNAI', titleX, headerY + 12);

  // Tamil Brand Name
  ctx.fillStyle = '#8c6411';
  ctx.font = 'bold 17px "Noto Sans Tamil", sans-serif';
  ctx.fillText('பூமணி செக்கு எண்ணெய்', titleX, headerY + 34);

  // Subtitle / Document Type
  ctx.fillStyle = '#57655d';
  ctx.font = 'italic 600 13px "Noto Sans Tamil", "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Customer Order Bill / வாடிக்கையாளர் ஆர்டர் ரசீது', titleX, headerY + 54);

  // Shop Address & FSSAI
  ctx.fillStyle = '#6b7280';
  ctx.font = '11px "Plus Jakarta Sans", Arial, sans-serif';
  const shopPhone = shopSettings?.phoneDisplay || (shopSettings?.whatsappNumber ? `+${shopSettings.whatsappNumber}` : '');
  const phonePart = shopPhone ? ` • Phone: ${shopPhone}` : '';
  const millInfo = `${shopSettings?.address || 'Gopalasamuthiram, Tamil Nadu'}${phonePart} • FSSAI #${shopSettings?.fssaiNumber || '12421008000421'}`;
  ctx.fillText(millInfo, titleX, headerY + 72);

  // Gold Separator Line with Centered Diamond
  ctx.strokeStyle = '#e6cb89';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, divY);
  ctx.lineTo(width - 40, divY);
  ctx.stroke();

  // Decorative center diamond
  ctx.fillStyle = '#c69222';
  ctx.beginPath();
  ctx.moveTo(width / 2, divY - 4);
  ctx.lineTo(width / 2 + 4, divY);
  ctx.lineTo(width / 2, divY + 4);
  ctx.lineTo(width / 2 - 4, divY);
  ctx.closePath();
  ctx.fill();

  // 4. Order & Customer Metadata Card
  ctx.fillStyle = '#faf7f0';
  ctx.strokeStyle = '#e8d9ba';
  ctx.lineWidth = 1.2;
  roundRect(ctx, 40, metaY, width - 80, metaHeight, 10, true, true);

  // Left Column (Order Details)
  const col1X = 60;
  const col2X = 420;

  // Order Number
  ctx.textAlign = 'left';
  ctx.fillStyle = '#57655d';
  ctx.font = 'bold 11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('BILL / ORDER ID:', col1X, metaY + 26);
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 15px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(order.orderNumber || 'OS-2026', col1X + 115, metaY + 26);

  // Date & Time
  ctx.fillStyle = '#57655d';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Date & Time:', col1X, metaY + 52);
  ctx.fillStyle = '#1f2923';
  ctx.font = '600 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(order.date || new Date().toLocaleString('en-IN'), col1X + 115, metaY + 52);

  // Payment Method
  ctx.fillStyle = '#57655d';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Payment Method:', col1X, metaY + 78);
  ctx.fillStyle = '#1f2923';
  ctx.font = '600 12px "Noto Sans Tamil", "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(order.paymentMethod || 'Cash / நேரில் பணம்', col1X + 115, metaY + 78);

  // Right Column (Customer Information)
  ctx.fillStyle = '#57655d';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Customer:', col2X, metaY + 26);
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(order.customerName || 'Customer', col2X + 80, metaY + 26);

  // Customer Phone
  ctx.fillStyle = '#57655d';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Phone:', col2X, metaY + 52);
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(order.customerPhone ? `+91 ${order.customerPhone.replace(/\D/g, '').slice(-10)}` : '—', col2X + 80, metaY + 52);

  // Customer Address (Full Multi-line rendering)
  ctx.fillStyle = '#57655d';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Address:', col2X, metaY + 78);

  ctx.fillStyle = '#1f2923';
  ctx.font = '12px "Plus Jakarta Sans", Arial, sans-serif';
  addrLines.forEach((line, lIdx) => {
    ctx.fillText(line, col2X + 80, metaY + 78 + (lIdx * 17));
  });

  // 5. Itemized Products Table
  const tableX = 40;

  // Column layout
  // Total: 720px -> S.No: 45 | Product Name: 275 | Size: 95 | Qty: 60 | Unit Price: 115 | Amount: 130
  const cols = [
    { label: 'S.No.', x: tableX, w: 45, align: 'center' },
    { label: 'Product Name / பொருள்', x: tableX + 45, w: 275, align: 'left' },
    { label: 'Pack Size', x: tableX + 320, w: 95, align: 'center' },
    { label: 'Qty', x: tableX + 415, w: 60, align: 'center' },
    { label: 'Unit Price', x: tableX + 475, w: 115, align: 'right' },
    { label: 'Item Total', x: tableX + 590, w: 130, align: 'right' },
  ];

  // Table Header Row
  ctx.fillStyle = '#09331d';
  roundRect(ctx, tableX, tableTopY, tableW, 36, 6, true, false);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Noto Sans Tamil", "Plus Jakarta Sans", Arial, sans-serif';
  cols.forEach((col) => {
    ctx.textAlign = col.align;
    const textX = col.align === 'center' ? col.x + col.w / 2 : col.align === 'right' ? col.x + col.w - 12 : col.x + 12;
    ctx.fillText(col.label, textX, tableTopY + 23);
  });

  // Table Data Rows
  let currentY = tableTopY + 36;
  ctx.lineWidth = 1;

  items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    ctx.fillStyle = isEven ? '#ffffff' : '#fcfbfa';
    ctx.fillRect(tableX, currentY, tableW, rowHeight);

    // Row bottom border
    ctx.strokeStyle = '#e8e0d2';
    ctx.beginPath();
    ctx.moveTo(tableX, currentY + rowHeight);
    ctx.lineTo(tableX + tableW, currentY + rowHeight);
    ctx.stroke();

    // S.No.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#57655d';
    ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(String(index + 1), cols[0].x + cols[0].w / 2, currentY + 31);

    // Product Name (English + Tamil)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 13px "Plus Jakarta Sans", Arial, sans-serif';
    const enName = item.oilNameEn || item.name || 'Pure Edible Oil';
    const taName = item.oilNameTa || item.regionalName || '';
    ctx.fillText(enName, cols[1].x + 12, currentY + 21);

    if (taName) {
      ctx.fillStyle = '#8c6411';
      ctx.font = '600 12px "Noto Sans Tamil", Arial, sans-serif';
      ctx.fillText(taName, cols[1].x + 12, currentY + 40);
    }

    // Pack Size (200 ml, 500 ml, 1 lit)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2923';
    ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(item.packSize || '1 Litre', cols[2].x + cols[2].w / 2, currentY + 31);

    // Qty
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(String(item.quantity), cols[3].x + cols[3].w / 2, currentY + 31);

    // Unit Price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#57655d';
    ctx.font = '13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`₹${formatINR(item.rate)}`, cols[4].x + cols[4].w - 12, currentY + 31);

    // Item Total
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`₹${formatINR(item.amount)}`, cols[5].x + cols[5].w - 12, currentY + 31);

    currentY += rowHeight;
  });

  // Table outer vertical border
  ctx.strokeStyle = '#e8e0d2';
  ctx.strokeRect(tableX, tableTopY + 36, tableW, itemsCount * rowHeight);

  // 6. Summary Section (Right-aligned)
  const summaryW = 310;
  const summaryX = width - 40 - summaryW;

  // Subtotal
  ctx.textAlign = 'left';
  ctx.font = '13px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillStyle = '#57655d';
  ctx.fillText('Items Subtotal:', summaryX, summaryY + 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 14px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`₹${formatINR(order.subtotal)}`, summaryX + summaryW, summaryY + 16);

  if (hasDiscount) {
    ctx.textAlign = 'left';
    ctx.font = '13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillStyle = '#16a34a';
    ctx.fillText('Discount:', summaryX, summaryY + 38);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`-₹${formatINR(order.discount)}`, summaryX + summaryW, summaryY + 38);
  }

  // Grand Total Highlighted Card
  ctx.fillStyle = '#fef7e0';
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, summaryX - 10, nextSummaryY - 8, summaryW + 10, 48, 8, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 12px "Noto Sans Tamil", "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('GRAND TOTAL / மொத்தத் தொகை:', summaryX, nextSummaryY + 22);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 19px Cinzel, Georgia, serif';
  ctx.fillText(`₹${formatINR(order.grandTotal)}`, summaryX + summaryW - 4, nextSummaryY + 23);

  // 7. Footer Quality Seal & Thanks Notice
  ctx.strokeStyle = '#e6cb89';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, footerY);
  ctx.lineTo(width - 40, footerY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 12px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Thank you for choosing Poomani Chekku Ennai! 100% Pure & Unrefined Edible Cooking Oils.', width / 2, footerY + 24);

  ctx.fillStyle = '#85958c';
  ctx.font = '11px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Official WhatsApp Order Confirmation • Gopalasamuthiram, Tamil Nadu', width / 2, footerY + 42);

  // Export as PNG or JPEG
  return new Promise((resolve) => {
    const quality = isJpeg ? 0.95 : undefined;
    const dataUrl = canvas.toDataURL(mimeType, quality);
    canvas.toBlob(
      (blob) => {
        resolve({ dataUrl, blob, canvas, mimeType, ext });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Generates and triggers automatic browser download of the bill image file
 */
export async function downloadBillImageFile(order, shopSettings = {}, format = 'png') {
  const result = await generateBillImage(order, shopSettings, format);
  const cleanOrder = String(order.orderNumber || 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Poomani_Chekku_Ennai_Bill_${cleanOrder}.${result.ext}`;

  const link = document.createElement('a');
  link.download = fileName;
  link.href = result.dataUrl;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 200);

  return {
    ...result,
    fileName,
  };
}

/**
 * Unified WhatsApp Photo Bill Dispatcher
 * Generates the bill image and opens WhatsApp addressed to the store owner's saved number
 * with the bill image attached (native file share where supported or auto-download fallback).
 *
 * @param {Object} params
 * @param {Object} params.order - The completed order record
 * @param {Object} params.shopSettings - Store configuration with saved admin WhatsApp number
 * @returns {Promise<{ success?: boolean, cancelled?: boolean, fileName: string, dataUrl: string, shareMethod: string, cleanAdmin: string }>}
 */
export async function dispatchOrderPhotoBillToWhatsApp({
  order,
  shopSettings = {},
}) {
  const cleanAdmin = cleanWhatsAppNumber(shopSettings?.whatsappNumber);
  if (!cleanAdmin || cleanAdmin.length < 10) {
    throw new Error("Shop WhatsApp recipient number is not configured by the store owner in Admin Settings.");
  }

  // 1. Generate high-resolution bill PNG image file from actual order
  const imageResult = await generateBillImage(order, shopSettings, "png");
  const cleanOrder = String(order.orderNumber || "order").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Poomani_Chekku_Ennai_Bill_${cleanOrder}.png`;
  const billFile = new File([imageResult.blob], fileName, { type: "image/png" });

  // 2. Prepare order message
  const shortMessage = `Please find my Poomani Chekku Ennai order bill attached.\n\n*Order ID:* ${order.orderNumber}\n*Customer:* ${order.customerName}\n*Phone:* ${order.customerPhone}\n*Grand Total:* ₹${formatINR(order.grandTotal)}`;

  // 3. Check native Web Share API with image file support
  const canShareFile = Boolean(
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.share &&
    navigator.canShare({ files: [billFile] })
  );

  let shareMethod = "download";

  if (canShareFile) {
    try {
      await navigator.share({
        files: [billFile],
        title: `Poomani Chekku Ennai Bill - ${order.orderNumber}`,
        text: shortMessage,
      });
      shareMethod = "native";
    } catch (err) {
      if (err.name === "AbortError") {
        return { cancelled: true, fileName, dataUrl: imageResult.dataUrl, cleanAdmin };
      }
      console.warn("[WhatsApp Dispatch] Native file share fallback:", err);
      // Fall through to download and click-to-chat
    }
  }

  // 4. Fallback for Desktop / non-share browsers (or fallback after error):
  if (shareMethod === "download") {
    // Download bill photo to user's device
    const link = document.createElement("a");
    link.download = fileName;
    link.href = imageResult.dataUrl;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 200);

    // Open WhatsApp click-to-chat addressed directly to the ADMIN's saved number
    const waText = `${shortMessage}\n\n(Bill photo downloaded: ${fileName} - please attach and send to confirm your order)`;
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanAdmin}&text=${encodeURIComponent(waText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  // 5. Background dispatch to server (saves bill persistently & triggers Meta Cloud API if configured)
  try {
    await sendWhatsAppBillApi({
      orderNumber: order.orderNumber,
      customerPhone: order.customerPhone,
      customerName: order.customerName,
      billDataUrl: imageResult.dataUrl,
      billText: order.billText || shortMessage,
    });
  } catch (cloudErr) {
    console.warn("[WhatsApp Dispatch] Server send:", cloudErr.message);
  }

  return {
    success: true,
    shareMethod,
    fileName,
    dataUrl: imageResult.dataUrl,
    cleanAdmin,
  };
}
