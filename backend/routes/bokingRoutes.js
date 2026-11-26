const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Every booking endpoint requires an authenticated session.
router.use(authController.protect);

router.post('/create-order/:packageId', bookingController.createOrder);
router.post('/verify', bookingController.verifyPayment);
router.get('/my-bookings', bookingController.getMyBookings);

// Administrator-only booking and payment management.
router.get('/admin/summary', authController.restrictTo('admin'), adminController.getDashboardSummary);
router.get('/admin/all', authController.restrictTo('admin'), adminController.getAllBookings);
router.post('/admin/offline', authController.restrictTo('admin'), adminController.createOfflineBooking);
router.post('/admin/:bookingId/payments', authController.restrictTo('admin'), adminController.recordPayment);

module.exports = router;
