const mongoose = require('mongoose');
const validator = require('validator');

const transactionSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true
    },
    transactionStatus: {
      type: String,
      enum: ['REQUESTED', 'SUCCESS', 'FAILED', 'PENDING'],
      default: REQUESTED,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
