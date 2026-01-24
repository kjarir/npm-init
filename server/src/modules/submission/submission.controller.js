import AdmZip from 'adm-zip';
import { isFileAllowed } from '../../utils/fileFilter.js';
import { queryOllama } from '../../config/ollama.js'; // Keep this import
import { AUDIT_CODEBASE_PROMPT } from './submission.prompts.js';

export const uploadCodeZip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No zip file uploaded" });
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    let combinedCode = "";

    // 1. Extract Code
    zipEntries.forEach((entry) => {
      // Skip directories and check allow-list
      if (!entry.isDirectory && isFileAllowed(entry.entryName)) {
        try {
          const content = entry.getData().toString('utf8');
          combinedCode += `\n\n/* --- FILE: ${entry.entryName} --- */\n\n`;
          combinedCode += content;
        } catch (readError) {
          console.error(`Could not read file ${entry.entryName}: ${readError.message}`);
        }
      }
    });

    // 2. CRITICAL: Truncate to avoid Vercel Timeouts
    // Sending >50k characters to a local LLM usually takes >10s, which crashes Vercel.
    const MAX_CHARS = 50000; 
    if (combinedCode.length > MAX_CHARS) {
        console.log(`Codebase too large (${combinedCode.length} chars). Truncating...`);
        combinedCode = combinedCode.substring(0, MAX_CHARS) + "\n\n[TRUNCATED DUE TO SIZE LIMIT]";
    }

    // 3. AI Analysis
    let analysisResult = null;
    try {
      console.log("Starting AI analysis with Local Ollama...");
      
      let milestones = null;
      if (req.body.milestones) {
        try {
          milestones = typeof req.body.milestones === 'string' ? JSON.parse(req.body.milestones) : req.body.milestones;
        } catch (e) {
          console.warn("Invalid milestones format:", e.message);
        }
      }

      const analysisPrompt = AUDIT_CODEBASE_PROMPT(combinedCode, milestones);
      
      // Call your local Ollama
      const aiResponse = await queryOllama('qwen2.5-coder', analysisPrompt);
      
      // Parse Response
      const jsonString = typeof aiResponse === 'string' ? aiResponse.replace(/```json/g, "").replace(/```/g, "").trim() : JSON.stringify(aiResponse);
      analysisResult = JSON.parse(jsonString);

    } catch (aiError) {
      console.error("AI Analysis Failed:", aiError);
      return res.status(500).json({ message: "AI Analysis Failed: " + aiError.message });
    }

    res.json(analysisResult);

  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Failed to process zip file" });
  }
};