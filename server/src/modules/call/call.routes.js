import express from 'express';
import callController from './callController.js';

const router = express.Router();

// Existing routes
router.post('/', callController.initiateCall);       // Matches POST /api/call
router.get('/:callId', callController.getCallStatus); // Matches GET /api/call/:id
router.get('/history/:phoneNumber', callController.getCallsByPhoneNumber); // Matches GET /api/call/history/:phoneNumber

// NEW Webhook Route
router.post('/webhook', callController.handleWebhook); // Matches POST /api/call/webhook

export default router;
