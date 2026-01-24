import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import Call from './call.model.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to run the Python script systematically
const runPythonScript = (args) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(__dirname, '../../../../ai_engine/main.py');
        const pythonExecutable = path.resolve(__dirname, '../../../../ai_engine/venv/Scripts/python.exe');
        
        const processArgs = [scriptPath, ...args];
        const pythonProcess = spawn(pythonExecutable, processArgs);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => dataString += data.toString());
        pythonProcess.stderr.on('data', (data) => errorString += data.toString());

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python Logic Error:", errorString);
                return reject({ status: 500, error: 'Internal AI Engine Error', details: errorString });
            }
            try {
                const jsonStartIndex = dataString.indexOf('{');
                if (jsonStartIndex === -1) throw new Error('No JSON output found from Python script');
                
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
const initiateCall = async (req, res) => {
    const { phoneNumber, customScript, language } = req.body;
    if (!phoneNumber || !customScript) {
        return res.status(400).json({ error: 'Phone number and script are required' });
    }

    try {
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

        res.json(result);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json(error);
    }
};

// Route: GET /api/call/:callId
const getCallStatus = async (req, res) => {
    const { callId } = req.params;
    if (!callId) return res.status(400).json({ error: 'Call ID is required' });
    
    try {
        const result = await runPythonScript(['status', callId]);
        res.json(result);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json(error);
    }
};

// Route: POST /api/call/webhook
const handleWebhook = async (req, res) => {
    try {
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

        // --- DEBUG LOGGING ---
        console.log("--- DATA TO SAVE ---");
        console.log("Transcript Length:", finalTranscript.length);
        console.log("Analysis Keys:", Object.keys(finalAnalysis));
        console.log("Recording URL:", finalRecordingUrl);
        // ---------------------

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

        console.log("Call saved to DB ID:", savedCall._id);
        res.status(200).json({ message: "Webhook processed successfully" });

    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Route: GET /api/call/history/:phoneNumber
const getCallsByPhoneNumber = async (req, res) => {
    const { phoneNumber } = req.params;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        // Find calls by phone number, sorted by newest first
        const calls = await Call.find({ phoneNumber }).sort({ createdAt: -1 });
        res.json(calls);
    } catch (error) {
        console.error("Error fetching call history:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export default { initiateCall, getCallStatus, handleWebhook, getCallsByPhoneNumber };