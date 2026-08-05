const { Queue } = require('bullmq');
const connection = require('./connection');

const billQueue = new Queue('bill-processing', { connection });

module.exports = billQueue;