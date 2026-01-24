export const GENERATE_DESCRIPTION_PROMPT = (title) => `
  Act as a professional Project Manager.
  Write a detailed, professional project description for a freelance project titled: "${title}".
  The description should be clear, concise, and outline the high-level goals.
  Do not include greetings or placeholders. Just the description text.
`;

export const GENERATE_MILESTONES_PROMPT = (title, description, count, budget) => `
  Act as a Senior Technical Architect.
  Break down the project "${title}" into exactly ${count} distinct milestones.
  The project description is: "${description}".
  The total budget is $${budget}.

  Rules:
  1. Return ONLY a valid JSON array. Do not wrap it in markdown code blocks.
  2. Each object in the array must have these keys: "id", "title", "description", "amount".
  3. "id" must be a sequential number starting from 1.
  4. The sum of "amount" for all milestones must equal exactly ${budget}.
  5. Milestones should be logical steps (e.g., "Setup & Design", "Core Development", "Testing & Deployment").
`;