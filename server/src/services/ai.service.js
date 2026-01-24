import { geminiModel } from "../config/gemini.js";

/**
 * Generate text result from Gemini AI
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<string>} - The generated text
 */
export const generateTextResult = async (prompt) => {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("AI Text Generation Error:", error.message);
    throw new Error("Failed to generate text from AI");
  }
};

/**
 * Generate JSON result from Gemini AI
 * @param {string} prompt - The prompt to send to Gemini
 * @returns {Promise<Object|Array>} - The parsed JSON result
 */
export const generateJsonResult = async (prompt) => {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean the response - remove markdown code blocks if present
    text = text.trim();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Parse and validate JSON
    const jsonData = JSON.parse(text);
    return jsonData;
  } catch (error) {
    console.error("AI JSON Generation Error:", error.message);
    if (error instanceof SyntaxError) {
      throw new Error("AI returned invalid JSON format");
    }
    throw new Error("Failed to generate JSON from AI");
  }
};
