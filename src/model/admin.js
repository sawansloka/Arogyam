const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecretKey } = require('../config/vars');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name']
    },
    email: {
      type: String,
      unique: true,
      required: [true, 'Please provide your email address'],
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Please provide a valid Email');
        }
      }
    },
    password: {
      type: String,
      required: [false, 'Please provide password'],
      minLength: 8,
      trim: true
    },
    phone: {
      type: Number,
      required: [false, 'Please provide your phone number'],
      minLength: 10,
      maxLength: 10
    },
    tokens: [
      {
        token: {
          type: String,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

adminSchema.methods.toJSON = function () {
  const user = this;

  const userObject = user.toObject();
  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

adminSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id }, jwtSecretKey, { expiresIn: '2h' });
  user.tokens = user.tokens.concat({ token });
  await user.save();
  return token;
};

adminSchema.statics.findByCredentials = async (email, password) => {
  const user = await Admin.findOne({ email });
  if (!user) {
    throw new Error('Unable to login');
  }

  if (password) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Unable to login');
    }
  }

  return user;
};

adminSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
