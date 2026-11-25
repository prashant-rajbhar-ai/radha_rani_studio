const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');
const adminController = require('./../controllers/adminController');

const router = express.Router();

// All booking interactions mandate an authenticated user session
router.use(authController.protect);

router.post('/create-order/:packageId', bookingController.createOrder);
router.post('/verify', bookingController.verifyPayment);
router.get('/my-bookings', bookingController.getMyBookings);

// Admin-only dashboard endpoints
router.get('/admin/summary', authController.restrictTo('admin'), adminController.getDashboardSummary);
router.get('/admin/all', authController.restrictTo('admin'), adminController.getAllBookings);


module.exports = router;