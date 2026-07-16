const vagueTerms = [
  "misc",
  "miscellaneous",
  "other charges",
  "general fee",
  "service charge",
  "additional charge",
  "supply fee",
];

function isVague(description) {
  const lowerDesc = description.toLowerCase();
  return vagueTerms.some((term) => lowerDesc.includes(term));
}

function normalizeForComparison(description) {
  return description.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function flagAnomalies(lineItems) {
  return lineItems.map((item, index) => {
    const flags = [];

    if (isVague(item.description)) {
      flags.push("Vague description");
    }

    const isDuplicate = lineItems.some((other, otherIndex) => {
      if (index === otherIndex) return false;

      const sameDescription =
        normalizeForComparison(other.description) ===
        normalizeForComparison(item.description);
      const sameAmount = other.amount === item.amount;
      const sameCategory = other.category === item.category;

      return sameDescription && sameAmount && sameCategory;
    });

    if (isDuplicate) {
      flags.push("Possible duplicate charge");
    }

    return { ...item, flags };
  });
}

module.exports = flagAnomalies;
