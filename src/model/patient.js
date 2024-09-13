const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      required: true,
      default: generatePatientId
    },
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true
    },
    email: {
      type: String
    },
    phone: {
      type: Number,
      required: [false, 'Please provide your phone number'],
      minLength: 10,
      maxLength: 10
    },
    appointmentTime: {
      type: Date,
      required: [true, 'Please provide an appointment time']
    },
    status: {
      type: String,
      enum: ['BOOKED', 'INPROGRESS', 'VISITED', 'CANCELLED'],
      default: 'BOOKED'
    },
    queuePosition: {
      type: Number,
      required: true
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    visitedAppointmentTime: {
      type: [Date],
      default: []
    },
    prescriptionUrl: {
      type: String,
      default: null
    },
    visitedPrescriptionUrls: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

function generatePatientId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `PT-${result}`;
}

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
