const { pipeline } = require('@xenova/transformers');
const categoryKeywords = require('../data/categoryKeywords.json');
const EMBEDDINGS_ENABLED = process.env.ENABLE_EMBEDDINGS !== "false";

let embedder = null;
let categoryEmbeddings = null;

// Loads the MiniLM model once and caches it (downloads on first use, then cached locally)
async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function embedText(text, model) {
  const output = await model(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// Pre-computes one averaged embedding per category, based on its example phrases
async function getCategoryEmbeddings() {
  if (categoryEmbeddings) return categoryEmbeddings;

  const model = await getEmbedder();
  categoryEmbeddings = {};

  for (const [category, examples] of Object.entries(categoryKeywords)) {
    if (examples.length === 0) continue; // skip "Other", no examples to embed

    const vectors = await Promise.all(
      examples.map((example) => embedText(example, model))
    );

    // Average all example vectors into one representative vector per category
    const avgVector = vectors[0].map((_, i) =>
      vectors.reduce((sum, v) => sum + v[i], 0) / vectors.length
    );

    categoryEmbeddings[category] = avgVector;
  }

  return categoryEmbeddings;
}

// Falls back to embeddings-based matching only when keyword matching returns "Other"
async function categorizeWithEmbeddings(description) {
  if (!EMBEDDINGS_ENABLED) return "Other";

  const model = await getEmbedder();
  const catEmbeddings = await getCategoryEmbeddings();

  const descVector = await embedText(description, model);

  let bestCategory = "Other";
  let bestScore = 0.35; // minimum similarity threshold to accept a match

  for (const [category, vector] of Object.entries(catEmbeddings)) {
    const score = cosineSimilarity(descVector, vector);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

module.exports = categorizeWithEmbeddings;