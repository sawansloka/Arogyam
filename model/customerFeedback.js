const mongoose = require('mongoose');
const validator = require('validator');

const CustomerFeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name']
  },
  imageUrl: {
    type: String
  },
  desc: {
    type: String,
    required: true
  },
  isTestimonial: {
    type: Boolean,
    default: false
  },
  videoUrls: {
    type: [String]
  }
},
  {
    timestamps: true
  }
);

const CustomerFeedback = mongoose.model('CustomerFeedback', CustomerFeedbackSchema);

module.exports = CustomerFeedback;
