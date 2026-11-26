const validator = require('validator');
const Booking = require('../models/bookingModel');
const Package = require('../models/packageModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const {
  ADVANCE_PERCENTAGE,
  roundMoney,
  calculateAdvance,
  normalizeEventDate,
  normalizeIndianPhone,
  normalizeEventLocation,
  ensureEventDateAvailable,
  expireTemporaryHolds,
  isDuplicateDateError,
} = require('../utils/bookingService');

const OFFLINE_PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card'];
const ALL_PAYMENT_METHODS = ['razorpay', ...OFFLINE_PAYMENT_METHODS];

exports.getDashboardSummary = catchAsync(async (req, res) => {
  await expireTemporaryHolds();
  const todayIndia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const today = new Date(`${todayIndia}T00:00:00.000Z`);

  const [summary] = await Booking.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        fullyPaidBookings: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
        partiallyPaidBookings: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'partially_paid'] }, 1, 0] } },
        pendingBookings: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
        amountCollected: {
          $sum: {
            $cond: [
              { $eq: ['$paymentStatus', 'paid'] },
              '$price',
              { $ifNull: ['$amountPaid', 0] },
            ],
          },
        },
        balanceOutstanding: {
          $sum: {
            $cond: [
              { $in: ['$paymentStatus', ['failed', 'cancelled']] },
              0,
              {
                $cond: [
                  { $eq: ['$paymentStatus', 'paid'] },
                  0,
                  { $ifNull: ['$balanceDue', '$price'] },
                ],
              },
            ],
          },
        },
        onlineBookings: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ['$bookingSource', 'online'] }, 'online'] }, 1, 0] },
        },
        offlineBookings: { $sum: { $cond: [{ $eq: ['$bookingSource', 'offline'] }, 1, 0] } },
      },
    },
  ]);

  const upcomingBookings = await Booking.countDocuments({
    eventDate: { $gte: today },
    paymentStatus: { $nin: ['failed', 'cancelled'] },
  });

  res.status(200).json({
    status: 'success',
    data: {
      totalBookings: summary?.totalBookings || 0,
      fullyPaidBookings: summary?.fullyPaidBookings || 0,
      partiallyPaidBookings: summary?.partiallyPaidBookings || 0,
      pendingBookings: summary?.pendingBookings || 0,
      amountCollected: roundMoney(summary?.amountCollected || 0),
      balanceOutstanding: roundMoney(summary?.balanceOutstanding || 0),
      onlineBookings: summary?.onlineBookings || 0,
      offlineBookings: summary?.offlineBookings || 0,
      upcomingBookings,
    },
  });
});

exports.getAllBookings = catchAsync(async (req, res) => {
  await expireTemporaryHolds();
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};

  const allowedStatuses = ['pending', 'partially_paid', 'paid', 'failed', 'cancelled'];
  if (allowedStatuses.includes(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.bookingSource === 'offline') filter.bookingSource = 'offline';
  if (req.query.bookingSource === 'online') {
    // Historical bookings predate the bookingSource field and are treated as online.
    filter.$or = [{ bookingSource: 'online' }, { bookingSource: { $exists: false } }];
  }

  if (req.query.from || req.query.to) {
    filter.eventDate = {};
    if (req.query.from) filter.eventDate.$gte = new Date(`${req.query.from}T00:00:00.000Z`);
    if (req.query.to) filter.eventDate.$lte = new Date(`${req.query.to}T23:59:59.999Z`);
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ eventDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: { bookings },
  });
});

exports.createOfflineBooking = catchAsync(async (req, res, next) => {
  const customerName = String(req.body.customerName || '').trim();
  if (!customerName || customerName.length > 100) {
    return next(new AppError('Please provide the customer name (maximum 100 characters).', 400));
  }

  const phoneNumber = normalizeIndianPhone(req.body.phoneNumber);
  const email = String(req.body.email || '').trim().toLowerCase();
  if (email && !validator.isEmail(email)) return next(new AppError('Please provide a valid customer email address.', 400));
  if (!OFFLINE_PAYMENT_METHODS.includes(req.body.paymentMethod)) {
    return next(new AppError('Select how the initial offline payment was received.', 400));
  }
  const paymentChoice = req.body.paymentChoice || 'advance';
  if (!['advance', 'full'].includes(paymentChoice)) {
    return next(new AppError('Choose either the 20% advance or full package payment.', 400));
  }
  if (req.body.advancePolicyAccepted !== true) {
    return next(new AppError('Confirm that the customer has been informed of and accepted the payment and cancellation policy.', 400));
  }

  const pkg = await Package.findById(req.body.packageId);
  if (!pkg) return next(new AppError('Please select a valid photography package.', 404));

  const { eventDateKey, eventDate } = normalizeEventDate(req.body.eventDate);
  const eventLocation = normalizeEventLocation(req.body.eventLocation);
  await ensureEventDateAvailable(eventDateKey);

  const price = roundMoney(pkg.price);
  const advanceAmount = calculateAdvance(price);
  const initialPaymentAmount = paymentChoice === 'full' ? price : advanceAmount;
  const balanceDue = roundMoney(Math.max(price - initialPaymentAmount, 0));
  const booking = {
    package: pkg._id,
    clientDetails: { name: customerName, email, phoneNumber },
    createdBy: req.user.id,
    bookingSource: 'offline',
    price,
    advancePercentage: ADVANCE_PERCENTAGE,
    advanceAmount,
    initialPaymentChoice: paymentChoice,
    initialPaymentAmount,
    amountPaid: initialPaymentAmount,
    balanceDue,
    paymentEntries: [{
      amount: initialPaymentAmount,
      method: req.body.paymentMethod,
      referenceId: String(req.body.paymentReference || '').trim().slice(0, 120),
      paidAt: new Date(),
      note: paymentChoice === 'full'
        ? 'Full package payment recorded by administrator for an offline booking.'
        : `${ADVANCE_PERCENTAGE}% offline booking advance recorded by administrator.`,
      recordedBy: req.user.id,
    }],
    eventDate,
    eventDateKey,
    eventLocation,
    paymentStatus: balanceDue <= 0 ? 'paid' : 'partially_paid',
    policyAcceptedAt: new Date(),
    adminNotes: String(req.body.adminNotes || '').trim().slice(0, 1000),
  };

  let created;
  try {
    created = await Booking.create(booking);
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return next(new AppError('This event date has just been reserved by another booking. No offline booking was created.', 409));
    }
    throw error;
  }

  const populated = await Booking.findById(created._id);
  res.status(201).json({
    status: 'success',
    message: paymentChoice === 'full'
      ? 'Offline booking saved. Full payment recorded and event date reserved.'
      : 'Offline booking saved. The 20% advance was recorded and the event date reserved.',
    data: { booking: populated },
  });
});

exports.recordPayment = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return next(new AppError('Booking not found.', 404));
  if (['failed', 'cancelled', 'paid'].includes(booking.paymentStatus)) {
    return next(new AppError('This booking is not eligible for another payment entry.', 409));
  }
  if (booking.paymentStatus === 'pending') {
    return next(new AppError('This online booking is still awaiting its 20% Razorpay advance. Do not record another payment until that order is resolved.', 409));
  }

  const amount = roundMoney(req.body.amount);
  const balanceDue = roundMoney(booking.balanceDue ?? (booking.price - (booking.amountPaid || 0)));
  if (!Number.isFinite(amount) || amount <= 0) return next(new AppError('Enter a payment amount greater than zero.', 400));
  if (!ALL_PAYMENT_METHODS.includes(req.body.paymentMethod)) return next(new AppError('Select a valid payment method.', 400));
  if (amount > balanceDue + 0.009) return next(new AppError(`The amount cannot exceed the remaining balance of ₹${balanceDue.toFixed(2)}.`, 400));

  const alreadyPaid = roundMoney(booking.amountPaid || 0);
  const newAmountPaid = roundMoney(alreadyPaid + amount);
  const newBalance = roundMoney(Math.max(booking.price - newAmountPaid, 0));

  booking.paymentEntries.push({
    amount,
    method: req.body.paymentMethod,
    referenceId: String(req.body.referenceId || '').trim().slice(0, 120),
    paidAt: new Date(),
    note: String(req.body.note || 'Balance payment recorded by administrator.').trim().slice(0, 300),
    recordedBy: req.user.id,
  });
  booking.amountPaid = newAmountPaid;
  booking.balanceDue = newBalance;
  booking.paymentStatus = newBalance <= 0 ? 'paid' : 'partially_paid';
  await booking.save();

  res.status(200).json({
    status: 'success',
    message: 'Payment entry recorded.',
    data: { booking },
  });
});
