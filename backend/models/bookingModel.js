const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.ObjectId,
      ref: 'Package',
      required: [true, 'A booking must belong to a Package!']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A booking must belong to a User!']
    },
    price: {
      type: Number,
      require: [true, 'A booking must have a price.']
    },
    eventDate: {
      type: Date,
      required: [true, 'Please provide the date of the event']
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    razorpayOrderId: {
      type: String,
      required: true
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// QUERY MIDDLEWARE: Automatically populate the user and package details
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email'
  }).populate({
    path: 'package',
    select: 'name price imageCover'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;