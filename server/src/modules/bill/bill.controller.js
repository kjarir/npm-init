import * as ocrService from '../../services/ocr.service.js';
import * as ollamaService from '../../services/ollama.service.js';

export const verifyBill = async (req, res) => {
  try {
    // 1. Input Validation
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please upload an image." });
    }

    // 2. OCR Processing (Extract Text)
    // Note: Tesseract.js works natively with images. 
    // For PDFs, a robust production setup would require converting PDF pages to images first (e.g. using pdf-poppler).
    const extractedText = await ocrService.extractTextFromImage(req.file.buffer);

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(422).json({ message: "Could not extract any readable text from the image." });
    }

    // 3. AI Processing (Extract Structured Data)
    const structuredData = await ollamaService.processBillText(extractedText);
    
    // 4. Generate Verification Prompt
    const verificationPrompt = await ollamaService.generateVerificationPrompt(structuredData);

    // 5. Return Response
    console.debug("Extracted Text:", extractedText);
    console.debug("Structured Data:", structuredData);
    res.status(200).json({
      success: true,
      data: structuredData,
      verificationPrompt: verificationPrompt,
    //   debug: extractedText // Uncomment for debugging OCR quality
    });

  } catch (error) {
    console.error("Bill Verification Error:", error);
    res.status(500).json({ 
      message: error.message || "An unexpected error occurred during processing." 
    });
  }
};  