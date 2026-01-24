import express from 'express';
import multer from 'multer';
import { uploadCodeZip } from './submission.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST route for zip upload
router.post('/upload', upload.single('projectZip'), uploadCodeZip);

export default router;