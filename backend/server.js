const dotenv = require('dotenv');

// Load environment variables BEFORE importing app.js or controllers
dotenv.config({ path: './config.env' });

const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!process.env.DATABASE || !process.env.DATABASE_PASSWORD) {
      throw new Error('Missing DATABASE or DATABASE_PASSWORD in config.env');
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Missing Razorpay test credentials in config.env');
    }

    const DB = process.env.DATABASE.replace(
      '<PASSWORD>',
      encodeURIComponent(process.env.DATABASE_PASSWORD),
    );

    await mongoose.connect(DB, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ MongoDB Atlas connected successfully!');

    app.listen(PORT, () => {
      console.log(`🚀 App running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
