require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const parseLineItems = require('./services/parseLineItems');
const categorizeLineItems = require('./services/categorize');
const flagAnomalies = require('./services/flagAnomalies');
const explainBill = require('./services/explainService');
const rateLimit = require('express-rate-limit');
const preprocessImage = require('./services/imagePreprocess');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per window
  message: { error: "Too many requests, please try again later." },
});

app.use(limiter);

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
    const rawText = result.data.text;
    const parsedItems = parseLineItems(rawText);
    const categorizedItems = await categorizeLineItems(parsedItems);
    const lineItems = flagAnomalies(categorizedItems);
    res.json({
      message: "OCR + parsing + categorization + flagging completed",
      originalName: req.file.originalname,
      rawText,
      lineItems,
    });
  } catch (err) {
    console.error("OCR error:", err.message);
    res.status(500).json({ error: "OCR processing failed" });
  }
});

app.post("/api/explain", express.json(), async (req, res) => {
  const { lineItems, question } = req.body;

  if (!lineItems || !Array.isArray(lineItems)) {
    return res.status(400).json({ error: "lineItems array is required" });
  }

  try {
    const explanation = await explainBill(lineItems, question || null);
    res.json(explanation);
  } catch (err) {
    console.error("Explain error:", err.message);
    res.status(500).json({ error: "Failed to generate explanation" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


