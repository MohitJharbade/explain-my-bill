require('dotenv').config();
const { Worker } = require('bullmq');
const connection = require('./queue/connection');
const processBill = require('./services/processBill');

const worker = new Worker(
  'bill-processing',
  async (job) => {
    const { imageBase64, originalName } = job.data;
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    console.log(`Processing job ${job.id} (${originalName})...`);
    const result = await processBill(imageBuffer);
    console.log(`Job ${job.id} completed.`);

    return result; // this becomes the job's "return value", retrievable later
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} finished successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

console.log("Worker started, listening for bill-processing jobs...");

