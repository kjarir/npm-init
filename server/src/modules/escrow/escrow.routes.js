import express from "express";
import { generateDescription, generateMilestones } from "./escrow.controller.js";

const router = express.Router();

router.post("/generate-description", generateDescription);
router.post("/generate-milestones", generateMilestones);

export default router;