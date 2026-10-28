import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isPostgres = Boolean(process.env.DATABASE_URL);
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  const isLocalPg = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalPg ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  console.log('[Database] Connecting to central PostgreSQL database...');
} else {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'poomani_oils.db');
  sqliteDb = new DatabaseSync(dbPath);
  console.log(`[Database] Using persistent SQLite database at: ${dbPath}`);
}

/**
 * Execute raw SQL query across PostgreSQL or SQLite
 */
export async function query(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  } else {
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    const isSelect = /^\s*SELECT/i.test(sqliteSql);
    const stmt = sqliteDb.prepare(sqliteSql);
    if (isSelect) {
      return stmt.all(...params);
    } else {
      stmt.run(...params);
      return [];
    }
  }
}

/**
 * Initialize database schema
 */
export async function initDb() {
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

  if (isPostgres) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(productsTableSql);
      await client.query(variantsTableSql);
      await client.query(settingsTableSql);
      await client.query('COMMIT');
      console.log('[Database] PostgreSQL schema verified successfully.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Database] Failed to initialize PostgreSQL tables:', err);
      throw err;
    } finally {
      client.release();
    }
  } else {
    sqliteDb.exec(productsTableSql);
    sqliteDb.exec(variantsTableSql);
    sqliteDb.exec(settingsTableSql);
    console.log('[Database] SQLite schema verified successfully.');
  }
}

/**
 * Format database row into product object expected by React app
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
    regionalName: row.regional_name || '',
    brand: row.brand || 'Poomani Oils',
    oilType: row.oil_type || 'Wood-Pressed Cold Extracted',
    description: row.description || '',
    image: row.image,
    imageFileName: row.image_file_name || '',
    price: minPrice,
    inStock,
    variants: sortedVariants.map((v) => ({
      id: v.id,
      size: v.size,
      price: Number(v.price),
      stock: Number(v.stock),
      unit: v.unit || 'Bottle',
      sortOrder: v.sort_order ?? 0,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all products with their variants
 */
export async function getAllProducts() {
  const products = await query('SELECT * FROM products ORDER BY created_at DESC');
  if (products.length === 0) return [];

  const variants = await query(
    'SELECT * FROM product_variants ORDER BY sort_order ASC, price ASC'
  );

  const variantsByProductId = {};
  for (const v of variants) {
    if (!variantsByProductId[v.product_id]) {
      variantsByProductId[v.product_id] = [];
    }
    variantsByProductId[v.product_id].push(v);
  }

  return products.map((p) => formatProduct(p, variantsByProductId[p.id] || []));
}

/**
 * Fetch a single product by ID with variants
 */
export async function getProductById(id) {
  const products = await query('SELECT * FROM products WHERE id = $1', [id]);
  if (products.length === 0) return null;

  const variants = await query(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order ASC',
    [id]
  );
  return formatProduct(products[0], variants);
}

/**
 * Create a new product with variants
 */
export async function createProduct(productData) {
  const id = productData.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();

  const insertProductSql = `
    INSERT INTO products (id, name, regional_name, brand, oil_type, description, image, image_file_name, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  const productParams = [
    id,
    productData.name.trim(),
    productData.regionalName?.trim() || '',
    productData.brand?.trim() || 'Poomani Oils',
    productData.oilType?.trim() || 'Wood-Pressed Cold Extracted',
    productData.description?.trim() || '',
    productData.image.trim(),
    productData.imageFileName?.trim() || '',
    now,
    now,
  ];

  if (isPostgres) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(insertProductSql, productParams);

      const variants = productData.variants || [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const vId = v.id || `var-${Date.now()}-${i}`;
        await client.query(
          `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [vId, id, v.size.trim(), Number(v.price), Number(v.stock), v.unit || 'Bottle', i]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    await query(insertProductSql, productParams);
    const variants = productData.variants || [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const vId = v.id || `var-${Date.now()}-${i}`;
      await query(
        `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [vId, id, v.size.trim(), Number(v.price), Number(v.stock), v.unit || 'Bottle', i]
      );
    }
  }

  return getProductById(id);
}

/**
 * Update an existing product and its pack-size variants
 */
export async function updateProduct(id, productData) {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error(`Product with ID '${id}' not found.`);
  }

  const now = new Date().toISOString();
  const updateProductSql = `
    UPDATE products
    SET name = $1, regional_name = $2, brand = $3, oil_type = $4, description = $5,
        image = $6, image_file_name = $7, updated_at = $8
    WHERE id = $9
  `;

  const productParams = [
    productData.name.trim(),
    productData.regionalName?.trim() || '',
    productData.brand?.trim() || existing.brand,
    productData.oilType?.trim() || existing.oilType,
    productData.description?.trim() || '',
    productData.image ? productData.image.trim() : existing.image,
    productData.imageFileName ? productData.imageFileName.trim() : existing.imageFileName,
    now,
    id,
  ];

  if (isPostgres) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(updateProductSql, productParams);

      if (productData.variants && Array.isArray(productData.variants)) {
        await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
        for (let i = 0; i < productData.variants.length; i++) {
          const v = productData.variants[i];
          const vId = v.id && !v.id.startsWith('v-def') ? v.id : `var-${Date.now()}-${i}`;
          await client.query(
            `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [vId, id, v.size.trim(), Number(v.price), Number(v.stock), v.unit || 'Bottle', i]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    await query(updateProductSql, productParams);
    if (productData.variants && Array.isArray(productData.variants)) {
      await query('DELETE FROM product_variants WHERE product_id = $1', [id]);
      for (let i = 0; i < productData.variants.length; i++) {
        const v = productData.variants[i];
        const vId = v.id && !v.id.startsWith('v-def') ? v.id : `var-${Date.now()}-${i}`;
        await query(
          `INSERT INTO product_variants (id, product_id, size, price, stock, unit, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [vId, id, v.size.trim(), Number(v.price), Number(v.stock), v.unit || 'Bottle', i]
        );
      }
    }
  }

  return getProductById(id);
}

/**
 * Delete a product by ID
 */
export async function deleteProduct(id) {
  const existing = await getProductById(id);
  if (!existing) return null;

  await query('DELETE FROM product_variants WHERE product_id = $1', [id]);
  await query('DELETE FROM products WHERE id = $1', [id]);
  return existing;
}

/**
 * Get all shop settings as a single key-value object
 */
export async function getShopSettings() {
  const rows = await query('SELECT key, value FROM shop_settings');
  const settings = {};
  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value);
    } catch {
      settings[r.key] = r.value;
    }
  }
  return settings;
}

/**
 * Upsert shop settings
 */
export async function saveShopSettings(settingsObject) {
  for (const [key, val] of Object.entries(settingsObject)) {
    const valString = typeof val === 'string' ? val : JSON.stringify(val);
    if (isPostgres) {
      await query(
        `INSERT INTO shop_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, valString]
      );
    } else {
      await query(
        `INSERT INTO shop_settings (key, value) VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, valString]
      );
    }
  }
  return getShopSettings();
}

export function isUsingPostgres() {
  return isPostgres;
}

