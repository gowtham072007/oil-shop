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
    data = { success: false, error: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Server error (${response.status})`;
    throw new Error(errorMsg);
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
  const res = await fetch(`${API_BASE}/api/products`, {
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
  const res = await fetch(`${API_BASE}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token, pin),
    },
    body: JSON.stringify(productData),
  });
  return await handleResponse(res);
}

/**
 * Update Product in central database (Admin)
 */
export async function updateProductApi(id, productData, token, pin) {
  const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token, pin),
    },
    body: JSON.stringify(productData),
  });
  return await handleResponse(res);
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

