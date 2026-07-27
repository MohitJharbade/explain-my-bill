const sharp = require('sharp');

async function preprocessImage(buffer) {
  try {
    const processed = await sharp(buffer)
      .rotate()               // auto-rotates based on EXIF orientation data
      .grayscale()             // removes color noise, helps OCR focus on text
      .normalize()              // stretches contrast so faint text becomes clearer
      .sharpen()                // slightly sharpens edges of text
      .toBuffer();

    return processed;
  } catch (err) {
    console.error("Image preprocessing failed, using original buffer:", err.message);
    return buffer; // fail-safe: if preprocessing errors out, fall back to original image
  }
}

module.exports = preprocessImage;