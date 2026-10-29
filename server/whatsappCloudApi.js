import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uploadsDir } from './upload.js';
import { getShopSettings } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure persistent directory for bill images
export const billsDir = path.join(uploadsDir, 'bills');
if (!fs.existsSync(billsDir)) {
  fs.mkdirSync(billsDir, { recursive: true });
}

/**
 * Clean phone number to WhatsApp international standard (e.g. 919876543210)
 */
export function sanitizeWhatsAppPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Save dynamically generated bill image to server persistent disk
 * @param {string} orderNumber - e.g. OS-2026-8492
 * @param {string} dataUrl - base64 data URI (image/png or image/jpeg)
 * @param {Object} req - Express request object to resolve base URL
 * @returns {Promise<{ relativeUrl: string, publicUrl: string, filePath: string }>}
 */
export async function saveBillImageFile(orderNumber, dataUrl, req) {
  if (!dataUrl || !dataUrl.includes(',')) {
    throw new Error('Invalid bill image data URL.');
  }

  const safeOrderNumber = String(orderNumber || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
  const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  const ext = matches && matches[1] === 'jpeg' ? 'jpg' : 'png';
  const base64Content = matches ? matches[2] : dataUrl.split(',')[1];
  const buffer = Buffer.from(base64Content, 'base64');

  const fileName = `Poomani_Bill_${safeOrderNumber}.${ext}`;
  const filePath = path.join(billsDir, fileName);

  await fs.promises.writeFile(filePath, buffer);

  const relativeUrl = `/uploads/bills/${fileName}`;
  
  // Determine public base URL (custom domain, Render external URL, or host header)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
  const publicBase = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`;
  const publicUrl = `${publicBase.replace(/\/$/, '')}${relativeUrl}`;

  return {
    fileName,
    relativeUrl,
    publicUrl,
    filePath,
    sizeBytes: buffer.length,
  };
}

/**
 * Check if Official WhatsApp Business Cloud API is configured
 */
export async function getWhatsAppCloudConfig() {
  const settings = await getShopSettings();
  
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN || settings.whatsappCloudApiToken || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsappPhoneNumberId || '';
  const wabaId = process.env.WHATSAPP_WABA_ID || settings.whatsappWabaId || '';
  const isEnabled = Boolean(process.env.WHATSAPP_CLOUD_API_ENABLED === 'true' || settings.whatsappCloudApiEnabled);

  return {
    isConfigured: Boolean(token && phoneNumberId),
    isEnabled,
    phoneNumberId: phoneNumberId ? `${phoneNumberId.slice(0, 4)}••••${phoneNumberId.slice(-4)}` : '',
    hasToken: Boolean(token),
    wabaId: wabaId ? `${wabaId.slice(0, 4)}••••` : '',
    rawToken: token,
    rawPhoneNumberId: phoneNumberId,
  };
}

/**
 * Send an image with caption via Official Meta WhatsApp Business Platform (Cloud API)
 * 
 * Requirements:
 * 1. Meta Business Account & System User Access Token with `whatsapp_business_messaging` permission
 * 2. WhatsApp Business Phone Number ID registered on Meta
 * 3. Publicly accessible HTTPS URL for the image
 * 4. Customer opt-in consent to receive WhatsApp messages
 *
 * @param {Object} params
 * @param {string} params.to - Customer WhatsApp phone number
 * @param {string} params.imageUrl - Publicly accessible HTTPS image URL
 * @param {string} params.caption - Order text caption matching bill details
 * @param {string} params.orderNumber - Order identifier
 * @returns {Promise<Object>}
 */
export async function sendWhatsAppCloudImage({ to, imageUrl, caption, orderNumber }) {
  const config = await getWhatsAppCloudConfig();

  if (!config.isConfigured || !config.rawToken || !config.rawPhoneNumberId) {
    return {
      success: false,
      apiSent: false,
      reason: 'WhatsApp Business Cloud API is not configured on this server. Standard client-assisted WhatsApp dispatch is used.',
    };
  }

  const cleanRecipient = sanitizeWhatsAppPhone(to);
  if (!cleanRecipient) {
    throw new Error('Valid recipient phone number is required to send via WhatsApp Cloud API.');
  }

  // Ensure image URL is public HTTPS
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    throw new Error('WhatsApp Cloud API requires a fully qualified HTTP/HTTPS image URL.');
  }

  const metaUrl = `https://graph.facebook.com/v20.0/${config.rawPhoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'image',
    image: {
      link: imageUrl,
      caption: caption || `POOMANI OILS — Order Bill ${orderNumber || ''}`,
    },
  };

  try {
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.rawToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Cloud API] Meta API error:', data);
      return {
        success: false,
        apiSent: false,
        error: data.error?.message || `Meta API error (${response.status})`,
        metaDetails: data.error,
      };
    }

    console.log(`[WhatsApp Cloud API] Message dispatched successfully for order ${orderNumber}:`, data);
    return {
      success: true,
      apiSent: true,
      messageId: data.messages?.[0]?.id,
      data,
    };
  } catch (err) {
    console.error('[WhatsApp Cloud API] Network error connecting to Meta:', err.message);
    return {
      success: false,
      apiSent: false,
      error: `Failed to contact Meta WhatsApp API: ${err.message}`,
    };
  }
}

