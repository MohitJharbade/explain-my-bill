const Tesseract = require('tesseract.js');
const parseLineItems = require('./parseLineItems');
const categorizeLineItems = require('./categorize');
const flagAnomalies = require('./flagAnomalies');

async function processBill(imageBuffer) {
  const result = await Tesseract.recognize(imageBuffer, "eng");
  const rawText = result.data.text;
  const parsedItems = parseLineItems(rawText);
  const categorizedItems = await categorizeLineItems(parsedItems);
  const lineItems = flagAnomalies(categorizedItems);

  return { rawText, lineItems };
}

module.exports = processBill;
