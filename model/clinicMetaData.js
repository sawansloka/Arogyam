const mongoose = require('mongoose');
const validator = require('validator');

const clinicMetaDataSchema = new mongoose.Schema(
  {
    bannerUrl: {
      type: String,
      required: true,
      validate: [validator.isURL, 'Invalid URL format']
    },
    desc: {
      title: {
        type: String,
        required: [true, 'Title is required']
      },
      body: {
        type: [String],
        required: [true, 'Body is required'],
        validate: {
          validator: function (value) {
            return value.length > 0 && value.every((str) => str.length <= 30);
          },
          message:
            'Each item in the body must be 30 characters or fewer and the array must not be empty.'
        }
      }
    },
    faqs: [
      {
        question: {
          type: String,
          required: [true, 'Question is required']
        },
        answer: {
          type: String,
          required: [true, 'Answer is required']
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

const ClinicMetaData = mongoose.model('ClinicMetaData', clinicMetaDataSchema);

module.exports = ClinicMetaData;
