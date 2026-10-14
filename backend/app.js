const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const packageRouter = require('./routes/packageRoutes');
const userRouter = require('./routes/userRoutes');
const bookingRouter = require('./routes/bokingRoutes');

const app = express();

app.use(cors());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());

// Routes
app.use('/api/v1/packages', packageRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handle unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Something went wrong';

  // Invalid MongoDB document values, such as an invalid event date
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    statusCode = 400;
    status = 'fail';
    message = 'Invalid data provided. Please check your input.';
  }

  res.status(statusCode).json({
    status,
    message,
  });
});

module.exports = app;
