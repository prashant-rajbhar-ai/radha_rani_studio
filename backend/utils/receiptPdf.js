const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const RIGHT = 547;
const CONTENT_WIDTH = RIGHT - LEFT;

function ascii(value) {
  return String(value ?? '')
    .replace(/₹/g, 'INR ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E]/g, '?');
}

function escapePdf(value) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatMoney(value) {
  const amount = Number(value);
  return `INR ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(Number.isNaN(date.getTime()) ? new Date() : date);
}

function wrapText(value, maxChars) {
  const text = ascii(value).trim();
  if (!text) return ['-'];
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(word => {
    if (word.length > maxChars) {
      if (line) lines.push(line);
      line = '';
      for (let index = 0; index < word.length; index += maxChars) {
        const chunk = word.slice(index, index + maxChars);
        if (chunk.length === maxChars) lines.push(chunk);
        else line = chunk;
      }
      return;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function buildPdf(booking) {
  const pages = [];
  let commands = [];
  let y = 48;

  const startPage = () => {
    commands = [];
    pages.push(commands);
    y = 48;
    addText('RADHA RANI STUDIO', LEFT, y, 20, true, [0.17, 0.13, 0.1]);
    y += 25;
    addText(
      'Wedding Photography & Videography',
      LEFT,
      y,
      9,
      false,
      [0.43, 0.38, 0.33],
    );
    y += 15;
    addLine(LEFT, y, RIGHT, y, [0.74, 0.49, 0.16], 1.2);
    y += 24;
  };

  function ensureSpace(height) {
    if (y + height > PAGE_HEIGHT - 62) startPage();
  }

  function addText(
    value,
    x,
    top,
    size = 10,
    bold = false,
    color = [0.16, 0.14, 0.12],
  ) {
    const baseline = PAGE_HEIGHT - top - size;
    commands.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color[0]} ${color[1]} ${color[2]} rg 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdf(value)}) Tj ET`,
    );
  }

  function addLine(
    x1,
    top1,
    x2,
    top2,
    color = [0.88, 0.85, 0.81],
    width = 0.6,
  ) {
    const y1 = PAGE_HEIGHT - top1;
    const y2 = PAGE_HEIGHT - top2;
    commands.push(
      `q ${color[0]} ${color[1]} ${color[2]} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`,
    );
  }

  function addRect(x, top, width, height, color) {
    const bottom = PAGE_HEIGHT - top - height;
    commands.push(
      `q ${color[0]} ${color[1]} ${color[2]} rg ${x} ${bottom} ${width} ${height} re f Q`,
    );
  }

  function addParagraph(
    value,
    x = LEFT,
    maxWidth = CONTENT_WIDTH,
    size = 9,
    color = [0.34, 0.31, 0.28],
    lineHeight = 13,
  ) {
    const maxChars = Math.max(18, Math.floor(maxWidth / (size * 0.53)));
    const lines = wrapText(value, maxChars);
    lines.forEach(line => {
      ensureSpace(lineHeight);
      addText(line, x, y, size, false, color);
      y += lineHeight;
    });
  }

  function addSectionTitle(title) {
    ensureSpace(28);
    addText(title.toUpperCase(), LEFT, y, 9, true, [0.66, 0.43, 0.15]);
    y += 17;
  }

  function addDetail(label, value) {
    const safeValue = ascii(value || '-');
    const maxValueWidth = 310;
    const maxChars = Math.max(20, Math.floor(maxValueWidth / 5.6));
    const valueLines = wrapText(safeValue, maxChars);
    const rowHeight = Math.max(23, valueLines.length * 12 + 9);
    ensureSpace(rowHeight);
    addText(label, LEFT, y, 9, false, [0.43, 0.39, 0.35]);
    valueLines.forEach((line, index) =>
      addText(line, 222, y + index * 12, 9, true),
    );
    y += rowHeight;
    addLine(LEFT, y - 4, RIGHT, y - 4);
  }

  const client = booking.user || booking.clientDetails || {};
  const pkg = booking.package || {};
  const total = Number(booking.price || 0);
  const travelCharge = Number(booking.travelCharge || 0);
  const hasTravelDistance =
    booking.travelDistanceKm !== undefined &&
    booking.travelDistanceKm !== null &&
    Number.isFinite(Number(booking.travelDistanceKm));
  const travelDistanceKm = hasTravelDistance
    ? Number(booking.travelDistanceKm)
    : null;
  const basePackagePrice =
    booking.basePackagePrice !== undefined && booking.basePackagePrice !== null
      ? Number(booking.basePackagePrice)
      : Math.max(total - travelCharge, 0);

  const amountPaid =
    booking.amountPaid !== undefined && booking.amountPaid !== null
      ? Number(booking.amountPaid)
      : booking.paymentStatus === 'paid'
        ? total
        : Math.max(total - Number(booking.balanceDue || 0), 0);
  const balance =
    booking.balanceDue !== undefined && booking.balanceDue !== null
      ? Number(booking.balanceDue)
      : Math.max(total - amountPaid, 0);
  const receiptNumber =
    booking._id || booking.id || booking.razorpayPaymentId || 'RRS-RECEIPT';
  const paymentStatus =
    balance <= 0
      ? 'FULLY PAID'
      : amountPaid > 0
        ? 'PARTIALLY PAID'
        : 'PAYMENT PENDING';
  const issuedAt = formatDateTime(new Date());
  const location = booking.eventLocation || {};
  const venueLines = [
    location.venueName,
    location.addressLine,
    location.locality,
    location.district,
    location.state,
    location.pinCode ? `PIN ${location.pinCode}` : '',
    location.landmark ? `Landmark: ${location.landmark}` : '',
    location.country || (location.venueName ? 'India' : ''),
  ].filter(Boolean);
  const venue =
    venueLines.join(', ') || booking.venue || 'To be confirmed with the studio';

  startPage();
  addText('PAYMENT RECEIPT', LEFT, y, 17, true);
  addText(paymentStatus, RIGHT - 115, y + 3, 9, true, [0.1, 0.48, 0.3]);
  y += 27;
  addParagraph(
    'Thank you for choosing Radha Rani Studio. We appreciate your trust and look forward to capturing your special moments.',
    LEFT,
    CONTENT_WIDTH,
    9,
  );
  y += 7;

  addRect(LEFT, y, CONTENT_WIDTH, 54, [0.97, 0.95, 0.9]);
  addText(
    'TOTAL AMOUNT RECEIVED',
    LEFT + 14,
    y + 12,
    8,
    true,
    [0.43, 0.39, 0.35],
  );
  addText(
    formatMoney(amountPaid),
    LEFT + 14,
    y + 27,
    16,
    true,
    [0.17, 0.13, 0.1],
  );
  y += 72;

  addSectionTitle('Receipt details');
  addDetail('Receipt number', receiptNumber);
  addDetail('Receipt issued', issuedAt);

  addSectionTitle('Customer details');
  addDetail('Customer name', client.name || 'Customer');
  addDetail('Email address', client.email || 'Not provided');
  addDetail('Mobile number', client.phoneNumber || 'Not provided');

  addSectionTitle('Booking details');
  addDetail(
    'Photography package',
    pkg.name || booking.packageName || 'Photography package',
  );
  addDetail('Event date', formatDate(booking.eventDate));
  addDetail('Event venue', venue);
  addDetail('Booking source', booking.bookingSource || 'online');

  addSectionTitle('Payment summary');
  if (travelCharge > 0) {
    const travelLabel = hasTravelDistance
      ? `${formatMoney(travelCharge)} (${travelDistanceKm} km one-way)`
      : formatMoney(travelCharge);
    addDetail('Base package price', formatMoney(basePackagePrice));
    addDetail('Travel cost', travelLabel);
    addDetail('Total booking amount', formatMoney(total));
  } else if (hasTravelDistance) {
    addDetail('Base package price', formatMoney(basePackagePrice));
    addDetail(
      'Travel cost',
      `INR 0.00 (Free within 25 km; ${travelDistanceKm} km one-way)`,
    );
    addDetail('Total booking amount', formatMoney(total));
  } else {
    addDetail('Total package price', formatMoney(total));
  }
  addDetail('Amount received to date', formatMoney(amountPaid));
  addDetail('Remaining balance', formatMoney(balance));
  addDetail('Payment status', paymentStatus);

  const entries = Array.isArray(booking.paymentEntries)
    ? booking.paymentEntries
    : [];
  if (entries.length) {
    addSectionTitle('Payment history');
    entries.forEach((entry, index) => {
      const method = String(entry.method || 'payment')
        .replace(/_/g, ' ')
        .toUpperCase();
      const reference = entry.referenceId ? ` | Ref: ${entry.referenceId}` : '';
      const description = `${index + 1}. ${formatDate(entry.paidAt)} | ${method} | ${formatMoney(entry.amount)}${reference}`;
      addParagraph(description, LEFT, CONTENT_WIDTH, 8, [0.28, 0.25, 0.22], 11);
      y += 2;
    });
  }

  ensureSpace(64);
  y += 7;
  addLine(LEFT, y, RIGHT, y, [0.74, 0.49, 0.16], 0.8);
  y += 15;
  addParagraph(
    'Please contact Radha Rani Studio if any detail needs correction. Venue and event logistics should be confirmed directly with the studio.',
    LEFT,
    CONTENT_WIDTH,
    8,
    [0.43, 0.39, 0.35],
    11,
  );
  y += 5;
  addText(
    '+91 7458006822  |  radharanistudio2026@gmail.com',
    LEFT,
    y,
    8,
    false,
    [0.3, 0.26, 0.22],
  );

  pages.forEach((pageCommands, index) => {
    const footer = `Page ${index + 1} of ${pages.length}  |  Radha Rani Studio`;
    pageCommands.push(
      `BT /F1 8 Tf 0.48 0.45 0.41 rg 1 0 0 1 ${LEFT} 28 Tm (${escapePdf(footer)}) Tj ET`,
    );
  });

  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  const objects = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  pages.forEach((pageCommands, index) => {
    const pageId = 5 + index * 2;
    const streamId = pageId + 1;
    const stream = `${pageCommands.join('\n')}\n`;
    const length = Buffer.byteLength(stream, 'ascii');
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${length} >>\nstream\n${stream}endstream`;
  });

  let pdf = '%PDF-1.4\n%RRS\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = Buffer.byteLength(pdf, 'ascii');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

module.exports = buildPdf;
