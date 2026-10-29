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
      };
    }
  } catch (err) {
    console.warn('[Database] Could not read JSON store, initializing clean state:', err.message);
  }
  return { products: [], settings: {} };
}

function writeJsonStore(data) {
  try {
    const tempPath = `${jsonStorePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, jsonStorePath);
    return true;
  } catch (err) {
    console.error('[Database] Failed to write JSON store:', err);
    return false;
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

    let client = null;
    try {
      client = await pgPool.connect();
      await client.query('BEGIN');
      await client.query(productsTableSql);
      await client.query(variantsTableSql);
      await client.query(settingsTableSql);
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
}

/**
 * Format database row into product object expected by React frontend
 */
function formatProduct(row, variants = []) {
  const sortedVariants = variants.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const minPrice = sortedVariants.length > 0
    ? Math.min(...sortedVariants.map((v) => Number(v.price) || 0))
    : 0;
  const inStock = sortedVariants.some((v) => Number(v.stock) > 0);

  return {
    id: row.id,
    name: row.name,
    regionalName: row.regional_name || row.regionalName || '',
    brand: row.brand || 'Poomani Oils',
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
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const productsRes = await pgPool.query('SELECT * FROM products ORDER BY created_at DESC');
      const rows = productsRes.rows;
      if (rows.length === 0) return [];

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

      return rows.map((p) => formatProduct(p, variantsByProductId[p.id] || []));
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch failed, reading from persistent store:', err.message);
    }
  }

  // Persistent JSON store fallback
  const store = readJsonStore();
  return store.products.map((p) => formatProduct(p, p.variants || []));
}

/**
 * Fetch a single product by ID with variants
 */
export async function getProductById(id) {
  if (activeEngine === 'postgres' && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM products WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;

      const variantsRes = await pgPool.query(
        'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC',
        [id]
      );
      return formatProduct(res.rows[0], variantsRes.rows);
    } catch (err) {
      console.warn('[Database] PostgreSQL fetch by id failed:', err.message);
    }
  }

  const store = readJsonStore();
  const found = store.products.find((p) => p.id === id);
  return found ? formatProduct(found, found.variants || []) : null;
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

  const productRecord = {
    id,
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
    const client = await pgPool.connect();
    try {
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
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
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

  const formattedVariants = (productData.variants || existing.variants || []).map((v, i) => ({
    id: v.id && !v.id.startsWith('v-def') ? v.id : `var-${Date.now()}-${i}`,
    size: String(v.size || '').trim(),
    price: Number(v.price) || 0,
    stock: Number(v.stock) || 0,
    unit: v.unit || 'Bottle',
    sort_order: i,
    sortOrder: i,
  }));

  const updatedRecord = {
    ...existing,
    id,
    name: productData.name !== undefined ? productData.name.trim() : existing.name,
    regional_name: productData.regionalName !== undefined ? productData.regionalName.trim() : (existing.regionalName || ''),
    regionalName: productData.regionalName !== undefined ? productData.regionalName.trim() : (existing.regionalName || ''),
    brand: productData.brand !== undefined ? productData.brand.trim() : existing.brand,
    oil_type: productData.oilType !== undefined ? productData.oilType.trim() : existing.oilType,
    oilType: productData.oilType !== undefined ? productData.oilType.trim() : existing.oilType,
    description: productData.description !== undefined ? productData.description.trim() : existing.description,
    image: productData.image ? productData.image.trim() : existing.image,
    image_file_name: productData.imageFileName ? productData.imageFileName.trim() : (existing.imageFileName || ''),
    imageFileName: productData.imageFileName ? productData.imageFileName.trim() : (existing.imageFileName || ''),
    updated_at: now,
    updatedAt: now,
    variants: formattedVariants,
  };

  if (activeEngine === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
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
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Update persistent JSON store
  const store = readJsonStore();
  const updatedProducts = store.products.map((p) => (p.id === id ? updatedRecord : p));
  writeJsonStore({ ...store, products: updatedProducts });

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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
    brand: 'Poomani Oils',
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
