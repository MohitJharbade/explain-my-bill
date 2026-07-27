function parseLineItems(rawText) {
  const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);

  const numberedRowPattern = /^\d+\s*[|.]?\s+(.+?)\s+\d+\s+[\d,]+\.\d{2}\s+([\d,]+\.\d{2})$/;
  const simplePattern = /^(.+?)\s+\$?([\d,]+(?:\.\d{1,2})?)$/;

  // Lines that look like a charge but actually aren't (tax, totals, summaries)
  const excludeTerms = [
    "cgst",
    "sgst",
    "gst",
    "sub total",
    "subtotal",
    "total amount",
    "taxable amount",
    "discount",
    "amount in words",
  ];

  function isExcluded(description) {
    const lower = description.toLowerCase();
    return excludeTerms.some((term) => lower.includes(term));
  }

  function cleanDescription(description) {
    // Removes stray leading OCR noise like "Es ", "Le] ", single stray letters/brackets at the start
    return description.replace(/^[A-Za-z]{1,2}[\]\)\s]+(?=[A-Z])/, "").trim();
  }

  const items = [];

  lines.forEach((line) => {
    const numberedMatch = line.match(numberedRowPattern);
    if (numberedMatch) {
      const description = cleanDescription(numberedMatch[1].trim());
      const amount = parseFloat(numberedMatch[2].replace(/,/g, ""));
      if (!isExcluded(description)) {
        items.push({ description, amount });
      }
      return;
    }

    const simpleMatch = line.match(simplePattern);
    if (simpleMatch) {
      const description = cleanDescription(simpleMatch[1].trim());
      const amount = parseFloat(simpleMatch[2].replace(/,/g, ""));
      if (
        description.length > 3 &&
        !/^\d+$/.test(description) &&
        !isExcluded(description)
      ) {
        items.push({ description, amount });
      }
      return;
    }
  });

  return items;
}

module.exports = parseLineItems;