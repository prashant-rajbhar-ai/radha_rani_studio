const mongoose = require('mongoose');

const eventLocationSchema = new mongoose.Schema(
  {
    venueName: {
      type: String,
      required: [true, 'Please provide the venue or event location name.'],
      trim: true,
      maxlength: 120,
    },
    addressLine: {
      type: String,
      required: [true, 'Please provide the full event address.'],
      trim: true,
      maxlength: 200,
    },
    locality: {
      type: String,
      required: [true, 'Please provide the village, town or locality.'],
      trim: true,
      maxlength: 100,
    },
    district: {
      type: String,
      required: [true, 'Please provide the district.'],
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: [true, 'Please select the state or union territory.'],
      trim: true,
      maxlength: 100,
    },
    pinCode: {
      type: String,
      required: [true, 'Please provide the 6-digit Indian PIN code.'],
      trim: true,
      match: [/^[1-9]\d{5}$/, 'Please provide a valid 6-digit Indian PIN code.'],
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    country: {
      type: String,
      enum: ['India'],
      default: 'India',
      required: true,
    },
  },
  { _id: false },
);

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
    // Optional for backward compatibility with bookings created before address capture.
    // The create-order controller requires this for every new booking.
    eventLocation: {
      type: eventLocationSchema,
      default: undefined,
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
    select: 'name email phoneNumber'
  }).populate({
    path: 'package',
    select: 'name price imageCover'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;