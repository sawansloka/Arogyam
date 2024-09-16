const mongoose = require('mongoose');

const clinicMetaDataSchema = new mongoose.Schema(
  {
    bannerUrl: {
      type: String,
      required: [true, 'Banner filename is required']
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
          validator(value) {
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
    ],
    schedule: {
      isCronJobEnabled: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        required: true,
        default: '09:00',
        validate: {
          validator: (value) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value),
          message: 'Invalid time format, expected HH:mm'
        }
      },
      endTime: {
        type: String,
        required: true,
        default: '17:00',
        validate: {
          validator: (value) => /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value),
          message: 'Invalid time format, expected HH:mm'
        }
      },
      breakTime: [
        {
          start: {
            type: String,
            required: true,
            default: '12:00',
            validate: {
              validator: (value) =>
                /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value),
              message: 'Invalid time format for break start, expected HH:mm'
            }
          },
          end: {
            type: String,
            required: true,
            default: '13:00',
            validate: {
              validator: (value) =>
                /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(value),
              message: 'Invalid time format for break end, expected HH:mm'
            }
          }
        }
      ],
      maxSlots: {
        type: Number,
        required: true,
        default: 3,
        validate: {
          validator: Number.isInteger,
          message: 'Max slots must be an integer'
        }
      }
    }
  },
  {
    timestamps: true
  }
);

const ClinicMetaData = mongoose.model('ClinicMetaData', clinicMetaDataSchema);

module.exports = ClinicMetaData;
