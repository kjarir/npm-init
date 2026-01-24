import * as ollamaService from '../../services/ollama.service.js';

export const calculateReputation = async (req, res) => {
  try {
    const {
      milestoneCompletion,     // boolean
      speedBonus,              // boolean
      highValueContract,       // boolean
      streakBonus,             // boolean
      missedDeadline,          // boolean
      contractAbandonment,     // boolean
      disputeChat,             // string (optional, for dispute analysis)
      userName,                // string (required if disputeChat is present)
      opponentName,            // string (optional, context for dispute)
      currentReputation = 0    // number (default 0)
    } = req.body;

    let reputationChange = 0;
    const details = [];

    // 1. Milestone Completion (+5)
    if (milestoneCompletion) {
      reputationChange += 5;
      details.push("Milestone Completion: +5");
    }

    // 2. Speed Bonus (+2)
    if (speedBonus) {
      reputationChange += 2;
      details.push("Speed Bonus: +2");
    }

    // 3. High Value Contract (+3)
    if (highValueContract) {
      reputationChange += 3;
      details.push("High Value Contract: +3");
    }

    // 5. Streak Bonus (+5)
    if (streakBonus) {
      reputationChange += 5;
      details.push("Streak Bonus: +5");
    }

    // 6. Missed Deadline (-2)
    if (missedDeadline) {
      reputationChange -= 2;
      details.push("Missed Deadline: -2");
    }

    // 7. Contract Abandonment (-20)
    if (contractAbandonment) {
      reputationChange -= 20;
      details.push("Contract Abandonment: -20");
    }

    // 4 & 8. Dispute Analysis (+10 or -25)
    let disputeResult = null;
    if (disputeChat) {
      if (!userName) {
        return res.status(400).json({ message: "userName is required for dispute analysis." });
      }

      disputeResult = await ollamaService.analyzeDispute(disputeChat, userName, opponentName);
      
      // Determine if the user won
      // We check if the winner string includes the userName (case-insensitive)
      const userWon = disputeResult.winner.toLowerCase().includes(userName.toLowerCase());

      if (userWon) {
        reputationChange += 10;
        details.push(`Dispute Won (${disputeResult.winner}): +10`);
      } else {
        reputationChange -= 25;
        details.push(`Dispute Lost (Winner: ${disputeResult.winner}): -25`);
      }
    }

    // Calculate new total
    let newReputation = currentReputation + reputationChange;

    // Apply Cap of 100
    if (newReputation > 100) {
      newReputation = 100;
      details.push("Capped at 100");
    }
    // Optional: Min Cap at 0? (Not requested, but common)
    // if (newReputation < 0) newReputation = 0;

    res.status(200).json({
      success: true,
      data: {
        currentReputation,
        totalScoreChange: reputationChange,
        newReputation,
        details: details,
        disputeAnalysis: disputeResult
      }
    });

  } catch (error) {
    console.error("Reputation Calculation Error:", error);
    res.status(500).json({ 
      message: error.message || "An unexpected error occurred." 
    });
  }
};
