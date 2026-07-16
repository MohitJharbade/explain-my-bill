const categoryKeywords = require('../data/categoryKeywords.json');

function categorize(description) {
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

function categorizeLineItems(lineItems) {
  return lineItems.map((item) => ({
    ...item,
    category: categorize(item.description),
  }));
}

module.exports = categorizeLineItems;