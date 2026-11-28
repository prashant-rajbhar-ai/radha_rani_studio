const axios = require('axios');
const Booking = require('../models/bookingModel');
const User = require('../models/userModel');

const WHATSAPP_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const REMINDER_WINDOWS = [
  { daysAhead: 7, flagKey: 'sevenDaysBefore' },
  { daysAhead: 2, flagKey: 'twoDaysBefore' },
  { daysAhead: 1, flagKey: 'oneDayBefore' },
];

function formatDateInIst(dateInput) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateInput));
}

function getIstDayStart(dateInput = new Date()) {
  const istParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateInput));
  return new Date(`${istParts}T00:00:00+05:30`);
}

function normalizePhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function sendWhatsAppTemplate({ to, templateName, bodyParams }) {
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = normalizePhone(to);
  if (!recipient || !whatsappToken || !phoneNumberId) return;

  await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: bodyParams.map(text => ({
              type: 'text',
              text: String(text ?? ''),
            })),
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

async function sendRemindersForWindow(windowConfig) {
  const todayIst = getIstDayStart(new Date());
  const targetStart = new Date(
    todayIst.getTime() + windowConfig.daysAhead * 24 * 60 * 60 * 1000,
  );
  const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);

  const bookings = await Booking.find({
    eventDate: { $gte: targetStart, $lt: targetEnd },
    paymentStatus: { $in: ['partially_paid', 'paid'] },
    [`remindersSent.${windowConfig.flagKey}`]: { $ne: true },
  });

  if (bookings.length === 0) return;

  // Pull team members marked with role: "team" in MongoDB users collection
  const teamMembers = await User.find({
    role: 'team',
    active: { $ne: false },
    phoneNumber: { $exists: true, $ne: '' },
  }).select('name phoneNumber');

  for (const booking of bookings) {
    const formattedDate = formatDateInIst(booking.eventDate);
    const venueText =
      booking.eventLocation?.venueName ||
      booking.eventLocation?.locality ||
      booking.eventLocation?.district ||
      'Venue to be confirmed';
    const bookingRef = String(booking._id);
    const clientName =
      booking.user?.name || booking.clientDetails?.name || 'Valued Client';
    const customerPhone =
      booking.user?.phoneNumber || booking.clientDetails?.phoneNumber;
    const eventLabel = booking.package?.name || 'Photography Package';

    // 1. Customer reminder (7d, 2d, or 1d before event)
    if (customerPhone) {
      await sendWhatsAppTemplate({
        to: customerPhone,
        templateName: 'booking_event_reminder',
        bodyParams: [clientName, formattedDate, venueText, bookingRef],
      });
    }

    // 2. Team reminders (7d, 2d, or 1d before event)
    for (const member of teamMembers) {
      await sendWhatsAppTemplate({
        to: member.phoneNumber,
        templateName: 'team_event_notification',
        bodyParams: [
          member.name || 'Team Member',
          clientName,
          formattedDate,
          'As scheduled',
          venueText,
          eventLabel,
          bookingRef,
          'Photography & Videography',
        ],
      });
    }

    booking.remindersSent = booking.remindersSent || {};
    booking.remindersSent[windowConfig.flagKey] = true;
    await booking.save();
  }
}

async function runScheduledEventReminders() {
  for (const windowConfig of REMINDER_WINDOWS) {
    await sendRemindersForWindow(windowConfig);
  }
}

function startEventReminderScheduler() {
  runScheduledEventReminders().catch(err =>
    console.error('Initial reminder check failed:', err.message),
  );

  setInterval(
    () => {
      runScheduledEventReminders().catch(err =>
        console.error('Scheduled reminder check failed:', err.message),
      );
    },
    60 * 60 * 1000,
  );
}

module.exports = {
  runScheduledEventReminders,
  startEventReminderScheduler,
};
