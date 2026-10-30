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
 * Format raw Meta Graph API error into an actionable, user-friendly message
 */
export function formatMetaErrorMessage(metaError) {
  if (!metaError) return 'Meta WhatsApp Cloud API error occurred.';
  const code = metaError.code;
  const subcode = metaError.error_subcode;
  const msg = metaError.message || 'Unknown Meta error';
  const details = metaError.error_data?.details || '';

  let hint = '';
  if (code === 190) {
    hint = ' (Access token is invalid or expired. Generate a permanent System User Token in Meta Business Manager with whatsapp_business_messaging permission)';
  } else if (code === 131030) {
    hint = ' (Recipient phone number is not in allowed test list. In Meta Developer Console, add this number under WhatsApp > API Setup > To numbers)';
  } else if (code === 100) {
    hint = ' (Invalid Phone Number ID or missing parameter)';
  } else if (code === 131026) {
    hint = ' (Message undeliverable to this phone number)';
  } else if (code === 131047) {
    hint = ' (24-hour customer window expired. A template message is required to initiate conversation with this number)';
  }

  const prefix = code ? `Meta API Error #${code}${subcode ? ` (Subcode: ${subcode})` : ''}: ` : '';
  const detailStr = details ? ` - ${details}` : '';
  return `${prefix}${msg}${detailStr}${hint}`;
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
 * @returns {Promise<{ valid: boolean, verifiedName?: string, displayPhoneNumber?: string, qualityRating?: string, error?: string, details?: any }>}
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
      console.error('[WhatsApp Cloud API] Verification failed:', data);
      return {
        valid: false,
        error: formatMetaErrorMessage(data.error),
        details: data.error,
      };
    }

    return {
      valid: true,
      verifiedName: data.verified_name || 'Poomani Chekku Ennai',
      displayPhoneNumber: data.display_phone_number || '',
      qualityRating: data.quality_rating || 'GREEN',
      codeVerificationStatus: data.code_verification_status || 'VERIFIED',
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
 * Send a test text ping to verify the WhatsApp Business API account is authorized to send messages
 */
export async function sendWhatsAppTestPing({ to, token, phoneNumberId }) {
  const cleanRecipient = sanitizeWhatsAppPhone(to);
  if (!cleanRecipient) {
    return { success: false, error: 'Recipient phone number is required.' };
  }
  if (!token || !phoneNumberId) {
    return { success: false, error: 'Access token and Phone Number ID are required.' };
  }

  const metaUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'text',
    text: {
      body: '🔔 *POOMANI CHEKKU ENNAI — பூமணி செக்கு எண்ணெய்*\n\n✅ Your WhatsApp Business Cloud API is active, authorized, and verified successfully!\n\nCustomer photo bills will be delivered directly to this number.',
    },
  };

  try {
    console.log(`[WhatsApp Cloud API] Sending test verification ping to +${cleanRecipient}...`);
    const res = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[WhatsApp Cloud API] Test ping failed:', data);
      return {
        success: false,
        error: formatMetaErrorMessage(data.error),
        metaDetails: data.error,
      };
    }
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      recipient: cleanRecipient,
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error sending test ping: ${err.message}`,
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
      notConfigured: true,
      error: 'WhatsApp Business Cloud API credentials (Phone Number ID & Access Token) are not configured on this server. Please enter them in Admin Settings > Meta WhatsApp Business Settings.',
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

  console.log(`[WhatsApp Cloud API] Initiating bill dispatch for Order #${orderNumber} to store owner +${cleanRecipient}`);

  // 1. Resolve image buffer from filePath if provided
  let buffer = fileBuffer;
  if (!buffer && filePath && fs.existsSync(filePath)) {
    try {
      buffer = await fs.promises.readFile(filePath);
    } catch (readErr) {
      console.warn('[WhatsApp Cloud API] Could not read bill image file from disk:', readErr.message);
    }
  }

  let mediaId = null;
  let mediaUploadError = null;

  // 2. Upload binary bill image directly to Meta WhatsApp Media Endpoint
  if (buffer && Buffer.isBuffer(buffer)) {
    try {
      const mediaUploadUrl = `https://graph.facebook.com/v20.0/${config.rawPhoneNumberId}/media`;
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', 'image/png');
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('file', blob, fileName || `Poomani_Bill_${orderNumber || Date.now()}.png`);

      console.log(`[WhatsApp Cloud API] Uploading bill image binary (${buffer.length} bytes) to Meta Media endpoint: ${mediaUploadUrl}`);
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
        console.log(`[WhatsApp Cloud API] Bill photo uploaded successfully to Meta Media API, Media ID: ${mediaId}`);
      } else {
        mediaUploadError = mediaData.error || { message: `HTTP ${mediaRes.status} from Meta Media API` };
        console.error('[WhatsApp Cloud API] Meta Media upload error response:', JSON.stringify(mediaData, null, 2));
      }
    } catch (uploadErr) {
      mediaUploadError = { message: uploadErr.message };
      console.error('[WhatsApp Cloud API] Direct media upload exception:', uploadErr.message);
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
    console.log(`[WhatsApp Cloud API] Falling back to hosted public image link: ${imageUrl}`);
    imagePayload = {
      link: imageUrl,
      caption: caption || `POOMANI CHEKKU ENNAI — Order Bill ${orderNumber || ''}`,
    };
  } else {
    const errorMsg = formatMetaErrorMessage(mediaUploadError) || 'Direct upload to Meta Media API failed and no public HTTPS link is available.';
    console.error(`[WhatsApp Cloud API] Cannot dispatch image: ${errorMsg}`);
    return {
      success: false,
      apiSent: false,
      error: errorMsg,
      metaDetails: mediaUploadError,
      stage: 'media_upload',
      recipient: cleanRecipient,
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
    console.log(`[WhatsApp Cloud API] Dispatching image message to +${cleanRecipient}...`);
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
      console.error('[WhatsApp Cloud API] Meta message dispatch error response:', JSON.stringify(data, null, 2));
      const formattedError = formatMetaErrorMessage(data.error);
      return {
        success: false,
        apiSent: false,
        error: formattedError,
        metaDetails: data.error,
        stage: 'send_message',
        recipient: cleanRecipient,
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;
    console.log(`[WhatsApp Cloud API] Bill photo dispatched successfully to +${cleanRecipient} for Order #${orderNumber}! Meta Message ID: ${messageId}`);
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

