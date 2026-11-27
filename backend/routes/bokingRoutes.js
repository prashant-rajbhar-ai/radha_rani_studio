const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Every booking endpoint requires an authenticated session.
router.use(authController.protect);

router.post('/create-order/:packageId', bookingController.createOrder);
router.post('/verify', bookingController.verifyPayment);
router.get('/:bookingId/receipt.pdf', bookingController.getReceiptPdf);
router.get('/my-bookings', bookingController.getMyBookings);

// Administrator-only booking and payment management.
router.get(
  '/admin/summary',
  authController.restrictTo('admin'),
  adminController.getDashboardSummary,
);
router.get(
  '/admin/all',
  authController.restrictTo('admin'),
  adminController.getAllBookings,
);
router.post(
  '/admin/offline',
  authController.restrictTo('admin'),
  adminController.createOfflineBooking,
);
router.post(
  '/admin/:bookingId/payments',
  authController.restrictTo('admin'),
  adminController.recordPayment,
);
router.post(
  '/admin/:bookingId/email-receipt',
  authController.restrictTo('admin'),
  adminController.sendReceiptEmailAgain,
);
router.post(
  '/admin/:bookingId/whatsapp-receipt',
  authController.restrictTo('admin'),
  adminController.sendReceiptWhatsappAgain,
);

module.exports = router;
