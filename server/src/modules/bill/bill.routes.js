import express from 'express';
import multer from 'multer';
import { verifyBill } from './bill.controller.js';

const router = express.Router();

// Configure Multer for memory storage (secure, no disk writing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
  }
});

// POST /api/bill/verify
router.post('/verify', upload.single('bill'), verifyBill);

export default router;