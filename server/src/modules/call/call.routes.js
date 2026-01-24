import express from 'express';
import { 
    initiateCall, 
    getCallStatus, 
    handleWebhook, 
    getCallsByPhoneNumber 
} from './call.controller.js';

const router = express.Router();

// Call Management Routes
router.post('/', initiateCall);                     // Initiate a new call
router.get('/:callId', getCallStatus);              // Get status of a specific call
router.get('/history/:phoneNumber', getCallsByPhoneNumber); // Get call history

// Webhook Route
router.post('/webhook', handleWebhook);

export default router;