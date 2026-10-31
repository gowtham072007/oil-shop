import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const jsonStorePath = path.join(dataDir, 'poomani_oils_store.json');

const hasPostgresConfig = Boolean(process.env.DATABASE_URL);
let pgPool = null;
let activeEngine = 'json'; // 'postgres' | 'json'

if (hasPostgresConfig) {
  try {
    const isLocalPg = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalPg ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
    activeEngine = 'postgres';
    console.log('[Database] Configured for PostgreSQL central database.');
  } catch (err) {
    console.error('[Database] Failed to initialize PostgreSQL pool, falling back to persistent JSON store:', err.message);
    activeEngine = 'json';
  }
} else {
  console.log(`[Database] No DATABASE_URL found. Using persistent central JSON file store at: ${jsonStorePath}`);
}

/**
 * In-memory / JSON file store helpers for persistent non-Postgres storage
 */
function readJsonStore() {
  try {
    if (fs.existsSync(jsonStorePath)) {
      const raw = fs.readFileSync(jsonStorePath, 'utf8');
      const data = JSON.parse(raw);
      return {
        products: Array.isArray(data.products) ? data.products : [],
        settings: typeof data.settings === 'object' && data.settings !== null ? data.settings : {},
        orders: Array.isArray(data.orders) ? data.orders : [],
      };
    }
  } catch (err) {
    console.warn('[Database] Could not read JSON store, initializing clean state:', err.message);
  }
  return { products: [], settings: {}, orders: [] };
}

function writeJsonStore(data) {
  try {
    const tempPath = `${jsonStorePath}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, serialized, 'utf8');
    try {
      fs.renameSync(tempPath, jsonStorePath);
    } catch (renameErr) {
      // On Windows, if renameSync fails due to file locks, directly overwrite
      fs.writeFileSync(jsonStorePath, serialized, 'utf8');
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
    return true;
  } catch (err) {
    console.error('[Database] Failed to write JSON store:', err);
    try {
      // Last-ditch direct write
      fs.writeFileSync(jsonStorePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (writeErr) {
      console.error('[Database] Critical error writing store directly:', writeErr);
      return false;
    }
  }
}

/**
 * Initialize database schema
 */
export async function initDb() {
  if (activeEngine === 'postgres' && pgPool) {
    const productsTableSql = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        regional_name VARCHAR(255),
        brand VARCHAR(120),
        oil_type VARCHAR(255),
        description TEXT,
        image TEXT NOT NULL,
        image_file_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const variantsTableSql = `
      CREATE TABLE IF NOT EXISTS product_variants (
        id VARCHAR(64) PRIMARY KEY,
        product_id VARCHAR(64) NOT NULL,
        size VARCHAR(100) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'Bottle',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `;

    const settingsTableSql = `
      CREATE TABLE IF NOT EXISTS shop_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

    const ordersTableSql = `
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(64) NOT NULL UNIQUE,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        items JSONB NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        discount NUMERIC(10, 2) DEFAULT 0,
        grand_total NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        bill_image_url TEXT,
        whatsapp_recipient VARCHAR(50),
        whatsapp_status VARCHAR(50) DEFAULT 'pending',
        whatsapp_message_id VARCHAR(120),
        whatsapp_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    let client = null;
    try {
      client = await pgPool.connect();
      await client.query('BEGIN');
      await client.query(productsTableSql);
      await client.query(variantsTableSql);
      await client.query(settingsTableSql);
      await client.query(ordersTableSql);
      await client.query('COMMIT');
      console.log('[Database] PostgreSQL schema verified successfully.');
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      }
      console.error('[Database] Warning: PostgreSQL initialization encountered an issue:', err.message);
      console.log('[Database] Activating persistent file-backed JSON store as reliable fallback.');
      activeEngine = 'json';
    } finally {
      if (client) client.release();
    }
  }

  // Ensure JSON store file exists with correct structure
  if (!fs.existsSync(jsonStorePath)) {
    writeJsonStore({ products: [], settings: {} });
  }

  // Seed default 8 products if they do not exist
  await seedDefaultProducts();

  // Permanently store and lock +91 6385755368 as the admin WhatsApp recipient
  await ensurePermanentAdminWhatsApp();
}

export const PERMANENT_ADMIN_WHATSAPP = '916385755368';
export const PERMANENT_ADMIN_WHATSAPP_DISPLAY = '+91 63857 55368';

/**
 * Ensure permanent admin WhatsApp recipient number is permanently stored in database
 */
export async function ensurePermanentAdminWhatsApp() {
  try {
    const current = await getShopSettings();
    if (current.whatsappNumber !== PERMANENT_ADMIN_WHATSAPP || current.phoneDisplay !== PERMANENT_ADMIN_WHATSAPP_DISPLAY) {
      await saveShopSettings({
        whatsappNumber: PERMANENT_ADMIN_WHATSAPP,
        phoneDisplay: PERMANENT_ADMIN_WHATSAPP_DISPLAY,
      });
      console.log(`[Database] Stored permanent Admin WhatsApp recipient number: ${PERMANENT_ADMIN_WHATSAPP_DISPLAY}`);
    }
  } catch (err) {
    console.warn('[Database] Could not verify permanent admin phone:', err.message);
  }
}

/**
 * Format database row into product object expected by React frontend
 */
function formatProduct(row, variants = []) {
  const sortedVariants = variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const minPrice = sortedVariants.length > 0
    ? Math.min(...sortedVariants.map((v) => Number(v.price) || 0))
    : (Number(row.price) || 0);
  const inStock = sortedVariants.length > 0
    ? sortedVariants.some((v) => Number(v.stock) > 0)
    : (row.inStock !== false);

  const fallbackCategory = row.id.includes('coconut')
    ? 'coconut'
    : row.id.includes('sesame')
    ? 'sesame'
    : row.id.includes('groundnut')
    ? 'groundnut'
    : 'all';

  return {
    id: row.id,
    name: row.name,
    category: row.category || fallbackCategory,
    regionalName: row.regional_name || row.regionalName || '',
    brand: row.brand || 'Poomani Chekku Ennai',
    oilType: row.oil_type || row.oilType || 'Wood-Pressed Cold Extracted',
    description: row.description || '',
    image: row.image,
    imageFileName: row.image_file_name || row.imageFileName || '',
    price: minPrice,
    inStock,
    variants: sortedVariants.map((v) => ({
      id: v.id,
      size: v.size,
      price: Number(v.price),
      stock: Number(v.stock),
      unit: v.unit || 'Bottle',
      sortOrder: v.sort_order ?? v.sortOrder ?? 0,
    })),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all products with their variants
 */
export async function getAllProducts() {
  let pgProducts = null;
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const productsRes = await pgPool.query('SELECT * FROM products ORDER BY created_at DESC');
      const rows = productsRes.rows;
      if (rows.length > 0) {
        const variantsRes = await pgPool.query(
          'SELECT * FROM product_variants ORDER BY sort_order ASC, price ASC'
        );
        const variantsByProductId = {};
        for (const v of variantsRes.rows) {
          if (!variantsByProductId[v.product_id]) {
            variantsByProductId[v.product_id] = [];
          }
          variantsByProductId[v.product_id].push(v);
        }
        pgProducts = rows.map((p) => formatProduct(p, variantsByProductId[p.id] || []));
      }
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch failed, reading from persistent store:', err.message);
    }
  }

  if (Array.isArray(pgProducts) && pgProducts.length > 0) {
    return pgProducts;
  }

  // Persistent JSON store fallback
  const store = readJsonStore();
  if (Array.isArray(store.products) && store.products.length > 0) {
    return store.products.map((p) => formatProduct(p, p.variants || []));
  }

  // Default 8 canonical products fallback
  return DEFAULT_8_PRODUCTS.map((p) => formatProduct(p, p.variants || []));
}

/**
 * Fetch a single product by ID with variants
 */
export async function getProductById(id) {
  if (!id) return null;

  if (activeEngine === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        const variantsRes = await pgPool.query(
          'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC',
          [id]
        );
        return formatProduct(res.rows[0], variantsRes.rows);
      }
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch by id failed:', err.message);
    }
  }

  // Check persistent JSON store
  const store = readJsonStore();
  const found = store.products.find((p) => p.id === id);
  if (found) {
    return formatProduct(found, found.variants || []);
  }

  // Check canonical DEFAULT_8_PRODUCTS
  const defaultProd = DEFAULT_8_PRODUCTS.find((p) => p.id === id);
  if (defaultProd) {
    return formatProduct(defaultProd, defaultProd.variants || []);
  }

  return null;
}

/**
 * Create a new product with variants
 */
export async function createProduct(productData) {
  const id = productData.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedVariants = (productData.variants || []).map((v, i) => ({
    id: v.id || `var-${Date.now()}-${i}`,
    size: String(v.size || '').trim(),
    price: Number(v.price) || 0,
    stock: Number(v.stock) || 0,
    unit: v.unit || 'Bottle',
    sort_order: i,
    sortOrder: i,
  }));

  const minPrice = formattedVariants.length > 0
    ? Math.min(...formattedVariants.map((v) => Number(v.price) || 0))
    : (Number(productData.price) || 0);

  const productRecord = {
    id,
    price: minPrice,
    name: productData.name.trim(),
    regional_name: productData.regionalName?.trim() || '',
    regionalName: productData.regionalName?.trim() || '',
    brand: productData.brand?.trim() || 'Poomani Oils',
    oil_type: productData.oilType?.trim() || 'Wood-Pressed Cold Extracted',
    oilType: productData.oilType?.trim() || 'Wood-Pressed Cold Extracted',
    description: productData.description?.trim() || '',
    image: productData.image.trim(),
    image_file_name: productData.imageFileName?.trim() || '',
    imageFileName: productData.imageFileName?.trim() || '',
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
    variants: formattedVariants,
  };

  if (activeEngine === 'postgres' && pgPool) {
    let client = null;
    try {
      client = await pgPool.connect();
      await client.query('BEGIN');
      const insertProductSql = `
        INSERT INTO products (id, name, regional_name, brand, oil_type, description, image, image_file_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await client.query(insertProductSql, [
        id,
        productRecord.name,
        productRecord.regional_name,
        productRecord.brand,
        productRecord.oil_type,
        productRecord.description,
        productRecord.image,
        productRecord.image_file_name,
        now,
        now,
      ]);

      for (let i = 0; i < formattedVariants.length; i++) {
        const v = formattedVariants[i];
        await client.query(
          `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [v.id, id, v.size, v.price, v.stock, v.unit, i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      }
      console.warn(`[Database] PostgreSQL create for '${id}' had an issue, persisting to file store:`, err.message);
    } finally {
      if (client) client.release();
    }
  }

  // Always update persistent JSON store as backup / primary
  const store = readJsonStore();
  const updatedProducts = [productRecord, ...store.products.filter((p) => p.id !== id)];
  writeJsonStore({ ...store, products: updatedProducts });

  return formatProduct(productRecord, formattedVariants);
}

/**
 * Update an existing product and its pack-size variants
 */
export async function updateProduct(id, productData) {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID '${id}' not found in database.`);
  }

  const now = new Date().toISOString();

  const formattedVariants = (productData.variants || existing.variants || []).map((v, i) => {
    const existingVar = (existing.variants || [])[i];
    return {
      id: v.id && !v.id.startsWith('v-def') ? v.id : (existingVar?.id || `var-${id}-${i}`),
      size: String(v.size || existingVar?.size || '').trim(),
      price: Math.max(1, Number(v.price) || Number(existingVar?.price) || 0),
      stock: Math.max(0, Number(v.stock !== undefined ? v.stock : existingVar?.stock) || 0),
      unit: v.unit || existingVar?.unit || 'Bottle',
      sort_order: i,
      sortOrder: i,
    };
  });

  const minPrice = formattedVariants.length > 0
    ? Math.min(...formattedVariants.map((v) => Number(v.price) || 0))
    : (Number(productData.price) || Number(existing.price) || 0);

  const fallbackCategory = id.includes('coconut')
    ? 'coconut'
    : id.includes('sesame')
    ? 'sesame'
    : id.includes('groundnut')
    ? 'groundnut'
    : 'all';

  const updatedRecord = {
    ...existing,
    id,
    price: minPrice,
    category: productData.category || existing.category || fallbackCategory,
    name: productData.name !== undefined ? productData.name.trim() : existing.name,
    regional_name: productData.regionalName !== undefined ? productData.regionalName.trim() : (existing.regionalName || ''),
    regionalName: productData.regionalName !== undefined ? productData.regionalName.trim() : (existing.regionalName || ''),
    brand: productData.brand !== undefined ? productData.brand.trim() : (existing.brand || 'Poomani Chekku Ennai'),
    oil_type: productData.oilType !== undefined ? productData.oilType.trim() : (existing.oilType || '100% Pure Edible Oil'),
    oilType: productData.oilType !== undefined ? productData.oilType.trim() : (existing.oilType || '100% Pure Edible Oil'),
    description: productData.description !== undefined ? productData.description.trim() : existing.description,
    image: productData.image ? productData.image.trim() : existing.image,
    image_file_name: productData.imageFileName ? productData.imageFileName.trim() : (existing.imageFileName || ''),
    imageFileName: productData.imageFileName ? productData.imageFileName.trim() : (existing.imageFileName || ''),
    inStock: productData.inStock !== undefined ? Boolean(productData.inStock) : (formattedVariants.some((v) => Number(v.stock) > 0)),
    updated_at: now,
    updatedAt: now,
    variants: formattedVariants,
  };

  if (activeEngine === 'postgres' && pgPool) {
    let client = null;
    try {
      client = await pgPool.connect();
      await client.query('BEGIN');

      const checkRes = await client.query('SELECT id FROM products WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        // Product does not exist in PostgreSQL yet; insert it
        const insertProductSql = `
          INSERT INTO products (id, name, regional_name, brand, oil_type, description, image, image_file_name, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        await client.query(insertProductSql, [
          id,
          updatedRecord.name,
          updatedRecord.regional_name,
          updatedRecord.brand,
          updatedRecord.oil_type,
          updatedRecord.description,
          updatedRecord.image,
          updatedRecord.image_file_name,
          now,
          now,
        ]);
      } else {
        const updateProductSql = `
          UPDATE products
          SET name = $1, regional_name = $2, brand = $3, oil_type = $4, description = $5,
              image = $6, image_file_name = $7, updated_at = $8
          WHERE id = $9
        `;
        await client.query(updateProductSql, [
          updatedRecord.name,
          updatedRecord.regional_name,
          updatedRecord.brand,
          updatedRecord.oil_type,
          updatedRecord.description,
          updatedRecord.image,
          updatedRecord.image_file_name,
          now,
          id,
        ]);
      }

      await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      for (let i = 0; i < formattedVariants.length; i++) {
        const v = formattedVariants[i];
        await client.query(
          `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [v.id, id, v.size, v.price, v.stock, v.unit, i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      if (client) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      }
      console.warn(`[Database] PostgreSQL update for '${id}' had an issue, persisting to central file store:`, err.message);
    } finally {
      if (client) client.release();
    }
  }

  // Update persistent JSON store (always authoritative & permanent on disk)
  const store = readJsonStore();
  const existsInStore = store.products.some((p) => p.id === id);
  const updatedProducts = existsInStore
    ? store.products.map((p) => (p.id === id ? updatedRecord : p))
    : [...store.products, updatedRecord];

  const writeSuccess = writeJsonStore({ ...store, products: updatedProducts });
  if (!writeSuccess) {
    throw new Error(`Failed to save updated price for product '${id}' to persistent database store.`);
  }

  return formatProduct(updatedRecord, formattedVariants);
}

/**
 * Delete a product by ID
 */
export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) return null;

  if (activeEngine === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      await client.query('DELETE FROM products WHERE id = $1', [id]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Database] PostgreSQL delete failed:', err);
    } finally {
      client.release();
    }
  }

  // Update persistent JSON store
  const store = readJsonStore();
  const updatedProducts = store.products.filter((p) => p.id !== id);
  writeJsonStore({ ...store, products: updatedProducts });

  return existing;
}

/**
 * Get all shop settings as a single key-value object
 */
export async function getShopSettings() {
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT key, value FROM shop_settings');
      const settings = {};
      for (const r of res.rows) {
        try {
          settings[r.key] = JSON.parse(r.value);
        } catch {
          settings[r.key] = r.value;
        }
      }
      return settings;
    } catch (err) {
      console.warn('[Database] PostgreSQL get settings failed:', err.message);
    }
  }

  const store = readJsonStore();
  return store.settings || {};
}

/**
 * Upsert shop settings
 */
export async function saveShopSettings(settingsObject) {
  if (activeEngine === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, val] of Object.entries(settingsObject)) {
        const valString = typeof val === 'string' ? val : JSON.stringify(val);
        await client.query(
          `INSERT INTO shop_settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, valString]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Database] PostgreSQL save settings failed:', err);
    } finally {
      client.release();
    }
  }

  const store = readJsonStore();
  const updatedSettings = { ...store.settings, ...settingsObject };
  writeJsonStore({ ...store, settings: updatedSettings });
  return updatedSettings;
}

/**
 * Save an order in persistent storage (Postgres or JSON file store)
 */
export async function saveOrder(orderData) {
  const id = orderData.id || `ord-${Date.now()}`;
  const orderNumber = orderData.orderNumber || `OS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const formattedOrder = {
    id,
    orderNumber,
    customerName: String(orderData.customerName || 'Customer').trim(),
    customerPhone: String(orderData.customerPhone || '').trim(),
    customerAddress: String(orderData.customerAddress || orderData.address || '').trim(),
    items: Array.isArray(orderData.items) ? orderData.items : [],
    subtotal: Number(orderData.subtotal) || 0,
    discount: Number(orderData.discount) || 0,
    grandTotal: Number(orderData.grandTotal) || 0,
    paymentMethod: orderData.paymentMethod || 'Cash',
    billImageUrl: orderData.billImageUrl || orderData.publicUrl || '',
    whatsappRecipient: String(orderData.whatsappRecipient || '').trim(),
    whatsappStatus: orderData.whatsappStatus || 'pending',
    whatsappMessageId: orderData.whatsappMessageId || '',
    whatsappError: orderData.whatsappError || '',
    createdAt: orderData.createdAt || orderData.date || now,
    updatedAt: now,
  };

  if (activeEngine === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    try {
      const sql = `
        INSERT INTO orders (
          id, order_number, customer_name, customer_phone, customer_address,
          items, subtotal, discount, grand_total, payment_method,
          bill_image_url, whatsapp_recipient, whatsapp_status, whatsapp_message_id, whatsapp_error,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (order_number) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          customer_address = EXCLUDED.customer_address,
          items = EXCLUDED.items,
          subtotal = EXCLUDED.subtotal,
          discount = EXCLUDED.discount,
          grand_total = EXCLUDED.grand_total,
          bill_image_url = EXCLUDED.bill_image_url,
          whatsapp_recipient = EXCLUDED.whatsapp_recipient,
          whatsapp_status = EXCLUDED.whatsapp_status,
          whatsapp_message_id = EXCLUDED.whatsapp_message_id,
          whatsapp_error = EXCLUDED.whatsapp_error,
          updated_at = EXCLUDED.updated_at
      `;
      await client.query(sql, [
        formattedOrder.id,
        formattedOrder.orderNumber,
        formattedOrder.customerName,
        formattedOrder.customerPhone,
        formattedOrder.customerAddress,
        JSON.stringify(formattedOrder.items),
        formattedOrder.subtotal,
        formattedOrder.discount,
        formattedOrder.grandTotal,
        formattedOrder.paymentMethod,
        formattedOrder.billImageUrl,
        formattedOrder.whatsappRecipient,
        formattedOrder.whatsappStatus,
        formattedOrder.whatsappMessageId,
        formattedOrder.whatsappError,
        formattedOrder.createdAt,
        now,
      ]);
    } catch (err) {
      console.warn('[Database] PostgreSQL save order failed:', err.message);
    } finally {
      client.release();
    }
  }

  // Update persistent JSON store
  const store = readJsonStore();
  const existingIdx = (store.orders || []).findIndex((o) => o.orderNumber === orderNumber);
  let updatedOrders;
  if (existingIdx >= 0) {
    updatedOrders = [...store.orders];
    updatedOrders[existingIdx] = { ...updatedOrders[existingIdx], ...formattedOrder };
  } else {
    updatedOrders = [formattedOrder, ...(store.orders || [])];
  }
  writeJsonStore({ ...store, orders: updatedOrders });
  return formattedOrder;
}

/**
 * Fetch all orders from database
 */
export async function getAllOrders() {
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM orders ORDER BY created_at DESC');
      return res.rows.map((r) => ({
        id: r.id,
        orderNumber: r.order_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerAddress: r.customer_address,
        items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        grandTotal: Number(r.grand_total),
        paymentMethod: r.payment_method,
        billImageUrl: r.bill_image_url,
        whatsappRecipient: r.whatsapp_recipient,
        whatsappStatus: r.whatsapp_status,
        whatsappMessageId: r.whatsapp_message_id,
        whatsappError: r.whatsapp_error,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch orders failed:', err.message);
    }
  }

  const store = readJsonStore();
  return store.orders || [];
}

/**
 * Fetch a single order by orderNumber
 */
export async function getOrderById(orderNumber) {
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM orders WHERE order_number = $1', [orderNumber]);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          orderNumber: r.order_number,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          customerAddress: r.customer_address,
          items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []),
          subtotal: Number(r.subtotal),
          discount: Number(r.discount),
          grandTotal: Number(r.grand_total),
          paymentMethod: r.payment_method,
          billImageUrl: r.bill_image_url,
          whatsappRecipient: r.whatsapp_recipient,
          whatsappStatus: r.whatsapp_status,
          whatsappMessageId: r.whatsapp_message_id,
          whatsappError: r.whatsapp_error,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
      }
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch order by ID failed:', err.message);
    }
  }

  const store = readJsonStore();
  return (store.orders || []).find((o) => o.orderNumber === orderNumber) || null;
}

/**
 * Update WhatsApp dispatch status of an order
 */
export async function updateOrderWhatsAppStatus(orderNumber, { status, messageId, error, recipient, billImageUrl }) {
  const existing = await getOrderById(orderNumber);
  const now = new Date().toISOString();

  const updateFields = {
    whatsappStatus: status,
    updatedAt: now,
  };
  if (messageId !== undefined) updateFields.whatsappMessageId = messageId;
  if (error !== undefined) updateFields.whatsappError = error;
  if (recipient !== undefined) updateFields.whatsappRecipient = recipient;
  if (billImageUrl !== undefined) updateFields.billImageUrl = billImageUrl;

  if (activeEngine === 'postgres' && pgPool) {
    try {
      await pgPool.query(
        `UPDATE orders
         SET whatsapp_status = $1,
             whatsapp_message_id = COALESCE($2, whatsapp_message_id),
             whatsapp_error = $3,
             whatsapp_recipient = COALESCE($4, whatsapp_recipient),
             bill_image_url = COALESCE($5, bill_image_url),
             updated_at = $6
         WHERE order_number = $7`,
        [status, messageId || null, error || null, recipient || null, billImageUrl || null, now, orderNumber]
      );
    } catch (err) {
      console.warn('[Database] PostgreSQL update order WhatsApp status failed:', err.message);
    }
  }

  const store = readJsonStore();
  const updatedOrders = (store.orders || []).map((o) =>
    o.orderNumber === orderNumber ? { ...o, ...updateFields } : o
  );
  writeJsonStore({ ...store, orders: updatedOrders });
  return existing ? { ...existing, ...updateFields } : updateFields;
}

export function isUsingPostgres() {
  return activeEngine === 'postgres';
}

export function getDatabaseDiagnostics() {
  const store = readJsonStore();
  return {
    engine: activeEngine,
    postgresConfigured: hasPostgresConfig,
    productsCount: store.products.length,
    storageFile: jsonStorePath,
  };
}

export const DEFAULT_8_PRODUCTS = [
  // Coconut Oil — தேங்காய் எண்ணெய்
  {
    id: 'prod-coconut-200ml',
    name: 'Coconut Oil – 200 ml',
    regional_name: 'தேங்காய் எண்ணெய் – 200 மி.லி',
    regionalName: 'தேங்காய் எண்ணெய் – 200 மி.லி',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'coconut',
    description: '100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.',
    image: '/images/coconut_oil.jpg',
    image_file_name: 'coconut_oil.jpg',
    imageFileName: 'coconut_oil.jpg',
    price: 90,
    inStock: true,
    variants: [
      { id: 'v-coconut-200ml', size: '200 ml', price: 90, stock: 50, unit: 'Bottle', sort_order: 1, sortOrder: 1 },
    ],
  },
  {
    id: 'prod-coconut-500ml',
    name: 'Coconut Oil – 500 ml',
    regional_name: 'தேங்காய் எண்ணெய் – 500 மி.லி',
    regionalName: 'தேங்காய் எண்ணெய் – 500 மி.லி',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'coconut',
    description: '100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.',
    image: '/images/coconut_oil.jpg',
    image_file_name: 'coconut_oil.jpg',
    imageFileName: 'coconut_oil.jpg',
    price: 190,
    inStock: true,
    variants: [
      { id: 'v-coconut-500ml', size: '500 ml', price: 190, stock: 50, unit: 'Bottle', sort_order: 2, sortOrder: 2 },
    ],
  },
  {
    id: 'prod-coconut-1l',
    name: 'Coconut Oil – 1 Litre',
    regional_name: 'தேங்காய் எண்ணெய் – 1 லிட்டர்',
    regionalName: 'தேங்காய் எண்ணெய் – 1 லிட்டர்',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'coconut',
    description: '100% pure edible coconut oil with authentic natural aroma, perfect for daily cooking, traditional recipes, and dietary wellness.',
    image: '/images/coconut_oil.jpg',
    image_file_name: 'coconut_oil.jpg',
    imageFileName: 'coconut_oil.jpg',
    price: 360,
    inStock: true,
    variants: [
      { id: 'v-coconut-1l', size: '1 Litre', price: 360, stock: 50, unit: 'Bottle', sort_order: 3, sortOrder: 3 },
    ],
  },

  // Sesame Oil — நல்லெண்ணெய்
  {
    id: 'prod-sesame-200ml',
    name: 'Sesame Oil – 200 ml',
    regional_name: 'நல்லெண்ணெய் – 200 மி.லி',
    regionalName: 'நல்லெண்ணெய் – 200 மி.லி',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'sesame',
    description: 'Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.',
    image: '/images/sesame_oil.jpg',
    image_file_name: 'sesame_oil.jpg',
    imageFileName: 'sesame_oil.jpg',
    price: 110,
    inStock: true,
    variants: [
      { id: 'v-sesame-200ml', size: '200 ml', price: 110, stock: 40, unit: 'Bottle', sort_order: 1, sortOrder: 1 },
    ],
  },
  {
    id: 'prod-sesame-500ml',
    name: 'Sesame Oil – 500 ml',
    regional_name: 'நல்லெண்ணெய் – 500 மி.லி',
    regionalName: 'நல்லெண்ணெய் – 500 மி.லி',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'sesame',
    description: 'Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.',
    image: '/images/sesame_oil.jpg',
    image_file_name: 'sesame_oil.jpg',
    imageFileName: 'sesame_oil.jpg',
    price: 230,
    inStock: true,
    variants: [
      { id: 'v-sesame-500ml', size: '500 ml', price: 230, stock: 40, unit: 'Bottle', sort_order: 2, sortOrder: 2 },
    ],
  },
  {
    id: 'prod-sesame-1l',
    name: 'Sesame Oil – 1 Litre',
    regional_name: 'நல்லெண்ணெய் – 1 லிட்டர்',
    regionalName: 'நல்லெண்ணெய் – 1 லிட்டர்',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'sesame',
    description: 'Premium pure edible sesame oil offering authentic rich taste and golden aroma for traditional cooking and seasoning.',
    image: '/images/sesame_oil.jpg',
    image_file_name: 'sesame_oil.jpg',
    imageFileName: 'sesame_oil.jpg',
    price: 440,
    inStock: true,
    variants: [
      { id: 'v-sesame-1l', size: '1 Litre', price: 440, stock: 40, unit: 'Bottle', sort_order: 3, sortOrder: 3 },
    ],
  },

  // Groundnut Oil — கடலை எண்ணெய்
  {
    id: 'prod-groundnut-500ml',
    name: 'Groundnut Oil – 500 ml',
    regional_name: 'கடலை எண்ணெய் – 500 மி.லி',
    regionalName: 'கடலை எண்ணெய் – 500 மி.லி',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'groundnut',
    description: 'Pure edible groundnut oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.',
    image: '/images/groundnut_oil.jpg',
    image_file_name: 'groundnut_oil.jpg',
    imageFileName: 'groundnut_oil.jpg',
    price: 170,
    inStock: true,
    variants: [
      { id: 'v-groundnut-500ml', size: '500 ml', price: 170, stock: 45, unit: 'Bottle', sort_order: 1, sortOrder: 1 },
    ],
  },
  {
    id: 'prod-groundnut-1l',
    name: 'Groundnut Oil – 1 Litre',
    regional_name: 'கடலை எண்ணெய் – 1 லிட்டர்',
    regionalName: 'கடலை எண்ணெய் – 1 லிட்டர்',
    brand: 'Poomani Chekku Ennai',
    oil_type: '100% Pure Edible Oil',
    oilType: '100% Pure Edible Oil',
    category: 'groundnut',
    description: 'Pure edible groundnut oil with a high smoke point, ideal for everyday deep frying, sauteing, and flavorful family meals.',
    image: '/images/groundnut_oil.jpg',
    image_file_name: 'groundnut_oil.jpg',
    imageFileName: 'groundnut_oil.jpg',
    price: 320,
    inStock: true,
    variants: [
      { id: 'v-groundnut-1l', size: '1 Litre', price: 320, stock: 60, unit: 'Bottle', sort_order: 2, sortOrder: 2 },
    ],
  },
];

export async function seedDefaultProducts() {
  for (const defProd of DEFAULT_8_PRODUCTS) {
    try {
      const existing = await getProductById(defProd.id);
      if (!existing) {
        await createProduct(defProd);
        console.log(`[Database] Seeded default product: ${defProd.name}`);
      }
    } catch (err) {
      console.warn(`[Database] Could not seed product ${defProd.id}:`, err.message);
    }
  }
}
