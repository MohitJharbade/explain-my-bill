const sharp = require('sharp');

async function preprocessImage(buffer) {
  try {
    const processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1000, withoutEnlargement: true }) // caps max size, cuts memory use a lot
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();

    return processed;
  } catch (err) {
    console.error("Image preprocessing failed, using original buffer:", err.message);
    return buffer;
  }
}

module.exports = preprocessImage;