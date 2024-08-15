const mongoose = require('mongoose');
const validator = require('validator');

const customerSchema = new mongoose.Schema(
  {
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
      deafult: false
    }
  },
  {
    timestamps: true
  }
);

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
