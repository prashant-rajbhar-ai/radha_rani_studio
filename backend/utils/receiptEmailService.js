const sendEmail = require('./email');
const generateReceiptPdf = require('./receiptPdf');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function money(value) {
  return `INR ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)}`;
}

function formatDate(value) {
  if (!value) return 'To be confirmed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric',
  }).format(date);
}

function customerOf(booking) {
  return booking.user || booking.clientDetails || {};
}

async function sendBookingReceiptEmail(booking) {
  const customer = customerOf(booking);
  const email = String(customer.email || '').trim();
  if (!email) return { sent: false, reason: 'no_customer_email' };

  const receiptNumber = String(booking._id || booking.id || booking.razorpayPaymentId || 'RRS-RECEIPT');
  const customerName = customer.name || 'Customer';
  const packageName = booking.package?.name || booking.packageName || 'Photography package';
  const packagePrice = Number(booking.price || 0);
  const amountPaid = booking.amountPaid !== undefined && booking.amountPaid !== null
    ? Number(booking.amountPaid)
    : (booking.paymentStatus === 'paid' ? packagePrice : Math.max(packagePrice - Number(booking.balanceDue || 0), 0));
  const balanceDue = booking.balanceDue !== undefined && booking.balanceDue !== null
    ? Number(booking.balanceDue)
    : Math.max(packagePrice - amountPaid, 0);
  const paymentStatus = balanceDue <= 0 ? 'Fully paid' : 'Payment received';
  const eventDate = formatDate(booking.eventDate);
  const pdf = generateReceiptPdf(booking);
  const filename = `Radha-Rani-Studio-Receipt-${receiptNumber.slice(-12)}.pdf`;

  const text = [
    `Hello ${customerName},`,
    '',
    'Thank you for choosing Radha Rani Studio. We appreciate your trust and look forward to capturing your special moments.',
    '',
    'Your official payment receipt is attached as a PDF.',
    `Package: ${packageName}`,
    `Event date: ${eventDate}`,
    `Package value: ${money(packagePrice)}`,
    `Amount received to date: ${money(amountPaid)}`,
    `Remaining balance: ${money(balanceDue)}`,
    `Payment status: ${paymentStatus}`,
    '',
    'For any corrections or assistance, please contact us at +91 7458006822 or radharanistudio2026@gmail.com.',
    '',
    'Warm regards,',
    'Radha Rani Studio',
  ].join('\n');

  const html = `
    <div style="margin:0;padding:28px 12px;background:#f7f4ef;font-family:Arial,sans-serif;color:#30271f;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e9e1d6;border-radius:12px;overflow:hidden;">
        <div style="padding:26px 30px 20px;text-align:center;border-bottom:2px solid #c18b35;">
          <div style="font-family:Georgia,serif;font-size:22px;letter-spacing:2px;font-weight:bold;">RADHA RANI STUDIO</div>
          <div style="margin-top:7px;color:#84766a;font-size:13px;">Wedding Photography &amp; Videography</div>
        </div>
        <div style="padding:28px 30px;">
          <h2 style="margin:0 0 18px;font-family:Georgia,serif;font-size:25px;">Thank you, ${escapeHtml(customerName)}!</h2>
          <p style="line-height:1.65;color:#5e554d;">Thank you for choosing Radha Rani Studio. We appreciate your trust and look forward to capturing your special moments.</p>
          <p style="line-height:1.65;color:#5e554d;">Your official payment receipt is attached to this email as a PDF.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:9px 0;color:#7a6f65;border-bottom:1px solid #eee7df;">Package</td><td style="padding:9px 0;text-align:right;border-bottom:1px solid #eee7df;font-weight:bold;">${escapeHtml(packageName)}</td></tr>
            <tr><td style="padding:9px 0;color:#7a6f65;border-bottom:1px solid #eee7df;">Event date</td><td style="padding:9px 0;text-align:right;border-bottom:1px solid #eee7df;font-weight:bold;">${escapeHtml(eventDate)}</td></tr>
            <tr><td style="padding:9px 0;color:#7a6f65;border-bottom:1px solid #eee7df;">Package value</td><td style="padding:9px 0;text-align:right;border-bottom:1px solid #eee7df;font-weight:bold;">${money(packagePrice)}</td></tr>
            <tr><td style="padding:9px 0;color:#7a6f65;border-bottom:1px solid #eee7df;">Amount received</td><td style="padding:9px 0;text-align:right;border-bottom:1px solid #eee7df;font-weight:bold;color:#28734f;">${money(amountPaid)}</td></tr>
            <tr><td style="padding:9px 0;color:#7a6f65;">Remaining balance</td><td style="padding:9px 0;text-align:right;font-weight:bold;">${money(balanceDue)}</td></tr>
          </table>
          <p style="font-size:13px;line-height:1.6;color:#7a6f65;">For any corrections or assistance, contact us at +91 7458006822 or radharanistudio2026@gmail.com.</p>
          <p style="margin:24px 0 0;line-height:1.6;">Warm regards,<br><strong>Radha Rani Studio</strong></p>
        </div>
      </div>
    </div>`;

  await sendEmail({
    email,
    subject: `Thank you for booking with Radha Rani Studio - Receipt ${receiptNumber.slice(-12)}`,
    message: text,
    html,
    attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
  });

  return { sent: true, email, filename };
}

module.exports = sendBookingReceiptEmail;
