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
const billQueue = require('./queue/billQueue');

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
    const imageBase64 = req.file.buffer.toString('base64');

    const job = await billQueue.add('process-bill', {
      imageBase64,
      originalName: req.file.originalname,
    });

    res.json({
      message: "Bill queued for processing",
      jobId: job.id,
    });
  } catch (err) {
    console.error("Queue error:", err.message);
    res.status(500).json({ error: "Failed to queue bill for processing" });
  }
});


app.get("/api/status/:jobId", async (req, res) => {
  try {
    const job = await billQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({
        status: "completed",
        result: job.returnvalue,
      });
    }

    if (state === "failed") {
      return res.json({
        status: "failed",
        error: job.failedReason,
      });
    }

    return res.json({ status: state }); // e.g. "waiting", "active", "delayed"
  } catch (err) {
    console.error("Status check error:", err.message);
    res.status(500).json({ error: "Failed to check job status" });
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


