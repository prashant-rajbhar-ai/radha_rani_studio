const Razorpay = require('razorpay');
const crypto = require('crypto');
const Package = require('../models/packageModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  ADVANCE_PERCENTAGE,
  ONLINE_HOLD_MINUTES,
  roundMoney,
  calculateAdvance,
  normalizeEventDate,
  normalizeEventLocation,
  ensureEventDateAvailable,
  isDuplicateDateError,
} = require('../utils/bookingService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = catchAsync(async (req, res, next) => {
  const pkg = await Package.findById(req.params.packageId);
  if (!pkg) return next(new AppError('No package found with that ID.', 404));

  const { eventDateKey, eventDate } = normalizeEventDate(req.body.eventDate);
  const eventLocation = normalizeEventLocation(req.body.eventLocation);
  if (req.body.advancePolicyAccepted !== true) {
    return next(new AppError('Please accept the 20% advance and cancellation policy before continuing.', 400));
  }

  await ensureEventDateAvailable(eventDateKey);

  const packagePrice = roundMoney(pkg.price);
  const advanceAmount = calculateAdvance(packagePrice);
  const balanceDue = roundMoney(packagePrice - advanceAmount);
  const reservationExpiresAt = new Date(Date.now() + ONLINE_HOLD_MINUTES * 60 * 1000);

  let booking;
  try {
    booking = await Booking.create({
      package: pkg._id,
      user: req.user.id,
      createdBy: req.user.id,
      bookingSource: 'online',
      price: packagePrice,
      advancePercentage: ADVANCE_PERCENTAGE,
      advanceAmount,
      amountPaid: 0,
      balanceDue: packagePrice,
      eventDate,
      eventDateKey,
      reservationExpiresAt,
      eventLocation,
      paymentStatus: 'pending',
      policyAcceptedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return next(new AppError('This event date has just been reserved by another customer. Please choose another date.', 409));
    }
    throw error;
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(advanceAmount * 100),
      currency: 'INR',
      receipt: `rrs_${String(booking._id).slice(-16)}`,
      notes: {
        bookingId: String(booking._id),
        bookingSource: 'online',
        advancePercentage: String(ADVANCE_PERCENTAGE),
      },
    });

    booking.razorpayOrderId = order.id;
    await booking.save();

    return res.status(201).json({
      status: 'success',
      key_id: process.env.RAZORPAY_KEY_ID,
      order,
      booking,
      payment: {
        packagePrice,
        advancePercentage: ADVANCE_PERCENTAGE,
        advanceAmount,
        balanceDue,
        holdMinutes: ONLINE_HOLD_MINUTES,
      },
    });
  } catch (error) {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'failed' }, $unset: { eventDateKey: '', reservationExpiresAt: '' } },
    );
    throw error;
  }
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new AppError('Please provide all required payment details.', 400));
  }
  if (!/^[a-f0-9]{64}$/i.test(String(razorpay_signature))) {
    return next(new AppError('Payment verification failed. Invalid transaction signature.', 400));
  }

  const signedPayload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(signedPayload)
    .digest('hex');
  const expected = Buffer.from(generatedSignature, 'hex');
  const received = Buffer.from(razorpay_signature, 'hex');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return next(new AppError('Payment verification failed. Invalid transaction signature.', 400));
  }

  const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id, user: req.user.id });
  if (!booking) return next(new AppError('No booking found for this transaction and user.', 404));

  // Make repeated Razorpay callbacks idempotent for the same payment.
  if (booking.razorpayPaymentId === razorpay_payment_id && booking.paymentStatus === 'partially_paid') {
    return res.status(200).json({ status: 'success', message: 'Booking advance was already verified.', booking });
  }
  if (booking.paymentStatus !== 'pending') {
    return next(new AppError('This booking is no longer awaiting its advance payment. Please contact the studio if money was debited.', 409));
  }

  if (booking.reservationExpiresAt && booking.reservationExpiresAt <= new Date()) {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'failed' }, $unset: { eventDateKey: '', reservationExpiresAt: '' } },
    );
    return next(new AppError('The temporary date hold expired before payment verification. Please contact Radha Rani Studio immediately with your Razorpay payment ID.', 409));
  }

  // Historical pending orders created before the 20% policy stored a full-price
  // Razorpay order. Keep those legacy orders verifiable without changing their amount.
  const isLegacyFullPayment = !Number.isFinite(Number(booking.advanceAmount)) || Number(booking.advanceAmount) <= 0;
  const amountReceived = isLegacyFullPayment ? roundMoney(booking.price) : roundMoney(booking.advanceAmount);
  booking.amountPaid = amountReceived;
  booking.balanceDue = roundMoney(Math.max(booking.price - amountReceived, 0));
  booking.paymentStatus = booking.balanceDue <= 0 ? 'paid' : 'partially_paid';
  booking.paymentEntries.push({
    amount: amountReceived,
    method: 'razorpay',
    referenceId: razorpay_payment_id,
    paidAt: new Date(),
    note: isLegacyFullPayment ? 'Legacy full package payment received through Razorpay.' : `${ADVANCE_PERCENTAGE}% booking advance received through Razorpay.`,
  });
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.reservationExpiresAt = undefined;
  await booking.save();

  res.status(200).json({
    status: 'success',
    message: 'Booking advance verified. Your event date is reserved.',
    booking,
  });
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', results: bookings.length, data: { bookings } });
});
