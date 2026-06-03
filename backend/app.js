const express = require('express');
const morgan = require('morgan');
const cors = require('cors')

const packageRouter = require('./routes/packageRoutes');
const userRouter = require('./routes/userRoutes');
const bookingRouter = require('./routes/bokingRoutes')

const app = express();

app.use(cors())// Allow cross-origin requests from fontend files

// 1) MIDDLEWARES
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// This allows your app to read the JSON data you send from Postman
app.use(express.json());

// 2) ROUTES
app.use('/api/v1/packages', packageRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/bookings' , bookingRouter)

module.exports = app;
