export const queryOllama = async (model, prompt) => {
  try {
    // Ensure the URL ends with /api/generate in Vercel env vars, or handle it here
    const apiUrl = process.env.OLLAMA_API_URL; 

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" // <--- CRITICAL FIX FOR NGROK
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 16384
        }
      }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama API Error: ${response.statusText} (${errText})`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Ollama Service Error:", error);
    throw error;
  }
};