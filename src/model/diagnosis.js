const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    question: { type: String },
    answer: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const otherOptionSchema = new mongoose.Schema(
  {
    label: { type: String },
    answer: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String },
    question: { type: String, required: true },
    answer: mongoose.Schema.Types.Mixed,
    followUp: [followUpSchema],
    otherOption: otherOptionSchema
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    sectionId: { type: String, required: true },
    sectionTitle: { type: String, required: true },
    questions: [questionSchema]
  },
  { _id: false }
);

const diagnosisSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    sections: [sectionSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
