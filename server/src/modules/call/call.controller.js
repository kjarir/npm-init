import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Call from './call.model.js'; 
import { asyncHandler } from '../../../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to run the Python script systematically
const runPythonScript = (args) => {
    return new Promise((resolve, reject) => {
        // Resolve paths relative to the server root (assuming server is at server/)
        // Original path: ../../../../ai_engine/main.py (implies server/src/modules/call/ -> 4 levels up -> ai_engine)
        // Project Root: E:\KHacks\npm-init\
        // Server Root: E:\KHacks\npm-init\server\
        // File: E:\KHacks\npm-init\server\src\modules\call\call.controller.js
        // 4 levels up:
        // 1. call
        // 2. modules
        // 3. src
        // 4. server
        // -> E:\KHacks\npm-init\
        
        const projectRoot = path.resolve(__dirname, '../../../../'); 
        const scriptPath = path.join(projectRoot, 'ai_engine', 'main.py');
        
        // Check if virtual env exists, otherwise try global python
        const venvPython = path.join(projectRoot, 'ai_engine', 'venv', 'Scripts', 'python.exe'); // Windows specific
        const pythonExecutable = fs.existsSync(venvPython) ? venvPython : 'python';
        
        // Verify script exists
        if (!fs.existsSync(scriptPath)) {
             console.error(`Python script not found at: ${scriptPath}`);
             return reject({ 
                 status: 500, 
                 error: 'AI Engine Configuration Error', 
                 details: 'Main python script not found' 
             });
        }

        const processArgs = [scriptPath, ...args];
        const pythonProcess = spawn(pythonExecutable, processArgs);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => dataString += data.toString());
        pythonProcess.stderr.on('data', (data) => errorString += data.toString());

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python Logic Error:", errorString);
                // Try to parse error string if it contains JSON
                try {
                    const errObj = JSON.parse(errorString);
                    return reject({ status: 500, ...errObj });
                } catch {
                     return reject({ status: 500, error: 'Internal AI Engine Error', details: errorString });
                }
            }
            try {
                // Find start of JSON
                const jsonStartIndex = dataString.indexOf('{');
                if (jsonStartIndex === -1) {
                    // It might be empty or just text
                    if (dataString.trim().length > 0) return resolve({ message: dataString.trim() });
                    throw new Error('No JSON output found from Python script');
                }
                
                const cleanJson = dataString.substring(jsonStartIndex);
                const result = JSON.parse(cleanJson);

                if (result.status === 'success') {
                    resolve(result);
                } else {
                    console.error("AI Engine Error:", result); 
                    reject({ status: 500, ...result }); 
                }
            } catch (e) {
                console.error("Response Parsing Error:", dataString);
                reject({ status: 500, error: 'Failed to parse AI response' });
            }
        });
    });
};

// Route: POST /api/call
export const initiateCall = asyncHandler(async (req, res) => {
    const { phoneNumber, customScript, language } = req.body;
    
    if (!phoneNumber || !customScript) {
        return res.status(400).json({ 
            success: false, 
            message: 'Phone number and script are required' 
        });
    }

    const result = await runPythonScript(['call', phoneNumber, customScript, language || 'English']);
    
    // Save initial call record to DB
    if (result.call_id) {
            await Call.updateOne(
            { callId: result.call_id },
            { 
                $setOnInsert: {
                    callId: result.call_id,
                    phoneNumber: phoneNumber,
                    status: 'queued',
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );
    }

    res.status(200).json({
        success: true,
        data: result
    });
});

// Route: GET /api/call/:callId
export const getCallStatus = asyncHandler(async (req, res) => {
    const { callId } = req.params;
    if (!callId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Call ID is required' 
        });
    }
    
    const result = await runPythonScript(['status', callId]);
    res.status(200).json({
        success: true,
        data: result
    });
});

// Route: POST /api/call/webhook
export const handleWebhook = asyncHandler(async (req, res) => {
    // 1. Log the raw payload to confirm reception
    console.log("Webhook received payload:", JSON.stringify(req.body, null, 2));

    const { 
        call_id, id, status, 
        transcript, recording_url, recording, 
        duration, call_duration,
        analysis, to_number, 
        call_report // <--- IMPORTANT: Extract this nested object
    } = req.body;
    
    const finalCallId = call_id || id;

    if (!finalCallId) {
        return res.status(400).json({ error: "Missing call_id in payload" });
    }

    // --- TRANSCRIPT EXTRACTION ---
    let finalTranscript = transcript || '';
    
    // If transcript is empty, check inside call_report
    if (!finalTranscript && call_report && call_report.full_conversation) {
        finalTranscript = call_report.full_conversation;
        
        // Clean up if it's a stringified JSON array like "['User: hi', 'Agent: hello']"
        if (typeof finalTranscript === 'string' && finalTranscript.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(finalTranscript);
                if (Array.isArray(parsed)) finalTranscript = parsed.join('\n');
            } catch(e) { 
                console.log("Transcript parsing warning:", e.message);
            }
        }
    }

    // --- ANALYSIS EXTRACTION ---
    let finalAnalysis = analysis || {};
    
    // Merge data from call_report into analysis
    if (call_report) {
        finalAnalysis = {
            ...finalAnalysis,
            summary: call_report.summary,
            sentiment: call_report.sentiment,
            extracted_variables: call_report.extracted_variables,
            interactions: call_report.interactions
        };
    }

    // --- RECORDING EXTRACTION ---
    const finalRecordingUrl = recording_url || recording || (call_report && call_report.recording_url);

    const updateData = {
        callId: finalCallId,
        status: status || 'completed',
        phoneNumber: to_number,
        ...(finalTranscript && { transcript: finalTranscript }),
        ...(finalRecordingUrl && { recordingUrl: finalRecordingUrl }),
        ...(duration || call_duration ? { duration: duration || call_duration } : {}),
        analysis: finalAnalysis
    };

    const savedCall = await Call.findOneAndUpdate(
        { callId: finalCallId },
        updateData,
        { new: true, upsert: true } 
    );

    console.log("Call saved to DB ID:", savedCall ? savedCall._id : 'unknown');
    res.status(200).json({ message: "Webhook processed successfully" });
});

// Route: GET /api/call/history/:phoneNumber
export const getCallsByPhoneNumber = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.params;
    if (!phoneNumber) {
        return res.status(400).json({ 
            success: false, 
            message: 'Phone number is required' 
        });
    }

    // Find calls by phone number, sorted by newest first
    const calls = await Call.find({ phoneNumber }).sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        data: calls
    });
});
