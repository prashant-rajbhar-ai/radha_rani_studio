const Razorpay = require('razorpay');
const crypto = require('crypto');
const Package = require('./../models/packageModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// Initialize Razorpay Instance with credentials from your secure locker
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = catchAsync(async (req, res, next) => {
  // 1) Find the photography package being booked
  const pkg = await Package.findById(req.params.packageId);
  if (!pkg) {
    return next(new AppError('No package found with that ID', 404));
  }

  // 2) Validate the selected event date from body
  const { eventDate } = req.body;
  if (!eventDate) {
    return next(
      new AppError('Please provide an event date for your booking.', 400),
    );
  }

  // Event addresses are stored on each booking (not on the customer profile).
  // This studio currently accepts event locations in India only.
  const submittedLocation = req.body.eventLocation;
  if (!submittedLocation || typeof submittedLocation !== 'object' || Array.isArray(submittedLocation)) {
    return next(new AppError('Please provide the event venue address.', 400));
  }

  const fieldLimits = {
    venueName: 120,
    addressLine: 200,
    locality: 100,
    district: 100,
    state: 100,
  };
  const eventLocation = {};
  for (const [field, maxLength] of Object.entries(fieldLimits)) {
    const value = String(submittedLocation[field] || '').trim();
    if (!value) {
      const labels = {
        venueName: 'the venue name',
        addressLine: 'the full event address',
        locality: 'the village, town or locality',
        district: 'the district',
        state: 'the state or union territory',
      };
      return next(new AppError(`Please provide ${labels[field]}.`, 400));
    }
    if (value.length > maxLength) {
      return next(new AppError(`The ${field} is too long. Please shorten it and try again.`, 400));
    }
    eventLocation[field] = value;
  }

  const indianStatesAndUnionTerritories = new Set([
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya',
    'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim',
    'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand',
    'west bengal', 'andaman and nicobar islands', 'chandigarh',
    'dadra and nagar haveli and daman and diu', 'delhi', 'jammu and kashmir',
    'ladakh', 'lakshadweep', 'puducherry',
  ]);
  if (!indianStatesAndUnionTerritories.has(eventLocation.state.toLowerCase())) {
    return next(new AppError('Please select a valid Indian state or union territory.', 400));
  }

  const pinCode = String(submittedLocation.pinCode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pinCode)) {
    return next(new AppError('Please provide a valid 6-digit Indian PIN code.', 400));
  }
  eventLocation.pinCode = pinCode;
  eventLocation.landmark = String(submittedLocation.landmark || '').trim().slice(0, 120);
  eventLocation.country = 'India';

  // 3) Define Razorpay order criteria (Amount must be in paise: ₹1 = 100 paise)
  const options = {
    amount: pkg.price * 100,
    currency: 'INR',
    receipt: `receipt_order_${Date.now()}`,
  };

  const order = await razorpay.orders.create(options);

  // 4) Write a pending Booking record into MongoDB Atlas
  const newBooking = await Booking.create({
    package: pkg._id,
    user: req.user.id,
    price: pkg.price,
    eventDate,
    eventLocation,
    razorpayOrderId: order.id,
    paymentStatus: 'pending',
  });

  // 5) Return order tracking metadata and public key safely to frontend
  res.status(200).json({
    status: 'success',
    key_id: process.env.RAZORPAY_KEY_ID,
    order,
    booking: newBooking,
  });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // 1. Validate that all required payment fields are present
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(
      new AppError('Please provide all required payment details.', 400),
    );
  }

  // 2. Verify the Razorpay payment signature
  const text = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  // Use a timing-safe comparison for signatures
  const expected = Buffer.from(generatedSignature, 'hex');
  const received = Buffer.from(razorpay_signature, 'hex');

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return next(
      new AppError(
        'Payment verification failed! Invalid transaction signature.',
        400,
      ),
    );
  }

  // 3. Find the booking belonging to the authenticated user
  const booking = await Booking.findOne({
    razorpayOrderId: razorpay_order_id,
    user: req.user.id,
  });

  if (!booking) {
    return next(
      new AppError('No booking found for this transaction and user.', 404),
    );
  }

  // 4. Prevent the same booking from being marked paid twice
  if (booking.paymentStatus === 'paid') {
    return next(new AppError('This booking has already been paid.', 409));
  }

  // 5. Save the verified payment details
  booking.paymentStatus = 'paid';
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;

  await booking.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment verified and booking confirmed!',
    booking,
  });
});


exports.getMyBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings,
    },
  });
});
