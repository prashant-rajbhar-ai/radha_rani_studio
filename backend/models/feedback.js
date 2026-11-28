const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: 100,
    },
    locationLabel: {
      type: String,
      required: [true, 'City or location is required'],
      trim: true,
      maxlength: 100,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    quote: {
      type: String,
      required: [true, 'Feedback message is required'],
      trim: true,
      maxlength: 600,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Feedback', feedbackSchema);
