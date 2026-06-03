const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

// All booking interactions mandate an authenticated user session
router.use(authController.protect);

router.post('/create-order/:packageId', bookingController.createOrder);
router.post('/verify', bookingController.verifyPayment);

module.exports = router;