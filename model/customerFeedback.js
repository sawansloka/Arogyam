const mongoose = require('mongoose');
const validator = require('validator');

const customerFeedbackSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide your name"],
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
}, {
    timestamps: true
});

const Customer = mongoose.model('Customer', customerFeedbackSchema);

module.exports = Customer;
