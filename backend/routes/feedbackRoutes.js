const express = require('express');
const Feedback = require('../models/Feedback');

const router = express.Router();

// GET /api/v1/feedbacks — fetch approved client feedbacks
router.get('/', async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      status: 'success',
      results: feedbacks.length,
      data: { feedbacks },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/feedbacks — save new client feedback in MongoDB
router.post('/', async (req, res, next) => {
  try {
    const clientName = String(req.body.clientName || '').trim();
    const locationLabel = String(req.body.locationLabel || '').trim();
    const quote = String(req.body.quote || '').trim();
    const rating = Number(req.body.rating);

    if (!clientName || !locationLabel || !quote) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please enter your name, city/location, and feedback message.',
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please select a rating between 1 and 5 stars.',
      });
    }

    const feedback = await Feedback.create({
      clientName,
      locationLabel,
      rating,
      quote,
      isApproved: true,
    });

    res.status(201).json({
      status: 'success',
      message: 'Thank you! Your feedback has been submitted.',
      data: { feedback },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
