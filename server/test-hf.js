require('dotenv').config();
const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_API_KEY);

const testPrompt = `
You are a helpful assistant that explains hospital bill line items in plain, simple language for a patient.

Here is the confirmed, structured bill data (already reviewed and corrected by the user):
[{"description":"Blood Test","amount":85.5,"category":"Diagnostic Tests","flags":[]}]

Do not invent amounts or facts not present in the data.

For each line item, briefly explain in plain English what it likely means and why it might be flagged (if it has flags). Then give a short 2-3 sentence overall summary of the bill.

Respond in this exact JSON format only, no other text:
{
  "itemExplanations": [
    { "description": "...", "explanation": "..." }
  ],
  "overallSummary": "..."
}
`;

async function test() {
  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [{ role: "user", content: testPrompt }],
      max_tokens: 800,
      temperature: 0.3,
    });
    console.log("SUCCESS:", response.choices[0].message.content);
  } catch (err) {
    console.log("FULL ERROR OBJECT:");
    console.log(err);
  }
}

test();