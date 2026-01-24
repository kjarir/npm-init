import * as aiService from "../../services/ai.service.js";
import * as prompts from "./escrow.prompts.js";

// 1. Generate Description from Title
export const generateDescription = async (req, res, next) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false,
        message: "Title is required" 
      });
    }

    const prompt = prompts.GENERATE_DESCRIPTION_PROMPT(title);
    const description = await aiService.generateTextResult(prompt);

    res.status(200).json({ 
      success: true,
      description 
    });
  } catch (error) {
    console.error("Generate Description Error:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate description",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 2. Generate Milestones from Details
export const generateMilestones = async (req, res, next) => {
  try {
    const { title, description, count, budget } = req.body;
    
    // Validate required fields
    if (!title || !count || !budget) {
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields",
        required: ["title", "count", "budget"]
      });
    }

    // Validate numeric values
    if (isNaN(count) || count <= 0 || count > 20) {
      return res.status(400).json({ 
        success: false,
        message: "Count must be a number between 1 and 20"
      });
    }

    if (isNaN(budget) || budget <= 0) {
      return res.status(400).json({ 
        success: false,
        message: "Budget must be a positive number"
      });
    }

    const prompt = prompts.GENERATE_MILESTONES_PROMPT(title, description, count, budget);
    const milestones = await aiService.generateJsonResult(prompt);

    res.status(200).json({ 
      success: true,
      milestones 
    });
  } catch (error) {
    console.error("Generate Milestones Error:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Failed to generate milestones",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};