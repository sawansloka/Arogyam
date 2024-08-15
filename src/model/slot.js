const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  breakTime: [
    {
      start: {
        type: String,
        required: true
      },
      end: {
        type: String,
        required: true
      }
    }
  ],
  maxSlots: {
    type: Number,
    required: true,
    default: 3
  },
  appointmentIds: [
    {
      appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
      }
    }
  ]
});

const Slot = mongoose.model('Slot', slotSchema);
module.exports = Slot;
