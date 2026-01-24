import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Access your API keyCb as an environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// We use the 'gemini-pro' model for text generation
export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });