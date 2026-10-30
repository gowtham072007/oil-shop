import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
  getDatabaseDiagnostics,
  saveOrder,
  getAllOrders,
  getOrderById,
  updateOrderWhatsAppStatus,
  PERMANENT_ADMIN_WHATSAPP,
  PERMANENT_ADMIN_WHATSAPP_DISPLAY,
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
import {
  saveBillImageFile,
  getWhatsAppCloudConfig,
  sendWhatsAppCloudImage,
  verifyWhatsAppCloudCredentials,
  sendWhatsAppTestPing,
  formatMetaErrorMessage,
} from './whatsappCloudApi.js';

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
  const diag = getDatabaseDiagnostics();
  res.json({
    status: 'ok',
    database: diag.engine === 'postgres' ? 'postgresql' : 'persistent-file-store',
    diagnostics: diag,
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

/**
 * Helper to ensure an image is stored permanently on disk rather than as a temporary base64 string
 */
function ensurePersistentImageUrl(imageUrl, originalFileName = 'product.jpg') {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
    return imageUrl;
  }
  try {
    const matches = imageUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) return imageUrl;
    const ext = matches[1].replace('jpeg', 'jpg');
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `product-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('[Upload] Failed to convert base64 image to permanent file:', err);
    return imageUrl;
  }
}

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

    const persistentImageUrl = ensurePersistentImageUrl(image, req.body.imageFileName);
    const created = await createProduct({
      ...req.body,
      image: persistentImageUrl,
    });

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

    const persistentImageUrl = ensurePersistentImageUrl(image, req.body.imageFileName);
    const updated = await updateProduct(id, {
      ...req.body,
      image: persistentImageUrl,
    });

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
// WhatsApp Bill Image & Cloud API Routes
// -------------------------------------------------------------

// Upload dynamically generated bill image from frontend canvas to persistent server storage
app.post('/api/orders/upload-bill', async (req, res) => {
  try {
    const { orderNumber, dataUrl } = req.body;
    if (!orderNumber || !dataUrl) {
      return res.status(400).json({ success: false, error: 'orderNumber and dataUrl are required.' });
    }

    const saved = await saveBillImageFile(orderNumber, dataUrl, req);
    res.json({
      success: true,
      ...saved,
      message: 'Bill image saved successfully on persistent storage.',
    });
  } catch (err) {
    console.error('[API] Error saving bill image:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to save bill image.' });
  }
});

// Dispatch bill via Meta WhatsApp Cloud API directly to store owner's entered WhatsApp number
app.post('/api/orders/send-whatsapp-bill', async (req, res) => {
  try {
    const {
      orderNumber,
      customerName,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      discount,
      grandTotal,
      paymentMethod,
      billDataUrl,
      billText,
    } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    let publicUrl = '';
    let relativeUrl = '';
    let saved = null;

    if (billDataUrl) {
      saved = await saveBillImageFile(orderNumber, billDataUrl, req);
      publicUrl = saved.publicUrl;
      relativeUrl = saved.relativeUrl;
    }

    // Fixed Admin WhatsApp recipient number: +91 6385755368
    // All customer order bills must be dispatched exclusively to this number.
    const adminWhatsApp = PERMANENT_ADMIN_WHATSAPP;

    // Record order in central database
    await saveOrder({
      orderNumber,
      customerName: customerName || 'Valued Customer',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      grandTotal: Number(grandTotal) || 0,
      paymentMethod: paymentMethod || 'Cash',
      billImageUrl: publicUrl,
      whatsappRecipient: adminWhatsApp,
      whatsappStatus: 'pending',
    });

    if (!adminWhatsApp) {
      await updateOrderWhatsAppStatus(orderNumber, {
        status: 'failed',
        error: 'Shop owner WhatsApp number is not configured in Admin Dashboard Settings.',
        billImageUrl: publicUrl,
      });
      return res.status(200).json({
        success: false,
        apiSent: false,
        error: 'Shop owner WhatsApp number is not configured in Admin Dashboard Settings. Please enter a valid 10-digit mobile number with country code (+91).',
        orderNumber,
        publicUrl,
        relativeUrl,
      });
    }

    const config = await getWhatsAppCloudConfig();
    if (!config.isConfigured || !config.isEnabled) {
      const unconfiguredMsg = 'WhatsApp Business Cloud API credentials (Phone Number ID & Access Token) are not configured on this server. Please enter them in Admin Settings > Meta WhatsApp Business Settings.';
      await updateOrderWhatsAppStatus(orderNumber, {
        status: 'unconfigured',
        recipient: adminWhatsApp,
        error: unconfiguredMsg,
        billImageUrl: publicUrl,
      });

      return res.status(200).json({
        success: false,
        apiSent: false,
        notConfigured: true,
        error: unconfiguredMsg,
        recipient: adminWhatsApp,
        orderNumber,
        publicUrl,
        relativeUrl,
      });
    }

    // Call Meta WhatsApp Business Cloud API
    const result = await sendWhatsAppCloudImage({
      to: adminWhatsApp, // Route customer order bill photo strictly to shop owner, not customer
      filePath: saved ? saved.filePath : undefined,
      fileName: saved ? saved.fileName : undefined,
      imageUrl: publicUrl,
      caption: billText,
      orderNumber,
    });

    if (result.success && result.apiSent) {
      await updateOrderWhatsAppStatus(orderNumber, {
        status: 'delivered',
        messageId: result.messageId,
        recipient: adminWhatsApp,
        billImageUrl: publicUrl,
      });

      // Broadcast order update to connected admin sessions
      broadcast('order:created', {
        orderNumber,
        customerName,
        customerPhone,
        grandTotal,
        whatsappStatus: 'delivered',
        whatsappMessageId: result.messageId,
        recipient: adminWhatsApp,
      });

      return res.status(200).json({
        success: true,
        apiSent: true,
        messageId: result.messageId,
        recipient: adminWhatsApp,
        orderNumber,
        publicUrl,
        relativeUrl,
      });
    }

    // Meta API returned error
    await updateOrderWhatsAppStatus(orderNumber, {
      status: 'failed',
      error: result.error || 'Meta WhatsApp API dispatch error',
      recipient: adminWhatsApp,
      billImageUrl: publicUrl,
    });

    return res.status(200).json({
      success: false,
      apiSent: false,
      error: result.error || 'Failed to dispatch bill photo via WhatsApp Cloud API.',
      metaDetails: result.metaDetails,
      stage: result.stage,
      recipient: adminWhatsApp,
      orderNumber,
      publicUrl,
      relativeUrl,
    });
  } catch (err) {
    console.error('[API] Error dispatching WhatsApp Cloud message:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch WhatsApp message.' });
  }
});

// Admin Route: Get all orders from persistent database
app.get('/api/orders', requireAdminAuth, async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[API] Error loading orders:', err);
    res.status(500).json({ success: false, error: 'Failed to load customer orders.' });
  }
});

// Admin Route: Test Meta WhatsApp Business Cloud API Connection
app.post('/api/whatsapp/test-connection', requireAdminAuth, async (req, res) => {
  try {
    const { token, phoneNumberId } = req.body;
    const settings = await getShopSettings();
    const testToken = token || settings.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
    const testPhoneId = phoneNumberId || settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!testToken || !testPhoneId) {
      return res.status(400).json({
        success: false,
        error: 'Both Access Token and Phone Number ID are required to test the WhatsApp Cloud API.',
      });
    }

    const verification = await verifyWhatsAppCloudCredentials(testToken, testPhoneId);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || 'Meta WhatsApp verification failed.',
        details: verification.details,
      });
    }

    res.json({
      success: true,
      ...verification,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Route: Send a test ping to store owner's WhatsApp number to verify active authorization
app.post('/api/whatsapp/send-test-ping', requireAdminAuth, async (req, res) => {
  try {
    const { token, phoneNumberId, to } = req.body;
    const settings = await getShopSettings();
    const testToken = token || settings.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN;
    const testPhoneId = phoneNumberId || settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const testRecipient = PERMANENT_ADMIN_WHATSAPP;

    if (!testToken || !testPhoneId) {
      return res.status(400).json({
        success: false,
        error: 'Both Access Token and Phone Number ID are required to send a test message.',
      });
    }

    if (!testRecipient) {
      return res.status(400).json({
        success: false,
        error: 'Store owner WhatsApp recipient number is required.',
      });
    }

    const result = await sendWhatsAppTestPing({
      to: testRecipient,
      token: testToken,
      phoneNumberId: testPhoneId,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        metaDetails: result.metaDetails,
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      recipient: result.recipient,
      message: `Test ping message delivered to WhatsApp recipient +${result.recipient}!`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check WhatsApp Cloud API configuration status (safe, no secret tokens leaked)
app.get('/api/whatsapp/status', async (_req, res) => {
  try {
    const config = await getWhatsAppCloudConfig();
    res.json({
      success: true,
      isConfigured: config.isConfigured,
      isEnabled: config.isEnabled,
      phoneNumberId: config.phoneNumberId,
      hasToken: config.hasToken,
      wabaId: config.wabaId,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Route: Read full WhatsApp Cloud API config securely
app.get('/api/admin/whatsapp-config', requireAdminAuth, async (req, res) => {
  try {
    const settings = await getShopSettings();
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN || settings.whatsappCloudApiToken || '';
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings.whatsappPhoneNumberId || '';
    const wabaId = process.env.WHATSAPP_WABA_ID || settings.whatsappWabaId || '';

    res.json({
      success: true,
      isConfigured: Boolean(token && phoneNumberId),
      phoneNumberId,
      wabaId,
      hasToken: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 8)}••••${token.slice(-6)}` : '',
      isEnabled: Boolean(process.env.WHATSAPP_CLOUD_API_ENABLED === 'true' || settings.whatsappCloudApiEnabled),
      adminPhone: settings.whatsappNumber || '',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Shop Settings Routes
// -------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getShopSettings();
    // Return safe settings (do not leak raw token in public endpoint)
    const safeSettings = {
      ...settings,
      hasWhatsAppCloudApiToken: Boolean(settings.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN),
      whatsappCloudApiConfigured: Boolean((settings.whatsappCloudApiToken || process.env.WHATSAPP_CLOUD_API_TOKEN) && (settings.whatsappPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID)),
    };
    res.json({ success: true, settings: safeSettings });
  } catch (err) {
    console.error('[API] Error loading settings:', err);
    res.status(500).json({ success: false, error: 'Failed to load shop settings.' });
  }
});

app.put('/api/settings', requireAdminAuth, async (req, res) => {
  try {
    const existing = await getShopSettings();
    const updatePayload = { ...req.body };

    // If whatsappCloudApiToken is omitted or empty, preserve existing token
    if (!updatePayload.whatsappCloudApiToken && existing.whatsappCloudApiToken) {
      updatePayload.whatsappCloudApiToken = existing.whatsappCloudApiToken;
    }

    // Fixed Admin WhatsApp recipient number (+91 6385755368) permanently locked
    updatePayload.whatsappNumber = PERMANENT_ADMIN_WHATSAPP;
    updatePayload.phoneDisplay = PERMANENT_ADMIN_WHATSAPP_DISPLAY;

    const updated = await saveShopSettings(updatePayload);
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
  } catch (err) {
    console.error('[Poomani Oils Server] Database init warning (server will still start):', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Poomani Oils Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Poomani Oils Server] Database Engine: ${isUsingPostgres() ? 'PostgreSQL' : 'Persistent Central File Store'}`);
  });
}

startServer();
