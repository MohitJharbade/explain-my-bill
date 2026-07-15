const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const Tesseract = require('tesseract.js');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max, adjust later if needed
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is reachable" });
});


app.post("/api/upload", upload.single("bill"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const result = await Tesseract.recognize(req.file.buffer, "eng");

    res.json({
      message: "OCR completed",
      originalName: req.file.originalname,
      extractedText: result.data.text,
    });
  } catch (err) {
    console.error("OCR error:", err.message);
    res.status(500).json({ error: "OCR processing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
