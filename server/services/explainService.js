const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function explainBill(lineItems, question = null) {
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

  const prompt = basePrompt + (question ? customInstruction : defaultInstruction);

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
  });

  const raw = completion.choices[0].message.content;

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    return { itemExplanations: [], overallSummary: raw };
  }
}

module.exports = explainBill;
