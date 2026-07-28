const categoryKeywords = require('../data/categoryKeywords.json');
const categorizeWithEmbeddings = require('./embeddingsCategorize');

function keywordCategorize(description) {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return "Other";
}

async function categorizeLineItems(lineItems) {
  const results = [];

  for (const item of lineItems) {
    let category = keywordCategorize(item.description);

    // Only fall back to embeddings if keyword matching found nothing
    if (category === "Other") {
      try {
        category = await categorizeWithEmbeddings(item.description);
      } catch (err) {
        console.error("Embeddings categorization failed, keeping 'Other':", err.message);
        category = "Other";
      }
    }

    results.push({ ...item, category });
  }

  return results;
}

module.exports = categorizeLineItems;