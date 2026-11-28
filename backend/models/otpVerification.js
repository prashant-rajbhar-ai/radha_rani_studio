const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema(
  {
    target: { type: String, required: true, trim: true, index: true }, // normalized email or 91XXXXXXXXXX
    channel: { type: String, enum: ['email', 'whatsapp'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
