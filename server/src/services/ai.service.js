import { geminiModel } from "../config/gemini.js";

export const generateTextResult = async (prompt) => {
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI Service Failed");
  }
};

export const generateJsonResult = async (prompt) => {
  try {
    const text = await generateTextResult(prompt);
    // Clean up potential markdown formatting (```json ... ```)
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("JSON Parsing Error:", error);
    throw new Error("Failed to generate structured data");
  }
};