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

  // 1) Verify the security signature match using node crypto library
  const text = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return next(
      new AppError(
        'Payment verification failed! Invalid transaction signature.',
        400,
      ),
    );
  }

  // 2) Locate booking instance and set status to paid
  const booking = await Booking.findOneAndUpdate(
    { razorpayOrderId: razorpay_order_id },
    {
      paymentStatus: 'paid',
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    },
    { new: true, runValidators: true },
  );

  if (!booking) {
    return next(
      new AppError(
        'No booking found matching this transaction identification order.',
        404,
      ),
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Payment verified and booking confirmed!',
    booking,
  });
});
