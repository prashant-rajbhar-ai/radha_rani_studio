const Booking = require('../models/bookingModel');
const AppError = require('./appError');

const ADVANCE_PERCENTAGE = 20;
const ONLINE_HOLD_MINUTES = 30;

const INDIAN_STATES_AND_UTS = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'andaman and nicobar islands', 'chandigarh',
  'dadra and nagar haveli and daman and diu', 'delhi', 'jammu and kashmir',
  'ladakh', 'lakshadweep', 'puducherry',
]);

let dateIndexPromise;

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateAdvance(packagePrice) {
  const price = roundMoney(packagePrice);
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError('The selected package has an invalid price.', 400);
  }
  return roundMoney((price * ADVANCE_PERCENTAGE) / 100);
}

function normalizeEventDate(value) {
  const eventDateKey = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDateKey)) {
    throw new AppError('Please select a valid event date.', 400);
  }

  const [year, month, day] = eventDateKey.split('-').map(Number);
  const eventDate = new Date(Date.UTC(year, month - 1, day));
  if (
    eventDate.getUTCFullYear() !== year ||
    eventDate.getUTCMonth() !== month - 1 ||
    eventDate.getUTCDate() !== day
  ) {
    throw new AppError('Please select a valid event date.', 400);
  }

  const todayIndia = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  if (eventDateKey < todayIndia) {
    throw new AppError('Event date cannot be in the past.', 400);
  }

  return { eventDateKey, eventDate };
}

function normalizeIndianPhone(value) {
  const submitted = String(value || '').trim();
  const compact = submitted.replace(/[\s()-]/g, '');
  const digits = compact.startsWith('+91') ? compact.slice(3) : compact;
  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new AppError('Please enter a valid 10-digit Indian mobile number, optionally with +91.', 400);
  }
  return `+91${digits}`;
}

function normalizeEventLocation(submittedLocation) {
  if (!submittedLocation || typeof submittedLocation !== 'object' || Array.isArray(submittedLocation)) {
    throw new AppError('Please provide the event venue address.', 400);
  }

  const fieldLimits = {
    venueName: 120,
    addressLine: 200,
    locality: 100,
    district: 100,
    state: 100,
  };
  const labels = {
    venueName: 'the venue name',
    addressLine: 'the full event address',
    locality: 'the village, town or locality',
    district: 'the district',
    state: 'the state or union territory',
  };
  const eventLocation = {};

  for (const [field, maxLength] of Object.entries(fieldLimits)) {
    const value = String(submittedLocation[field] || '').trim();
    if (!value) throw new AppError(`Please provide ${labels[field]}.`, 400);
    if (value.length > maxLength) {
      throw new AppError(`The ${field} is too long. Please shorten it and try again.`, 400);
    }
    eventLocation[field] = value;
  }

  if (!INDIAN_STATES_AND_UTS.has(eventLocation.state.toLowerCase())) {
    throw new AppError('Please provide a valid Indian state or union territory.', 400);
  }

  const pinCode = String(submittedLocation.pinCode || '').trim();
  if (!/^[1-9]\d{5}$/.test(pinCode)) {
    throw new AppError('Please provide a valid 6-digit Indian PIN code.', 400);
  }

  eventLocation.pinCode = pinCode;
  eventLocation.landmark = String(submittedLocation.landmark || '').trim().slice(0, 120);
  eventLocation.country = 'India';
  return eventLocation;
}

async function ensureEventDateIndex() {
  if (!dateIndexPromise) {
    dateIndexPromise = Booking.collection.createIndex(
      { eventDateKey: 1 },
      { unique: true, sparse: true, name: 'unique_booking_event_date' },
    ).catch((error) => {
      dateIndexPromise = null;
      throw error;
    });
  }
  await dateIndexPromise;
}

async function expireTemporaryHolds() {
  const now = new Date();
  await Booking.updateMany(
    {
      paymentStatus: 'pending',
      reservationExpiresAt: { $type: 'date', $lte: now },
    },
    {
      $set: { paymentStatus: 'failed' },
      $unset: { eventDateKey: '', reservationExpiresAt: '' },
    },
  );
}

async function ensureEventDateAvailable(eventDateKey) {
  await ensureEventDateIndex();
  const now = new Date();

  // Expired online checkout holds remain in history as failed records, but release
  // their unique date key so the same date can be booked again.
  await expireTemporaryHolds();

  const dayStart = new Date(`${eventDateKey}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const existingBooking = await Booking.findOne({
    eventDate: { $gte: dayStart, $lt: dayEnd },
    paymentStatus: { $nin: ['failed', 'cancelled'] },
    $or: [
      { reservationExpiresAt: { $exists: false } },
      { reservationExpiresAt: null },
      { reservationExpiresAt: { $gt: now } },
    ],
  }).select('_id paymentStatus bookingSource');

  if (existingBooking) {
    throw new AppError('This event date is already reserved. Please choose another date.', 409);
  }
}

function isDuplicateDateError(error) {
  return Boolean(error && error.code === 11000 && error.keyPattern && error.keyPattern.eventDateKey);
}

module.exports = {
  ADVANCE_PERCENTAGE,
  ONLINE_HOLD_MINUTES,
  roundMoney,
  calculateAdvance,
  normalizeEventDate,
  normalizeIndianPhone,
  normalizeEventLocation,
  ensureEventDateAvailable,
  ensureEventDateIndex,
  expireTemporaryHolds,
  isDuplicateDateError,
};
