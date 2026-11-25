const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');

// These endpoints are mounted behind protect + restrictTo('admin').
exports.getDashboardSummary = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [paymentSummary, totalBookings, upcomingBookings] = await Promise.all([
    Booking.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          amount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$price', 0],
            },
          },
        },
      },
    ]),
    Booking.countDocuments(),
    Booking.countDocuments({ eventDate: { $gte: today } }),
  ]);

  const byStatus = paymentSummary.reduce((result, item) => {
    result[item._id] = { count: item.count, amount: item.amount };
    return result;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      totalBookings,
      successfulPayments: byStatus.paid?.count || 0,
      pendingPayments: byStatus.pending?.count || 0,
      failedPayments: byStatus.failed?.count || 0,
      totalRevenue: byStatus.paid?.amount || 0,
      upcomingBookings,
    },
  });
});

exports.getAllBookings = catchAsync(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};

  if (['pending', 'paid', 'failed'].includes(req.query.paymentStatus)) {
    filter.paymentStatus = req.query.paymentStatus;
  }
  if (req.query.from || req.query.to) {
    filter.eventDate = {};
    if (req.query.from) filter.eventDate.$gte = new Date(req.query.from);
    if (req.query.to) {
      const to = new Date(req.query.to);
      to.setHours(23, 59, 59, 999);
      filter.eventDate.$lte = to;
    }
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
