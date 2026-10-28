import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const uniqueName = `product-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${cleanExt}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp'];

  if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP.'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
}).single('photo');

export { uploadsDir };
