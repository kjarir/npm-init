export const generateMetaPrompt = (billData) => {
  const { companyDetails, items } = billData;
  const companyName = companyDetails?.name || "the vendor";

  // We embed the specific items into the instruction so Qwen knows exactly what to write
  return `
    **Role:** You are an expert AI Prompt Engineer. 
    **Task:** Write a "System Prompt" for a Voice Calling Agent named 'Bill'.
    **Goal:** The Agent must verify a specific invoice from "${companyName}".

    **Input Data to Verify:**
    Company: ${companyName}
    Items List: ${JSON.stringify(items)}

    **Instructions for the Output Prompt:**
    1.  **Persona:** Use the exact same persona rules as the "Farmer Assistant" sample (Polite, Neutral, Multilingual support).
    2.  **Introduction:** The agent must introduce itself and state it is verifying a bill.
    3.  **Verification Step 1 (Company):** - The generated prompt must explicitly instruct the agent to ask: "Is this bill from ${companyName}?"
        - If the user says "No", the agent must ask for the correct name.
    4.  **Verification Step 2 (Item Iteration):** - For EACH item in the 'Items List' provided above, the generated prompt must contain a specific instruction to ask: "What is the cost of [Item Name]?"
        - The prompt must tell the agent to compare the user's spoken answer with the known price [Item Price].
    5.  **Validation Logic:** - If the user's answer matches the known price, the agent should acknowledge it.
        - If the answer is different, the agent should ask for clarification.

    **Output Format:** - Return ONLY the generated System Prompt text. 
    - Do not include explanations or markdown outside the prompt.
    - The output should be ready to copy-paste into a Voice AI configuration.
  `;
};