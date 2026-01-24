import { createWorker } from 'tesseract.js';

export const extractTextFromImage = async (imageBuffer) => {
  let worker = null;
  try {
    // Initialize Tesseract worker
    worker = await createWorker('eng');
    
    // Perform OCR on the buffer
    const { data: { text } } = await worker.recognize(imageBuffer);
    
    return text;
  } catch (error) {
    console.error("OCR Processing Error:", error);
    throw new Error("Failed to extract text from the document.");
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
};