function parseLineItems(rawText) {
  const lines = rawText.split("\n").map((line) => line.trim()).filter(Boolean);

  const lineItemPattern = /^(.+?)\s+\$?(\d+(?:\.\d{1,2})?)$/;

  const items = [];

  lines.forEach((line) => {
    const match = line.match(lineItemPattern);
    if (match) {
      const description = match[1].trim();
      const amount = parseFloat(match[2]);
      items.push({ description, amount });
    }
  });

  return items;
}

module.exports = parseLineItems;