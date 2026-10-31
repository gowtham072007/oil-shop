import crypto from 'node:crypto';
import { getShopSettings } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'poomani-oils-secure-admin-key-2026';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

/**
 * Validate admin PIN against process.env.ADMIN_PIN or shop_settings in database
 */
export async function verifyAdminPin(pin) {
  if (!pin) return false;
  const pinStr = String(pin).trim();
  if (pinStr === String(ADMIN_PIN).trim()) {
    return true;
  }
  try {
    const settings = await getShopSettings();
    if (settings && settings.adminPin && String(settings.adminPin).trim() === pinStr) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Synchronous check for fallback
 */
export function verifyAdminPinSync(pin) {
  if (!pin) return false;
  return String(pin).trim() === String(ADMIN_PIN).trim();
}

/**
 * Generate a signed auth token (expires in 48 hours)
 */
export function createAdminToken() {
  const payload = {
    role: 'admin',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadBase64)
    .digest('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * Verify signed auth token
 */
export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadBase64, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return false;
    }
    return payload;
  } catch {
    return false;
  }
}

/**
 * Express middleware to ensure only authenticated admins can mutate products
 */
export async function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];
  const pinHeader = req.headers['x-admin-pin'];
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  const validPayload = verifyAdminToken(token);
  if (validPayload) {
    req.admin = validPayload;
    return next();
  }

  if (pinHeader) {
    const isPinValid = await verifyAdminPin(pinHeader);
    if (isPinValid) {
      req.admin = { role: 'admin' };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Admin authentication required to perform this action.',
  });
}
