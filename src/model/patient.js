const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
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
      enum: ['Booked', 'Visited', 'Cancelled'],
      default: 'Booked'
    },
    queuePosition: {
      type: Number,
      required: true
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
