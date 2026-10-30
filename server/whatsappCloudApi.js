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
  const isEnabled = Boolean(
    process.env.WHATSAPP_CLOUD_API_ENABLED === 'true' ||
    settings.whatsappCloudApiEnabled === true ||
    (settings.whatsappCloudApiEnabled !== false && token && phoneNumberId)
  );

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
 * Verify WhatsApp Cloud API credentials against Meta Graph API
 * @param {string} token - Meta System User Access Token
 * @param {string} phoneNumberId - Meta Phone Number ID
 * @returns {Promise<{ valid: boolean, verifiedName?: string, displayPhoneNumber?: string, qualityRating?: string, error?: string }>}
 */
export async function verifyWhatsAppCloudCredentials(token, phoneNumberId) {
  if (!token || !phoneNumberId) {
    return { valid: false, error: 'Both Access Token and Phone Number ID are required.' };
  }

  try {
    const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(metaUrl);
    const data = await res.json();

    if (!res.ok) {
      return {
        valid: false,
        error: data.error?.message || `Meta API verification failed with HTTP ${res.status}`,
        details: data.error,
      };
    }

    return {
      valid: true,
      verifiedName: data.verified_name || 'Verified WhatsApp Business',
      displayPhoneNumber: data.display_phone_number || '',
      qualityRating: data.quality_rating || 'GREEN',
      id: data.id,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Network error connecting to Meta: ${err.message}`,
    };
  }
}

/**
 * Send an image bill with caption via Official Meta WhatsApp Business Platform (Cloud API)
 * Directly uploads media to Meta's WhatsApp Media Endpoint where supported,
 * and delivers the photo bill directly to the admin's saved WhatsApp number.
 *
 * @param {Object} params
 * @param {string} params.to - Admin shop WhatsApp phone number
 * @param {string} [params.filePath] - Absolute path to saved bill image file on server
 * @param {Buffer} [params.fileBuffer] - In-memory image buffer
 * @param {string} [params.fileName] - Filename (e.g. Poomani_Bill_OS-2026-8492.png)
 * @param {string} [params.imageUrl] - Publicly accessible HTTPS image URL fallback
 * @param {string} params.caption - Order text caption matching bill details
 * @param {string} params.orderNumber - Order identifier
 * @returns {Promise<Object>}
 */
export async function sendWhatsAppCloudImage({
  to,
  filePath,
  fileBuffer,
  fileName,
  imageUrl,
  caption,
  orderNumber,
}) {
  const config = await getWhatsAppCloudConfig();

  if (!config.isConfigured || !config.rawToken || !config.rawPhoneNumberId) {
    return {
      success: false,
      apiSent: false,
      error: 'WhatsApp Business Cloud API is not configured on this server. Please enter your Meta Phone Number ID and System User Access Token in Admin Settings.',
    };
  }

  const cleanRecipient = sanitizeWhatsAppPhone(to);
  if (!cleanRecipient) {
    return {
      success: false,
      apiSent: false,
      error: 'Valid store owner WhatsApp phone number is required to send order bills.',
    };
  }

  // 1. Resolve image buffer from filePath if provided
  let buffer = fileBuffer;
  if (!buffer && filePath && fs.existsSync(filePath)) {
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch (readErr) {
      console.warn('[WhatsApp Cloud API] Could not read bill image file:', readErr.message);
    }
  }

  let mediaId = null;

  // 2. Upload binary bill image directly to Meta WhatsApp Media Endpoint
  if (buffer && Buffer.isBuffer(buffer)) {
    try {
      const mediaUploadUrl = `https://graph.facebook.com/v20.0/${config.rawPhoneNumberId}/media`;
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'image/png');
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('file', blob, fileName || `Poomani_Bill_${orderNumber || Date.now()}.png`);

      const mediaRes = await fetch(mediaUploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.rawToken}`,
        },
        body: formData,
      });

      const mediaData = await mediaRes.json();
      if (mediaRes.ok && mediaData.id) {
        mediaId = mediaData.id;
        console.log(`[WhatsApp Cloud API] Bill photo uploaded to Meta Media API, Media ID: ${mediaId}`);
      } else {
        console.warn('[WhatsApp Cloud API] Meta Media upload response:', mediaData);
      }
    } catch (uploadErr) {
      console.warn('[WhatsApp Cloud API] Direct media upload error:', uploadErr.message);
    }
  }

  // 3. Assemble Meta message payload
  const metaUrl = `https://graph.facebook.com/v20.0/${config.rawPhoneNumberId}/messages`;
  let imagePayload = null;

  if (mediaId) {
    imagePayload = {
      id: mediaId,
      caption: caption || `POOMANI CHEKKU ENNAI — Order Bill ${orderNumber || ''}`,
    };
  } else if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    imagePayload = {
      link: imageUrl,
      caption: caption || `POOMANI CHEKKU ENNAI — Order Bill ${orderNumber || ''}`,
    };
  } else {
    return {
      success: false,
      apiSent: false,
      error: 'Cannot send bill photo: Direct upload to Meta Media API failed and no public HTTPS link is available.',
    };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'image',
    image: imagePayload,
  };

  try {
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.rawToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Cloud API] Meta message dispatch error:', data);
      return {
        success: false,
        apiSent: false,
        error: data.error?.message || `Meta WhatsApp API error (${response.status})`,
        metaDetails: data.error,
        recipient: cleanRecipient,
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    console.log(`[WhatsApp Cloud API] Bill photo dispatched successfully for order ${orderNumber}, ID: ${messageId}`);
    return {
      success: true,
      apiSent: true,
      messageId,
      recipient: cleanRecipient,
      data,
    };
  } catch (err) {
    console.error('[WhatsApp Cloud API] Network error connecting to Meta:', err.message);
    return {
      success: false,
      apiSent: false,
      error: `Failed to contact Meta WhatsApp API: ${err.message}`,
      recipient: cleanRecipient,
    };
  }
}

