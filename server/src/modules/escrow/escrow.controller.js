import * as aiService from "../../services/ai.service.js";
import * as prompts from "./escrow.prompts.js";

// 1. Generate Description from Title
export const generateDescription = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const prompt = prompts.GENERATE_DESCRIPTION_PROMPT(title);
    const description = await aiService.generateTextResult(prompt);

    res.json({ description });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Generate Milestones from Details
export const generateMilestones = async (req, res) => {
  try {
    const { title, description, count, budget } = req.body;
    if (!title || !count || !budget) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const prompt = prompts.GENERATE_MILESTONES_PROMPT(title, description, count, budget);
    const milestones = await aiService.generateJsonResult(prompt);

    res.json({ milestones });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};