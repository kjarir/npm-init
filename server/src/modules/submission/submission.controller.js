import AdmZip from 'adm-zip';
import { isFileAllowed } from '../../utils/fileFilter.js';
import { queryOllama } from '../../config/ollama.js';
import { AUDIT_CODEBASE_PROMPT } from './submission.prompts.js';

export const uploadCodeZip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No zip file uploaded" });
    }

    const zip = new AdmZip(req.file.buffer);
    const zipEntries = zip.getEntries();
    
    let combinedCode = "";

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

    // AI Analysis
    let analysisResult = null;
    try {
      console.log("Starting AI analysis with qwen2.5-coder...");
      
      let milestones = null;
      if (req.body.milestones) {
        try {
          milestones = typeof req.body.milestones === 'string' ? JSON.parse(req.body.milestones) : req.body.milestones;
        } catch (e) {
          console.warn("Invalid milestones format:", e.message);
        }
      }

      const analysisPrompt = AUDIT_CODEBASE_PROMPT(combinedCode, milestones);
      const aiResponse = await queryOllama('qwen2.5-coder', analysisPrompt);
      
      // Clean up markdown if present, though format: "json" should help
      const jsonString = typeof aiResponse === 'string' ? aiResponse.replace(/```json/g, "").replace(/```/g, "").trim() : JSON.stringify(aiResponse);
      analysisResult = JSON.parse(jsonString);

    } catch (aiError) {
      console.error("AI Analysis Failed:", aiError);
      return res.status(500).json({ message: "AI Analysis Failed" });
    }

    res.json(analysisResult);

  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ message: "Failed to process zip file" });
  }
};