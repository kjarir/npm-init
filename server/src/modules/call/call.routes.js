import express from 'express';
<<<<<<< HEAD
import callController from './callController.js';

const router = express.Router();

// Existing routes
router.post('/', callController.initiateCall);       // Matches POST /api/call
router.get('/:callId', callController.getCallStatus); // Matches GET /api/call/:id
router.get('/history/:phoneNumber', callController.getCallsByPhoneNumber); // Matches GET /api/call/history/:phoneNumber

// NEW Webhook Route
router.post('/webhook', callController.handleWebhook); // Matches POST /api/call/webhook

export default router;
=======
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
>>>>>>> 11e8b2103c35c567037a36c9a391d25e97eed6b9
