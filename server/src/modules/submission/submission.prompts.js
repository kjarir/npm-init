export const AUDIT_CODEBASE_PROMPT = (codebaseContent, milestones = null) => {
  const defaultMilestones = [
    'Project Wizard UI & Step 1 Form',
    'AI Integration & Automation',
    'Milestone Management System (Step 2)',
    'State Management & Project Finalization',
    'Tailwind Styling & Iconography',
    'Dev Environment & Linting Setup',
    'User Authentication System',
    'Payment Gateway Integration',
  ];

  const list = Array.isArray(milestones) && milestones.length ? milestones : defaultMilestones;
  const formattedMilestones = list.map((m, i) => {
    if (typeof m === 'string') return `${i + 1}. ${m}`;
    return `${i + 1}. ${m.title || 'Untitled Milestone'}: ${m.description || ''}`;
  }).join('\n');

  return `You are a strict Code Compliance Auditor.

**Your Task:**
Analyze the provided code against the list of milestones below. Determine if the necessary logic, functions, classes, or API endpoints exist in the code to fulfill each specific milestone.

**Scoring Rules:**
- **Status:** Mark as "ACHIEVED" only if the feature is fully implemented. Mark as "NOT ACHIEVED" if it is missing or incomplete.
- **Percentage:** Estimate the level of completion (0 to 100) based on the presence of logic and UI elements.

**Output Constraints:**
- **Return ONLY a valid JSON array.** - Do NOT use Markdown formatting (no \`\`\`json blocks).
- Do NOT include explanations, reasoning, or introductory text.
- The output must follow this exact schema:
(array of json objects)
[
  {
    "milestone_name": "Name of the milestone",
    "status": "ACHIEVED" | "NOT ACHIEVED",
    "percentage_completed": 100
  }
]

---

**MILESTONES TO CHECK:**
${formattedMilestones}

---

**CODEBASE:**
${codebaseContent}
`;
};
