import axios from 'axios';

// Configuration for local Ollama instance
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5-coder:latest'; // Ensure this matches your local model name

export const processBillText = async (ocrText) => {
  const prompt = `
    You are an intelligent data extraction assistantvb. 
    Analyze the following text extracted from a bill/receipt:
    
    "${ocrText}"

    Tasks:
    1. Extract Company Details [the company who produced the bill]  (Name, full address, phone number).
    2. Extract the Itemized List of products/services (Item Name, Price).

    Output Requirements:
    - Return ONLY a raw JSON object. Do not include markdown formatting or explanations.
    - Use the following structure:
    {
      "companyDetails": {
        "name": "string (or null if not found)",
        "address": "string (or null if not found)",
        "phoneNumber": "string (or null if not found)"
      },
      "items": [
        { "name": "string", "price": "number (or string if currency symbol included)" }
      ]
    }
  `;

  try {
    const response = await axios.post(OLLAMA_API_URL, {
      model: MODEL_NAME,
      prompt: prompt,
      format: "json", // Forces Qwen to output valid JSON
      stream: false
    });

    // Handle Ollama's response format
    const responseData = response.data.response;
    return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;

  } catch (error) {
    console.error("Ollama Service Error:", error.response?.data || error.message);
    throw new Error("Failed to process text with Qwen model.");
  }
};

export const generateVerificationPrompt = async (billData) => {
  const prompt = `
    You are an expert conversational designer. 
    Create a system prompt for a multilingual voice assistant named "bob".
    
    Context:
    The assistant is verifying a bill/receipt that was submitted by a user.so you are now auditing the bill by calling the company from whome the bill originated from
    The extracted data from the bill is:
    ${JSON.stringify(billData)}

    Your Goal:
    Generate a complete system prompt (like the sample provided below) that instructs the AI on how to conduct this specific verification conversation.
    sample prompt [to be used as reference only]:
You are AgroSathi, a multilingual voice assistant designed to help farmers share accurate details about their crops for selling.
Your primary purpose is to ask clear, structured questions about crops, re-ask when responses are unclear, and produce a clean summary of all answers for buyers.
If farmers go off topic repeatedly, you politely redirect them and end the conversation after three such attempts.

Voice & Persona

Personality

Supportive, neutral, and respectful
Patient and encouraging
Professional but warm, never rushed

Speech Characteristics
language: hindi, marathi, tamil

Clear, simple phrasing (avoid technical jargon)
Comfortable pace, allowing farmers to respond fully
Occasional acknowledgments (“I understand”, “Thank you for sharing that”)
Neutral tone—never judgmental about answers

Conversation Flow

1. Introduction & Opt-In
You always start the conversation in hindi
AgroSathi [in Hindi language]:
“Hello, I am your AgroSathi.i wanted some details about your crop .

If hesitant:
“I understand your time is important. These questions are short, and your answers will help us present your crop to buyers. Would you like to continue?”


3. Question Structure & Flow
Core Crop Questions

“Which crop are you selling?”

“Which variety is it?”

“How much have you harvested?”

“When was the crop sown?”

“When was the crop harvested?”

“How long will the crop remain fresh or usable?”

“How would you grade your crop?”

“Do you have any certification for this crop?”

“Do you have any lab test results for this crop?”

“At what price would you like to sell your crop?”

Response Handling

If unclear or off-topic:
“I didn’t quite understand. Could you please repeat or clarify?”

If repeatedly off-topic (>3 times):
“I am only able to ask questions about your crop. Since we are not able to continue, I will end the conversation here. Thank you for your time.”

4. Response Handling Rules

Numeric answers (e.g., harvest quantity, price):
Confirm with farmer if units are missing or unclear.

Dates (sowing, harvesting):
Clarify if season or approximate date is given.

Yes/No with details (certifications, lab reports):
If “yes,” politely ask: “Could you please mention which certification/test?”

Acknowledgments:
Always confirm understanding: “Thank you, I’ve recorded that you harvested [amount].”

5. Closing & Wrap-Up

Final thoughts:
“Those are all my questions. Is there anything else about your crop you would like to share with buyers?”

Thank you:
“Thank you for your time. Your answers will help us connect you with buyers.”

Goodbye:
“Your crop details have been recorded. We will now prepare the information for selling. Have a good day!”

Special Scenarios

Very short answer:
“Could you tell me a bit more about that?”

Overly long/off-topic answer:
“I understand, thank you. Let’s move to the next question about your crop.”

Repeated off-topic:
Politely end the call after three instances.

Unclear or background noise:
“I didn’t catch that clearly. Could you please repeat?”
    The generated prompt must follow this structure and logic:
    
    1.  **Voice & Persona**: Supportive, neutral, respectful, patient. Languages: Hindi, Marathi, Tamil.
    2.  **Introduction**: Start in English. Introduce as bob.
    3.  **Question Structure & Flow**:
        *   **Verify Company**: Ask "Is this [Company Name]?" (Use the name from data: "${billData.companyDetails?.name || 'this shop'}").
        *   **Verify Items**: If the user confirms the company, proceed to ask about the items.
        * no need to verify the phone number and address
        *   For each item in the list: Ask "What is the cost of [Item Name]?" ${billData.items || 'from the bill'}".
    4.  **Response Handling**: Handle confirmed/corrected answers.
    5.  **Closing**: Thank the user.

    **Sample Style (Use this tone/structure but adapted for Bill Verification):**
    "You are bob, a multilingual voice assistant...
    ...
    Core Questions:
    - Which crop are you selling? (REPLACE with Bill Questions)
    ..."

    **Output:**
    Return ONLY the generated system prompt text. Do not include any introductory text like "Here is the prompt and \n".
  `;

  try {
    const response = await axios.post(OLLAMA_API_URL, {
      model: MODEL_NAME,
      prompt: prompt,
      stream: false
      
    });
console.debug("Ollama Prompt Generation Response:", response.data);
    return response.data.response;
  } catch (error) {
    console.error("Ollama Prompt Generation Error:", error.response?.data || error.message);
    throw new Error("Failed to generate verification prompt.");
  }
};

export const analyzeDispute = async (chatTranscript, user1, user2) => {
  const prompt = `
    You are an impartial dispute resolution AI.
    Analyze the following chat transcript between two parties${user1 && user2 ? ` (${user1} and ${user2})` : ''} involved in a contract dispute.
    Determine who won the dispute based on the conversation, evidence presented, and agreement reached (if any).
    YOUR CORE PRINCIPLES:
1. STRICT TEXTUALISM: You judge purely based on the "Original Scope" text provided.
2. NO IMPLIED WARRANTIES: Do NOT assume "industry standards," "modern expectations," or "common sense" unless explicitly written in the scope. If the contract says "build a box," and the box doesn't have a lid, but the contract didn't ask for a lid, the Freelancer wins.
3. ANTI-SCOPE-CREEP: Watch for Clients asking for features (like "Mobile Responsiveness", "SEO", "Hosting") that were not in the initial text. This is "Scope Creep."
4. IMPARTIALITY: Do not side with the Client just because they are paying.

YOUR TASK:
Analyze the dispute below. If the Deliverable matches the "Original Scope" text description strictly, rule in favor of the Freelancer, even if the result is not "market ready."
    Chat Transcript:
    "${chatTranscript}"

    Output Requirements:
    - You must decide on a single winner.
    and also provide a resoning for your decision.
    - Return ONLY a raw JSON object.
    - Structure:
    {
      "winner": "string (name or role of the winner)",
      "confidence": "number (0-1)",
      "reasoning": "string (brief explanation)"
    }
  `;

  try {
    const response = await axios.post(OLLAMA_API_URL, {
      model: MODEL_NAME,
      prompt: prompt,
      format: "json",
      stream: false
    });

    const responseData = response.data.response;
    return typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
  } catch (error) {
    console.error("Dispute Analysis Error:", error.response?.data || error.message);
    throw new Error("Failed to analyze dispute.");
  }
};
