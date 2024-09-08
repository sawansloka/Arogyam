const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  patient: {
    patientId: { type: String, required: true },
    name: { type: String },
    phone: { type: Number },
    gender: { type: String },
    age: { type: Number },
    weight: { type: Number },
    height: { type: Number },
    bmi: { type: Number },
    bp: { type: Number },
    address: { type: String }
  },
  diagnosis: {
    type: [String],
    default: []
  },
  complaints: {
    type: [String],
    default: []
  },
  findings: {
    type: [String],
    default: []
  },
  prescriptionItems: [
    {
      drugName: { type: String, required: true, trim: true },
      potency: { type: String, required: true, trim: true },
      dosage: { type: String, required: true, trim: true },
      repetition: { type: String, trim: true },
      qty: { type: Number, min: 1, required: true },
      period: { type: String, trim: true },
      remarks: { type: String, trim: true }
    }
  ],
  advice: {
    type: [String],
    default: []
  },
  followUpDate: {
    type: Date
  },
  createdDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
