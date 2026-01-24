import express from 'express';
import { calculateReputation } from './reputation.controller.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log('Reputation route hit:', req.path);
  next();
});

router.post('/calculate', calculateReputation);

export default router;
