const mongoose = require('mongoose');

const CustomerFeedbackSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name']
    },
    beforeImage: {
      type: String
    },
    afterImage: {
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

const CustomerFeedback = mongoose.model(
  'CustomerFeedback',
  CustomerFeedbackSchema
);

module.exports = CustomerFeedback;
