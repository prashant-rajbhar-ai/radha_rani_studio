const Razorpay = require('razorpay');
const crypto = require('crypto');
const Package = require('../models/packageModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendBookingReceiptEmail = require('../utils/receiptEmailService');
const sendBookingReceiptWhatsapp = require('../utils/receiptWhatsappService');
const generateReceiptPdf = require('../utils/receiptPdf');
const { evaluateTravelForLocation } = require('../utils/travelPricingService');
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

async function sendAndTrackReceiptEmail(booking) {
  try {
    const result = await sendBookingReceiptEmail(booking);
    const update = {
      receiptEmailStatus: result.sent ? 'sent' : 'no_email',
      receiptEmailLastError: '',
    };
    if (result.sent) update.receiptEmailSentAt = new Date();

    Object.assign(booking, update);
    await Booking.updateOne({ _id: booking._id }, { $set: update });
    return result;
  } catch (error) {
    const update = {
      receiptEmailStatus: 'failed',
      receiptEmailLastError: String(
        error.message || 'Email delivery failed',
      ).slice(0, 300),
    };
    Object.assign(booking, update);
    await Booking.updateOne({ _id: booking._id }, { $set: update });
    console.error(
      `Receipt email failed for booking ${booking._id}:`,
      error.message,
    );
    return { sent: false, reason: 'email_failed' };
  }
}

async function sendAndTrackReceiptWhatsapp(booking) {
  try {
    const result = await sendBookingReceiptWhatsapp(booking);
    const status = result.sent
      ? 'sent'
      : ['disabled', 'no_phone'].includes(result.reason)
        ? result.reason
        : 'failed';
    const update = {
      receiptWhatsappStatus: status,
      receiptWhatsappLastError: '',
    };
    if (result.sent) {
      update.receiptWhatsappSentAt = new Date();
      update.receiptWhatsappMessageId = result.messageId || '';
    }

    Object.assign(booking, update);
    await Booking.updateOne({ _id: booking._id }, { $set: update });
    return result;
  } catch (error) {
    const update = {
      receiptWhatsappStatus: 'failed',
      receiptWhatsappLastError: String(
        error.message || 'WhatsApp delivery failed',
      ).slice(0, 300),
    };
    Object.assign(booking, update);
    await Booking.updateOne({ _id: booking._id }, { $set: update });
    console.error(
      `Receipt WhatsApp failed for booking ${booking._id}:`,
      error.message,
    );
    return { sent: false, reason: 'whatsapp_failed' };
  }
}

exports.checkLocation = catchAsync(async (req, res, next) => {
  const locationInput = req.body.eventLocation || req.body || {};
  const pinCode = String(locationInput.pinCode || '').trim();
  const locality = String(locationInput.locality || '').trim();
  const district = String(locationInput.district || '').trim();
  const state = String(locationInput.state || '').trim();

  if (!/^[1-9]\d{5}$/.test(pinCode) && !district) {
    return next(
      new AppError(
        'Please provide a valid 6-digit Indian PIN code or district.',
        400,
      ),
    );
  }

  const travel = await evaluateTravelForLocation({
    pinCode,
    locality,
    district,
    state,
  });

  let pricing = null;
  if (req.body.packageId) {
    const pkg = await Package.findById(req.body.packageId);
    if (pkg) {
      const basePackagePrice = roundMoney(pkg.price);
      const travelCharge = travel.available
        ? roundMoney(travel.travelCharge || 0)
        : 0;
      const totalPrice = roundMoney(basePackagePrice + travelCharge);
      const advanceAmount = calculateAdvance(totalPrice);
      pricing = {
        basePackagePrice,
        travelCharge,
        totalPrice,
        advancePercentage: ADVANCE_PERCENTAGE,
        advanceAmount,
      };
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      ...travel,
      pricing,
    },
  });
});

exports.createOrder = catchAsync(async (req, res, next) => {
  const pkg = await Package.findById(req.params.packageId);
  if (!pkg) return next(new AppError('No package found with that ID.', 404));

  const { eventDateKey, eventDate } = normalizeEventDate(req.body.eventDate);
  const eventLocation = normalizeEventLocation(req.body.eventLocation);
  if (req.body.advancePolicyAccepted !== true) {
    return next(
      new AppError(
        'Please accept the payment and cancellation policy before continuing.',
        400,
      ),
    );
  }

  const paymentChoice = req.body.paymentChoice || 'advance';
  if (!['advance', 'full'].includes(paymentChoice)) {
    return next(
      new AppError(
        'Please choose either the 20% advance or full package payment.',
        400,
      ),
    );
  }

  // Enforce serviceability radius and compute travel cost on the server.
  const travel = await evaluateTravelForLocation(eventLocation);
  if (!travel.available) {
    return next(new AppError(travel.message, 400));
  }

  await ensureEventDateAvailable(eventDateKey);

  const basePackagePrice = roundMoney(pkg.price);
  const travelCharge = roundMoney(travel.travelCharge || 0);
  const totalBookingPrice = roundMoney(basePackagePrice + travelCharge);
  const advanceAmount = calculateAdvance(totalBookingPrice);
  const initialPaymentAmount =
    paymentChoice === 'full' ? totalBookingPrice : advanceAmount;
  const balanceDue = roundMoney(
    Math.max(totalBookingPrice - initialPaymentAmount, 0),
  );
  const reservationExpiresAt = new Date(
    Date.now() + ONLINE_HOLD_MINUTES * 60 * 1000,
  );

  let booking;
  try {
    booking = await Booking.create({
      package: pkg._id,
      user: req.user.id,
      createdBy: req.user.id,
      bookingSource: 'online',
      price: totalBookingPrice,
      basePackagePrice,
      travelCharge,
      travelDistanceKm: travel.distanceKm,
      advancePercentage: ADVANCE_PERCENTAGE,
      advanceAmount,
      initialPaymentChoice: paymentChoice,
      initialPaymentAmount,
      amountPaid: 0,
      balanceDue: totalBookingPrice,
      eventDate,
      eventDateKey,
      reservationExpiresAt,
      eventLocation,
      paymentStatus: 'pending',
      policyAcceptedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return next(
        new AppError(
          'This event date has just been reserved by another customer. Please choose another date.',
          409,
        ),
      );
    }
    throw error;
  }

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(initialPaymentAmount * 100),
      currency: 'INR',
      receipt: `rrs_${String(booking._id).slice(-16)}`,
      notes: {
        bookingId: String(booking._id),
        bookingSource: 'online',
        paymentChoice,
        advancePercentage: String(ADVANCE_PERCENTAGE),
        basePackagePrice: String(basePackagePrice),
        travelCharge: String(travelCharge),
        travelDistanceKm: String(travel.distanceKm ?? ''),
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
        basePackagePrice,
        travelCharge,
        travelDistanceKm: travel.distanceKm,
        packagePrice: totalBookingPrice,
        totalPrice: totalBookingPrice,
        paymentChoice,
        advancePercentage: ADVANCE_PERCENTAGE,
        advanceAmount,
        amountDueNow: initialPaymentAmount,
        balanceDue,
        holdMinutes: ONLINE_HOLD_MINUTES,
      },
    });
  } catch (error) {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'pending' },
      {
        $set: { paymentStatus: 'failed' },
        $unset: { eventDateKey: '', reservationExpiresAt: '' },
      },
    );
    throw error;
  }
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(
      new AppError('Please provide all required payment details.', 400),
    );
  }
  if (!/^[a-f0-9]{64}$/i.test(String(razorpay_signature))) {
    return next(
      new AppError(
        'Payment verification failed. Invalid transaction signature.',
        400,
      ),
    );
  }

  const signedPayload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(signedPayload)
    .digest('hex');
  const expected = Buffer.from(generatedSignature, 'hex');
  const received = Buffer.from(razorpay_signature, 'hex');
  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return next(
      new AppError(
        'Payment verification failed. Invalid transaction signature.',
        400,
      ),
    );
  }

  const booking = await Booking.findOne({
    razorpayOrderId: razorpay_order_id,
    user: req.user.id,
  });
  if (!booking)
    return next(
      new AppError('No booking found for this transaction and user.', 404),
    );

  // Make repeated Razorpay callbacks idempotent for both advance and full payments.
  if (
    booking.razorpayPaymentId === razorpay_payment_id &&
    ['partially_paid', 'paid'].includes(booking.paymentStatus)
  ) {
    return res
      .status(200)
      .json({
        status: 'success',
        message: 'This booking payment was already verified.',
        booking,
      });
  }
  if (booking.paymentStatus !== 'pending') {
    return next(
      new AppError(
        'This booking is no longer awaiting its advance payment. Please contact the studio if money was debited.',
        409,
      ),
    );
  }

  if (
    booking.reservationExpiresAt &&
    booking.reservationExpiresAt <= new Date()
  ) {
    await Booking.updateOne(
      { _id: booking._id, paymentStatus: 'pending' },
      {
        $set: { paymentStatus: 'failed' },
        $unset: { eventDateKey: '', reservationExpiresAt: '' },
      },
    );
    return next(
      new AppError(
        'The temporary date hold expired before payment verification. Please contact Radha Rani Studio immediately with your Razorpay payment ID.',
        409,
      ),
    );
  }

  // Use the server-recorded initial amount, never an amount supplied by the browser.
  // Older 20%-advance orders have advanceAmount but no initialPaymentAmount; still verify them.
  // Very old full-payment orders have neither field and continue to verify at full price.
  const hasRecordedInitialAmount =
    Number.isFinite(Number(booking.initialPaymentAmount)) &&
    Number(booking.initialPaymentAmount) > 0;
  const isLegacyFullPayment =
    !hasRecordedInitialAmount &&
    (!Number.isFinite(Number(booking.advanceAmount)) ||
      Number(booking.advanceAmount) <= 0);
  const amountReceived = hasRecordedInitialAmount
    ? roundMoney(booking.initialPaymentAmount)
    : isLegacyFullPayment
      ? roundMoney(booking.price)
      : roundMoney(booking.advanceAmount);
  booking.amountPaid = amountReceived;
  booking.balanceDue = roundMoney(Math.max(booking.price - amountReceived, 0));
  booking.paymentStatus = booking.balanceDue <= 0 ? 'paid' : 'partially_paid';
  booking.paymentEntries.push({
    amount: amountReceived,
    method: 'razorpay',
    referenceId: razorpay_payment_id,
    paidAt: new Date(),
    note:
      booking.initialPaymentChoice === 'full' || isLegacyFullPayment
        ? 'Full package payment received through Razorpay.'
        : `${ADVANCE_PERCENTAGE}% booking advance received through Razorpay.`,
  });
  booking.razorpayPaymentId = razorpay_payment_id;
  booking.razorpaySignature = razorpay_signature;
  booking.reservationExpiresAt = undefined;
  await booking.save();

  // Receipt notifications are best-effort: email/WhatsApp failures must never undo a verified payment.
  const [receiptEmail, receiptWhatsapp] = await Promise.all([
    sendAndTrackReceiptEmail(booking),
    sendAndTrackReceiptWhatsapp(booking),
  ]);

  res.status(200).json({
    status: 'success',
    message:
      booking.balanceDue <= 0
        ? 'Full package payment verified. Your event date is reserved.'
        : 'Booking advance verified. Your event date is reserved.',
    receiptEmail,
    receiptWhatsapp,
    booking,
  });
});

exports.getReceiptPdf = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return next(new AppError('Booking not found.', 404));

  const bookingUserId = booking.user?._id
    ? String(booking.user._id)
    : String(booking.user || '');
  const isOwner = bookingUserId && bookingUserId === String(req.user.id);
  if (req.user.role !== 'admin' && !isOwner) {
    return next(
      new AppError('You do not have permission to access this receipt.', 403),
    );
  }

  const collected =
    booking.amountPaid !== undefined && booking.amountPaid !== null
      ? Number(booking.amountPaid)
      : booking.paymentStatus === 'paid'
        ? Number(booking.price || 0)
        : 0;
  if (
    collected <= 0 ||
    ['pending', 'failed', 'cancelled'].includes(booking.paymentStatus)
  ) {
    return next(
      new AppError(
        'A receipt is available after a payment has been recorded.',
        409,
      ),
    );
  }

  const pdf = generateReceiptPdf(booking);
  const receiptId = String(booking._id).slice(-12);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="Radha-Rani-Studio-Receipt-${receiptId}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  return res.status(200).send(pdf);
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const bookings = await Booking.find({ user: req.user.id }).sort({
    createdAt: -1,
  });
  res
    .status(200)
    .json({ status: 'success', results: bookings.length, data: { bookings } });
});
