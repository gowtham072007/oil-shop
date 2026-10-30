import { formatINR } from './billGenerator';

/**
 * Generate a high-resolution, professional invoice-style bill image (PNG / JPEG)
 * using HTML5 Canvas with sharp 2x retina scaling.
 *
 * @param {Object} order - Full order object with items, customer details, and totals
 * @param {Object} shopSettings - Shop configuration (name, phone, address, fssai, etc.)
 * @param {string} format - 'png' or 'jpeg'
 * @returns {Promise<{ dataUrl: string, blob: Blob, canvas: HTMLCanvasElement, mimeType: string, ext: string }>}
 */
export async function generateBillImage(order, shopSettings = {}, format = 'png') {
  const scale = 2; // Retina scale factor for ultra-sharp text and borders
  const width = 800;
  const isJpeg = format.toLowerCase() === 'jpeg' || format.toLowerCase() === 'jpg';
  const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
  const ext = isJpeg ? 'jpg' : 'png';
  const fontStack = '"Nirmala UI", "Mukta Malar", "Tamil Sangam MN", -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  
  // Calculate dynamic height based on number of items
  const itemsCount = Math.max(1, order.items?.length || 1);
  const rowHeight = 52;
  const tableHeight = 44 + (itemsCount * rowHeight);
  const baseHeight = 560; // Header, metadata card, summary, footer
  const height = baseHeight + tableHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background - Clean pure white paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border with subtle gold tint
  ctx.strokeStyle = '#e8e0d2';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  // Top Accent Bar - Royal Gold & Deep Forest Green
  ctx.fillStyle = '#09331d';
  ctx.fillRect(16, 16, width - 32, 8);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(16, 24, width - 32, 3);

  // Load and draw Logo if available
  let headerStartY = 55;
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/images/logo.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve; // Continue gracefully if logo fails
      setTimeout(resolve, 350); // Don't hang if logo takes too long
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const logoSize = 64;
      ctx.drawImage(logoImg, 42, headerStartY - 6, logoSize, logoSize);
    }
  } catch {
    // Graceful fallback to text-only header
  }

  // 1. Header Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 24px "Noto Sans Tamil", Georgia, serif';
  ctx.fillText('POOMANI CHEKKU ENNAI — பூமணி செக்கு எண்ணெய்', width / 2, headerStartY + 10);

  ctx.fillStyle = '#8c6819';
  ctx.font = 'italic 600 15px "Noto Sans Tamil", Arial, sans-serif';
  ctx.fillText('Customer Order Bill / வாடிக்கையாளர் ஆர்டர் ரசீது', width / 2, headerStartY + 32);

  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  const addressText = `${shopSettings.address || 'Gopalasamuthiram, Tamil Nadu'} • Contact: +91 63857 55368 • FSSAI #${shopSettings.fssaiNumber || '12421008000421'}`;
  ctx.fillText(addressText, width / 2, headerStartY + 52);

  // Separator rule
  ctx.strokeStyle = '#ecd8ab';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, headerStartY + 68);
  ctx.lineTo(width - 40, headerStartY + 68);
  ctx.stroke();

  // 2. Order Metadata Card (Light beige rounded container)
  const metaY = headerStartY + 80;
  const metaHeight = 110;
  ctx.fillStyle = '#faf7f0';
  ctx.strokeStyle = '#ecd8ab';
  ctx.lineWidth = 1;
  roundRect(ctx, 40, metaY, width - 80, metaHeight, 8, true, true);

  // Metadata Columns
  ctx.textAlign = 'left';
  const col1X = 60;
  const col2X = 420;

  // Left Column
  ctx.fillStyle = '#57655d';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('BILL / ORDER ID:', col1X, metaY + 26);
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(order.orderNumber || 'OS-2026', col1X + 115, metaY + 26);

  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Date & Time:', col1X, metaY + 52);
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(order.date || new Date().toLocaleString('en-IN'), col1X + 115, metaY + 52);

  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Payment Method:', col1X, metaY + 78);
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText(order.paymentMethod || 'Cash', col1X + 115, metaY + 78);

  // Right Column (Customer Details)
  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Customer:', col2X, metaY + 26);
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(order.customerName || 'Customer', col2X + 85, metaY + 26);

  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Phone:', col2X, metaY + 52);
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(order.customerPhone || '—', col2X + 85, metaY + 52);

  ctx.fillStyle = '#57655d';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('Address:', col2X, metaY + 78);
  ctx.fillStyle = '#1f2923';
  ctx.font = '12px Arial, sans-serif';
  const cleanAddr = (order.customerAddress || order.address || order.deliveryAddress || 'Direct Order').slice(0, 42);
  ctx.fillText(cleanAddr, col2X + 85, metaY + 78);

  // 3. Itemized Products Table
  const tableTopY = metaY + metaHeight + 20;
  const tableX = 40;
  const tableW = width - 80;

  // Column X coordinates and widths
  // Total: 720px
  // S.No: 45 | Product Name: 275 | Size: 95 | Qty: 60 | Unit Price: 115 | Amount: 130
  const cols = [
    { label: 'S.No.', x: tableX, w: 45, align: 'center' },
    { label: 'Product Name', x: tableX + 45, w: 275, align: 'left' },
    { label: 'Quantity/Size', x: tableX + 320, w: 95, align: 'center' },
    { label: 'Qty', x: tableX + 415, w: 60, align: 'center' },
    { label: 'Unit Price', x: tableX + 475, w: 115, align: 'right' },
    { label: 'Amount', x: tableX + 590, w: 130, align: 'right' },
  ];

  // Table Header Row
  ctx.fillStyle = '#09331d';
  roundRect(ctx, tableX, tableTopY, tableW, 36, 6, true, false);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial, sans-serif';
  cols.forEach((col) => {
    ctx.textAlign = col.align;
    const textX = col.align === 'center' ? col.x + col.w / 2 : col.align === 'right' ? col.x + col.w - 12 : col.x + 12;
    ctx.fillText(col.label, textX, tableTopY + 23);
  });

  // Table Data Rows
  let currentY = tableTopY + 36;
  ctx.lineWidth = 1;

  (order.items || []).forEach((item, index) => {
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
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(String(index + 1), cols[0].x + cols[0].w / 2, currentY + 30);

    // Product Name (English + Tamil)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 13px Arial, sans-serif';
    const enName = item.oilNameEn || item.name || 'Pure Edible Oil';
    const taName = item.oilNameTa || item.regionalName || '';
    ctx.fillText(enName, cols[1].x + 12, currentY + 22);

    if (taName) {
      ctx.fillStyle = '#8c6819';
      ctx.font = '12px "Noto Sans Tamil", Arial, sans-serif';
      ctx.fillText(taName, cols[1].x + 12, currentY + 40);
    }

    // Quantity / Size
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2923';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.fillText(item.packSize || '1 Litre', cols[2].x + cols[2].w / 2, currentY + 30);

    // Qty (Bottles)
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(String(item.quantity), cols[3].x + cols[3].w / 2, currentY + 30);

    // Unit Price
    ctx.textAlign = 'right';
    ctx.fillStyle = '#57655d';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText(`₹${formatINR(item.rate)}`, cols[4].x + cols[4].w - 12, currentY + 30);

    // Line Amount
    ctx.fillStyle = '#09331d';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`₹${formatINR(item.amount)}`, cols[5].x + cols[5].w - 12, currentY + 30);

    currentY += rowHeight;
  });

  // Table outer vertical lines
  ctx.strokeStyle = '#e8e0d2';
  ctx.strokeRect(tableX, tableTopY + 36, tableW, itemsCount * rowHeight);

  // 4. Totals Summary Box (Right aligned)
  const summaryY = currentY + 20;
  const summaryW = 280;
  const summaryX = width - 40 - summaryW;

  // Subtotal
  ctx.textAlign = 'left';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#57655d';
  ctx.fillText('Subtotal:', summaryX, summaryY + 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#1f2923';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText(`₹${formatINR(order.subtotal)}`, summaryX + summaryW, summaryY + 16);

  let nextSummaryY = summaryY + 40;
  if (order.discount > 0) {
    ctx.textAlign = 'left';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#16a34a';
    ctx.fillText('Discount Coupon:', summaryX, nextSummaryY);
    ctx.textAlign = 'right';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText(`-₹${formatINR(order.discount)}`, summaryX + summaryW, nextSummaryY);
    nextSummaryY += 24;
  }

  // Grand Total Highlighted Card
  ctx.fillStyle = '#fef7e0';
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, summaryX - 10, nextSummaryY - 8, summaryW + 10, 48, 8, true, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('GRAND TOTAL / மொத்தத் தொகை:', summaryX, nextSummaryY + 22);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`₹${formatINR(order.grandTotal)}`, summaryX + summaryW - 4, nextSummaryY + 22);

  // 5. Footer Quality Seal & Thanks Notice
  const footerY = height - 65;
  ctx.strokeStyle = '#e8e0d2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, footerY);
  ctx.lineTo(width - 40, footerY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#09331d';
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillText('Thank you for choosing Poomani Chekku Ennai! 100% Pure & Unrefined Edible Cooking Oils.', width / 2, footerY + 22);

  ctx.fillStyle = '#85958c';
  ctx.font = '11px Arial, sans-serif';
  ctx.fillText('Official WhatsApp Order Confirmation • Gopalasamuthiram, Tamil Nadu', width / 2, footerY + 40);

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
 * Helper to draw rounded rectangle
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

