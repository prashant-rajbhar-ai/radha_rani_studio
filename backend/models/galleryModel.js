const mongoose = require('mongoose');

const mediaItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    contentType: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
  },
  { _id: false },
);

const gallerySchema = new mongoose.Schema(
  {
    clientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    clientName: { type: String, trim: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    title: { type: String, required: true, trim: true },
    retentionMonths: { type: Number, enum: [3, 6], default: 3 },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'expired'], default: 'active' },
    items: [mediaItemSchema],
  },
  { timestamps: true },
);

gallerySchema.methods.isExpired = function isExpired() {
  return this.status === 'expired' || new Date() >= new Date(this.expiresAt);
};

module.exports = mongoose.model('Gallery', gallerySchema);
