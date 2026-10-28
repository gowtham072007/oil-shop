import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import {
  initDb,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getShopSettings,
  saveShopSettings,
  isUsingPostgres,
} from './db.js';
import {
  verifyAdminPin,
  createAdminToken,
  requireAdminAuth,
} from './auth.js';
import {
  subscribeEvents,
  broadcast,
} from './events.js';
import {
  uploadMiddleware,
  uploadsDir,
} from './upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and body parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded product photos persistently
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d' }));

// -------------------------------------------------------------
// Real-time Server-Sent Events (SSE) Route
// -------------------------------------------------------------
app.get('/api/events', (req, res) => {
  subscribeEvents(req, res);
});

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: isUsingPostgres() ? 'postgresql' : 'sqlite',
    timestamp: Date.now(),
  });
});

// -------------------------------------------------------------
// Admin Authentication Routes
// -------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body;
  if (!verifyAdminPin(pin)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid Admin PIN. Please enter the correct PIN.',
    });
  }
  const token = createAdminToken();
  res.json({ success: true, token });
});

app.get('/api/admin/verify', requireAdminAuth, (req, res) => {
  res.json({ success: true, authenticated: true });
});

// -------------------------------------------------------------
// Product Management Routes
// -------------------------------------------------------------

// GET all products (Public)
app.get('/api/products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error('[API] Error fetching products:', err);
    res.status(500).json({ success: false, error: 'Failed to load products from database.' });
  }
});

// GET single product (Public)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error('[API] Error fetching product:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve product details.' });
  }
});

// POST create product (Admin only)
app.post('/api/products', requireAdminAuth, async (req, res) => {
  try {
    const { name, image, variants } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }
    if (!image || !image.trim()) {
      return res.status(400).json({ success: false, error: 'Product photo is mandatory.' });
    }
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one pack size variant is required.' });
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.size || !v.size.trim()) {
        return res.status(400).json({ success: false, error: `Pack size description is required for row #${i + 1}.` });
      }
      const priceNum = Number(v.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ success: false, error: `Price for pack size '${v.size}' must be greater than ₹0.` });
      }
      const stockNum = Number(v.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({ success: false, error: `Available stock for pack size '${v.size}' cannot be negative.` });
      }
    }

    const created = await createProduct(req.body);

    // Broadcast real-time update to all connected devices immediately!
    broadcast('product:created', created);

    res.status(201).json({ success: true, product: created });
  } catch (err) {
    console.error('[API] Error creating product:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save product to central database.' });
  }
});

// PUT update product (Admin only)
app.put('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, variants } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }
    if (!image || !image.trim()) {
      return res.status(400).json({ success: false, error: 'Product photo is mandatory.' });
    }
    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one pack size variant is required.' });
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.size || !v.size.trim()) {
        return res.status(400).json({ success: false, error: `Pack size description is required for row #${i + 1}.` });
      }
      const priceNum = Number(v.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return res.status(400).json({ success: false, error: `Price for pack size '${v.size}' must be greater than ₹0.` });
      }
      const stockNum = Number(v.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        return res.status(400).json({ success: false, error: `Available stock for pack size '${v.size}' cannot be negative.` });
      }
    }

    const updated = await updateProduct(id, req.body);

    // Broadcast real-time update to all connected devices immediately!
    broadcast('product:updated', updated);

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error('[API] Error updating product:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update product in database.' });
  }
});

// DELETE product (Admin only)
app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteProduct(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Clean up uploaded image if it was saved locally
    if (deleted.image && deleted.image.startsWith('/uploads/')) {
      const filename = path.basename(deleted.image);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    // Broadcast deletion in real time to all connected devices!
    broadcast('product:deleted', { id });

    res.json({ success: true, id, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('[API] Error deleting product:', err);
    res.status(500).json({ success: false, error: 'Failed to delete product from database.' });
  }
});

// -------------------------------------------------------------
// Photo Upload Route (Admin only)
// -------------------------------------------------------------
app.post('/api/upload', requireAdminAuth, (req, res) => {
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('[Upload] Error processing image upload:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to upload photo. Ensure it is a valid JPG, PNG, or WEBP under 5MB.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file was received. Please select a photo.',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: fileUrl,
      fileName: req.file.originalname,
      size: req.file.size,
    });
  });
});

// -------------------------------------------------------------
// Shop Settings Routes
// -------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getShopSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[API] Error loading settings:', err);
    res.status(500).json({ success: false, error: 'Failed to load shop settings.' });
  }
});

app.put('/api/settings', requireAdminAuth, async (req, res) => {
  try {
    const updated = await saveShopSettings(req.body);
    broadcast('settings:updated', updated);
    res.json({ success: true, settings: updated });
  } catch (err) {
    console.error('[API] Error saving settings:', err);
    res.status(500).json({ success: false, error: 'Failed to save shop settings.' });
  }
});

// -------------------------------------------------------------
// Safe Migration / One-Time Sync Route
// -------------------------------------------------------------
app.post('/api/sync-migration', requireAdminAuth, async (req, res) => {
  try {
    const { localProducts } = req.body;
    const currentProducts = await getAllProducts();

    // Only import if central database is currently empty and admin has genuine items
    if (currentProducts.length === 0 && Array.isArray(localProducts) && localProducts.length > 0) {
      const imported = [];
      for (const p of localProducts) {
        if (p.name && p.image && p.variants?.length > 0) {
          const item = await createProduct(p);
          imported.push(item);
        }
      }
      return res.json({ success: true, importedCount: imported.length, message: 'Existing products migrated to central database.' });
    }

    res.json({ success: true, importedCount: 0, message: 'Database already has products or no valid local products to migrate.' });
  } catch (err) {
    console.error('[API] Error during sync-migration:', err);
    res.status(500).json({ success: false, error: 'Migration failed.' });
  }
});

// -------------------------------------------------------------
// Production Static Hosting & Catch-All SPA Routing
// -------------------------------------------------------------
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res) => {
    // If request is not an API route or upload, serve index.html
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
}

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Poomani Oils Server] Running on http://0.0.0.0:${PORT}`);
      console.log(`[Poomani Oils Server] Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[Poomani Oils Server] Startup error:', err);
    process.exit(1);
  }
}

startServer();
