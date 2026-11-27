const generateReceiptPdf = require('./receiptPdf');

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v26.0';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Normalizes Indian phone numbers to Meta's digits-only format (e.g., 919876543210).
 * Returns null if missing or invalid.
 */
function formatWhatsAppPhone(rawPhone) {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

/**
 * Formats INR values cleanly for WhatsApp template variables (e.g., 15,000).
 */
function formatInrAmount(amount) {
  const numeric = Number(amount || 0);
  return Number.isFinite(numeric)
    ? numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : '0';
}

/**
 * Uploads the receipt PDF Buffer to Meta's Media API and returns the temporary media ID.
 */
async function uploadPdfToMeta({ baseUrl, accessToken, pdfBuffer, filename }) {
  const formData = new FormData();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

  formData.append('file', pdfBlob, filename);
  formData.append('type', 'application/pdf');
  formData.append('messaging_product', 'whatsapp');

  // Do not manually set Content-Type; fetch sets multipart/form-data with the boundary automatically.
  const response = await fetch(`${baseUrl}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    const errMsg = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Meta media upload failed: ${errMsg}`);
  }

  return data.id;
}

/**
 * Sends a booking receipt PDF on WhatsApp using an approved Meta Utility template.
 * Returns { sent: boolean, reason?: string, messageId?: string }.
 */
async function sendBookingReceiptWhatsapp(booking) {
  const enabled =
    String(process.env.WHATSAPP_ENABLED || '').toLowerCase() === 'true';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName =
    process.env.WHATSAPP_RECEIPT_TEMPLATE || 'booking_receipt_pdf';
  const templateLang = process.env.WHATSAPP_RECEIPT_TEMPLATE_LANG || 'en';

  if (!enabled || !phoneNumberId || !accessToken) {
    return { sent: false, reason: 'disabled' };
  }

  // Supports both offline bookings (clientDetails) and online bookings (populated user)
  const customerName = String(
    booking.clientDetails?.name || booking.user?.name || 'Customer',
  ).trim();
  const rawPhone =
    booking.clientDetails?.phoneNumber || booking.user?.phoneNumber || '';
  const recipient = formatWhatsAppPhone(rawPhone);

  if (!recipient) {
    return { sent: false, reason: 'no_phone' };
  }

  const receiptId = String(booking._id).slice(-12);
  const filename = `Radha-Rani-Studio-Receipt-${receiptId}.pdf`;
  const packageName = String(booking.package?.name || 'Wedding Package').trim();
  const amountPaid = formatInrAmount(
    booking.amountPaid !== undefined && booking.amountPaid !== null
      ? booking.amountPaid
      : booking.price,
  );

  // Supports both sync Buffer and Promise<Buffer> from receiptPdf.js
  const pdfBuffer = await Promise.resolve(generateReceiptPdf(booking));
  const baseUrl = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}`;

  // Step 1: Upload receipt PDF privately to Meta
  const mediaId = await uploadPdfToMeta({
    baseUrl,
    accessToken,
    pdfBuffer,
    filename,
  });

  // Step 2: Send approved Utility template with the PDF attached in the header
  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLang },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'document',
              document: {
                id: mediaId,
                filename,
              },
            },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName },
            { type: 'text', text: receiptId.toUpperCase() },
            { type: 'text', text: packageName },
            { type: 'text', text: amountPaid },
          ],
        },
      ],
    },
  };

  const response = await fetch(`${baseUrl}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errCode = data?.error?.code ? ` (#${data.error.code})` : '';
    const errMsg = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Meta message send failed${errCode}: ${errMsg}`);
  }

  return {
    sent: true,
    messageId: data.messages?.[0]?.id || '',
  };
}

module.exports = sendBookingReceiptWhatsapp;
