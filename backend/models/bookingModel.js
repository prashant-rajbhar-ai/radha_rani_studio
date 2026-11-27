const mongoose = require('mongoose');

const eventLocationSchema = new mongoose.Schema(
  {
    venueName: { type: String, required: true, trim: true, maxlength: 120 },
    addressLine: { type: String, required: true, trim: true, maxlength: 200 },
    locality: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    pinCode: { type: String, required: true, trim: true, match: [/^[1-9]\d{5}$/, 'Please provide a valid 6-digit Indian PIN code.'] },
    landmark: { type: String, trim: true, maxlength: 120, default: '' },
    country: { type: String, enum: ['India'], default: 'India', required: true },
  },
  { _id: false },
);

const clientDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, maxlength: 100 },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phoneNumber: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const paymentEntrySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    method: {
      type: String,
      enum: ['razorpay', 'cash', 'upi', 'bank_transfer', 'card'],
      required: true,
    },
    referenceId: { type: String, trim: true, maxlength: 120, default: '' },
    paidAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    recordedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
  },
  { _id: true },
);

const bookingSchema = new mongoose.Schema(
  {
    package: {
      type: mongoose.Schema.ObjectId,
      ref: 'Package',
      required: [true, 'A booking must belong to a Package!'],
    },
    // Online bookings reference the customer account. Offline customers do not need
    // website accounts, so their contact information is stored as a booking snapshot.
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: false },
    clientDetails: { type: clientDetailsSchema, default: undefined },
    createdBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
    bookingSource: { type: String, enum: ['online', 'offline'], default: 'online', index: true },
    price: { type: Number, required: true, min: 0.01 },
    advancePercentage: { type: Number, default: 20, min: 20, max: 20 },
    // advanceAmount always represents the standard 20% booking advance.
    advanceAmount: { type: Number, min: 0 },
    // Customer/admin may choose to collect the 20% advance or the full package price initially.
    // Optional fields keep legacy booking documents readable.
    initialPaymentChoice: { type: String, enum: ['advance', 'full'] },
    initialPaymentAmount: { type: Number, min: 0 },
    amountPaid: { type: Number, min: 0 },
    balanceDue: { type: Number, min: 0 },
    paymentEntries: { type: [paymentEntrySchema], default: [] },
    eventDate: { type: Date, required: [true, 'Please provide the date of the event'] },
    eventDateKey: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Online orders reserve the date temporarily while the customer completes Razorpay.
    // The key is unset after a dismissed/expired order; confirmed bookings retain it.
    reservationExpiresAt: { type: Date, default: null },
    eventLocation: { type: eventLocationSchema, default: undefined },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    receiptEmailStatus: { type: String, enum: ['not_sent', 'sent', 'failed', 'no_email'], default: 'not_sent' },
    receiptEmailSentAt: { type: Date },
    receiptEmailLastError: { type: String, maxlength: 300, default: '' },
    receiptWhatsappStatus: {
      type: String,
      enum: ['not_sent', 'sent', 'failed', 'no_phone', 'disabled'],
      default: 'not_sent',
    },
    receiptWhatsappSentAt: { type: Date },
    receiptWhatsappMessageId: { type: String, maxlength: 120, default: '' },
    receiptWhatsappLastError: { type: String, maxlength: 300, default: '' },
    policyAcceptedAt: { type: Date },
    adminNotes: { type: String, trim: true, maxlength: 1000, default: '' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true },
);

// A sparse unique index lets legacy bookings (which have no eventDateKey) remain
// readable while ensuring every newly reserved online/offline date is unique.
bookingSchema.index(
  { eventDateKey: 1 },
  { unique: true, sparse: true, name: 'unique_booking_event_date' },
);

bookingSchema.pre(/^find/, function populateBookingRelations(next) {
  this.populate({ path: 'user', select: 'name email phoneNumber' }).populate({
    path: 'package',
    select: 'name price imageCover',
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;