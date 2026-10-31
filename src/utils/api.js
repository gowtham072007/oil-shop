/**
 * Poomani Oils Backend API Client
 * Centralized communication with shared PostgreSQL / SQLite backend.
 */

const API_BASE = ''; // Relative path, works locally and on Render production

/**
 * Helper to handle fetch responses and errors
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: text };
    }
  }

  if (!response.ok) {
    let errorMsg = data?.error;
    // Translate HTML error pages from Render/proxies into clean human messages
    if (!errorMsg || typeof errorMsg !== 'string' || errorMsg.includes('<!DOCTYPE') || errorMsg.includes('<html')) {
      if (response.status === 503) {
        errorMsg = 'Central database server is suspended on Render (HTTP 503). To update prices permanently, open dashboard.render.com and click Resume on "mani-oils".';
      } else if (response.status === 502 || response.status === 504) {
        errorMsg = `Central server is currently waking up (HTTP ${response.status}). Please wait 15 seconds and try again.`;
      } else if (response.status === 401) {
        errorMsg = 'Admin authentication required or session expired. Please log in with your Admin PIN.';
      } else if (response.status === 404) {
        errorMsg = 'Product not found in central database.';
      } else {
        errorMsg = `Server error (${response.status}): Could not complete database update.`;
      }
    }
    throw new Error(errorMsg);
  }

  if (data && typeof data === 'object' && data.success === false) {
    throw new Error(data.error || 'Database operation was not successful.');
  }

  return data;
}

/**
 * Check backend health & database type
 */
export async function getBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return await handleResponse(res);
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

/**
 * Fetch all products from central database
 */
export async function fetchAllProducts() {
  const res = await fetch(`${API_BASE}/api/products?_t=${Date.now()}`, {
    cache: 'no-store',
  });
  const data = await handleResponse(res);
  return data.products || [];
}

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(id) {
  const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`);
  const data = await handleResponse(res);
  return data.product;
}

/**
 * Admin Login
 */
export async function adminLogin(pin) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  return await handleResponse(res);
}

/**
 * Verify Admin Token
 */
export async function verifyAdminToken(token) {
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(res);
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

function buildAuthHeaders(token, pin) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (pin) headers['x-admin-pin'] = String(pin).trim();
  return headers;
}

/**
 * Upload Product Photo to persistent server storage
 */
export async function uploadProductPhoto(file, token, pin) {
  if (!file) throw new Error('No photo file provided.');

  const formData = new FormData();
  formData.append('photo', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: buildAuthHeaders(token, pin),
    body: formData,
  });

  return await handleResponse(res);
}

/**
 * Create Product in central database (Admin)
 */
export async function createProductApi(productData, token, pin) {
  try {
    const res = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token, pin),
      },
      body: JSON.stringify(productData),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error("Cannot connect to database server. If testing locally, ensure backend is running with 'npm run dev'. If on Render, verify 'mani-oils' is resumed.");
    }
    throw err;
  }
}

/**
 * Update Product in central database (Admin)
 */
export async function updateProductApi(id, productData, token, pin) {
  try {
    const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token, pin),
      },
      body: JSON.stringify(productData),
    });
    return await handleResponse(res);
  } catch (err) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error("Cannot connect to database server. If testing locally, ensure backend is running with 'npm run dev'. If on Render, verify 'mani-oils' is resumed.");
    }
    throw err;
  }
}

/**
 * Delete Product in central database (Admin)
 */
export async function deleteProductApi(id, token, pin) {
  const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(token, pin),
  });
  return await handleResponse(res);
}

/**
 * Fetch Shop Settings from central database
 */
export async function fetchShopSettings() {
  const res = await fetch(`${API_BASE}/api/settings`, {
    cache: 'no-store',
  });
  const data = await handleResponse(res);
  return data.settings || {};
}

/**
 * Save Shop Settings to central database (Admin)
 */
export async function saveShopSettingsApi(settingsData, token) {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settingsData),
  });
  return await handleResponse(res);
}

/**
 * Safe Migration: sync any genuine local products if database is empty
 */
export async function syncMigrationApi(localProducts, token) {
  const res = await fetch(`${API_BASE}/api/sync-migration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ localProducts }),
  });
  return await handleResponse(res);
}

/**
 * Upload dynamically generated bill image to server persistent storage
 */
export async function uploadBillImageApi(orderNumber, dataUrl) {
  const res = await fetch(`${API_BASE}/api/orders/upload-bill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, dataUrl }),
  });
  return await handleResponse(res);
}

/**
 * Dispatches bill via Meta WhatsApp Cloud API directly to store owner's entered number
 */
export async function sendWhatsAppBillApi(params) {
  try {
    const res = await fetch(`${API_BASE}/api/orders/send-whatsapp-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        apiSent: false,
        error: data?.error || `Server error (${res.status})`,
        metaDetails: data?.metaDetails,
        stage: data?.stage,
        notConfigured: Boolean(data?.notConfigured),
        recipient: data?.recipient,
        publicUrl: data?.publicUrl,
        relativeUrl: data?.relativeUrl,
      };
    }
    return data || { success: false, apiSent: false, error: 'Empty server response' };
  } catch (err) {
    return {
      success: false,
      apiSent: false,
      error: `Network error connecting to backend: ${err.message}`,
    };
  }
}

/**
 * Check if Meta WhatsApp Cloud API is configured on server
 */
export async function fetchWhatsAppStatusApi() {
  try {
    const res = await fetch(`${API_BASE}/api/whatsapp/status`);
    return await handleResponse(res);
  } catch {
    return { success: false, isConfigured: false, isEnabled: false };
  }
}

/**
 * Fetch full admin WhatsApp configuration including masked token (Admin)
 */
export async function fetchAdminWhatsAppConfig(adminToken) {
  const res = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  return await handleResponse(res);
}

/**
 * Test Meta WhatsApp Business Cloud API Connection (Admin)
 */
export async function testWhatsAppCloudApi({ token, phoneNumberId }, adminToken) {
  const res = await fetch(`${API_BASE}/api/whatsapp/test-connection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ token, phoneNumberId }),
  });
  return await handleResponse(res);
}

/**
 * Send test verification ping message to admin's WhatsApp number (Admin)
 */
export async function sendWhatsAppTestPingApi({ token, phoneNumberId, to }, adminToken) {
  const res = await fetch(`${API_BASE}/api/whatsapp/send-test-ping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ token, phoneNumberId, to }),
  });
  return await handleResponse(res);
}

/**
 * Record customer order in central server database
 */
export async function createOrderApi(orderData) {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    return await handleResponse(res);
  } catch (err) {
    console.warn('[API] Could not record order on server:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all orders from central database (Admin)
 */
export async function fetchOrdersApi(adminToken) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const data = await handleResponse(res);
  return data.orders || [];
}

