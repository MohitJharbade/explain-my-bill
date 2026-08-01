const Groq = require('groq-sdk');
const { HfInference } = require('@huggingface/inference');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const hf = new HfInference(process.env.HF_API_KEY);

function buildPrompt(lineItems, question) {
  const basePrompt = `
You are a helpful assistant that explains hospital bill line items in plain, simple language for a patient.

Here is the confirmed, structured bill data (already reviewed and corrected by the user):
${JSON.stringify(lineItems, null, 2)}

Do not invent amounts or facts not present in the data.
`;

  const defaultInstruction = `
For each line item, briefly explain in plain English what it likely means and why it might be flagged (if it has flags). Then give a short 2-3 sentence overall summary of the bill.

Respond in this exact JSON format only, no other text:
{
  "itemExplanations": [
    { "description": "...", "explanation": "..." }
  ],
  "overallSummary": "..."
}
`;

  const customInstruction = `
The user specifically asked: "${question}"

Answer that question directly, using only the bill data above. Do not invent facts.

Respond in this exact JSON format only, no other text:
{
  "itemExplanations": [],
  "overallSummary": "your direct answer to the user's question here"
}
`;

  return basePrompt + (question ? customInstruction : defaultInstruction);
}

function parseModelResponse(raw) {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return { itemExplanations: [], overallSummary: raw };
  }
}

async function explainWithGroq(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
  });
  return completion.choices[0].message.content;
}

async function explainWithHuggingFace(prompt) {
  const response = await hf.chatCompletion({
    model: "mistralai/Mistral-7B-Instruct-v0.3",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.3,
  });
  return response.choices[0].message.content;
}

async function explainBill(lineItems, question = null) {
  const prompt = buildPrompt(lineItems, question);

  try {
    const raw = await explainWithGroq(prompt);
    return parseModelResponse(raw);
  } catch (groqErr) {
    console.error("Groq failed, falling back to Hugging Face:", groqErr.message);
    try {
      const raw = await explainWithHuggingFace(prompt);
      return parseModelResponse(raw);
    } catch (hfErr) {
      console.error("Hugging Face fallback also failed:", hfErr.message);
      throw new Error("Both LLM providers failed to generate an explanation");
    }
  }
}

module.exports = explainBill;