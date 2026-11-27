const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 44;
const RIGHT = 551;
const CONTENT_WIDTH = RIGHT - LEFT;

const imageCache = new Map();

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

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterPngScanlines(raw, width, height, channels, bitDepth) {
  const bytesPerPixel = Math.max(1, Math.ceil((bitDepth * channels) / 8));
  const stride = Math.ceil((width * bitDepth * channels) / 8);
  const out = Buffer.alloc(height * stride);
  let srcOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filterType = raw[srcOffset++];
    const rowStart = row * stride;
    const prevStart = (row - 1) * stride;

    for (let i = 0; i < stride; i += 1) {
      const x = raw[srcOffset + i];
      const a = i >= bytesPerPixel ? out[rowStart + i - bytesPerPixel] : 0;
      const b = row > 0 ? out[prevStart + i] : 0;
      const c =
        row > 0 && i >= bytesPerPixel ? out[prevStart + i - bytesPerPixel] : 0;

      let val = x;
      if (filterType === 1) val = (x + a) & 0xff;
      else if (filterType === 2) val = (x + b) & 0xff;
      else if (filterType === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) val = (x + paethPredictor(a, b, c)) & 0xff;

      out[rowStart + i] = val;
    }
    srcOffset += stride;
  }

  return out;
}

function parsePngForPdf(buf) {
  const pngSig = '89504e470d0a1a0a';
  if (
    !Buffer.isBuffer(buf) ||
    buf.length < 24 ||
    buf.subarray(0, 8).toString('hex') !== pngSig
  ) {
    return null;
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];
  let palette = null;

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buf.length) break;

    if (type === 'IHDR') {
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      bitDepth = buf[dataStart + 8];
      colorType = buf[dataStart + 9];
      interlace = buf[dataStart + 12];
    } else if (type === 'PLTE') {
      palette = buf.subarray(dataStart, dataEnd);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || interlace !== 0) {
    return null;
  }

  if (![2, 3, 6].includes(colorType)) return null;
  if (colorType === 3 && (!palette || palette.length < 3)) return null;

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const pixels = unfilterPngScanlines(
    inflated,
    width,
    height,
    channels,
    bitDepth,
  );

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = colorType === 6 ? Buffer.alloc(width * height) : null;

  if (colorType === 3) {
    for (let i = 0, r = 0; i < width * height; i += 1, r += 3) {
      const idx = Math.min(pixels[i] * 3, palette.length - 3);
      rgb[r] = palette[idx];
      rgb[r + 1] = palette[idx + 1];
      rgb[r + 2] = palette[idx + 2];
    }
  } else {
    for (
      let i = 0, p = 0, r = 0, a = 0;
      i < width * height;
      i += 1, p += channels, r += 3
    ) {
      rgb[r] = pixels[p];
      rgb[r + 1] = pixels[p + 1];
      rgb[r + 2] = pixels[p + 2];
      if (alpha) {
        alpha[a++] = pixels[p + 3];
      }
    }
  }

  return { width, height, rgb, alpha };
}

function loadPngXObject(cacheKey, fileNames) {
  if (imageCache.has(cacheKey)) return imageCache.get(cacheKey);

  const roots = [
    path.resolve(__dirname, '../../frontend/images'),
    path.resolve(__dirname, '../public/images'),
    path.resolve(process.cwd(), 'frontend/images'),
    path.resolve(process.cwd(), 'images'),
  ];

  for (const root of roots) {
    for (const name of fileNames) {
      const fullPath = path.join(root, name);
      try {
        if (!fs.existsSync(fullPath)) continue;
        const parsed = parsePngForPdf(fs.readFileSync(fullPath));
        if (!parsed) continue;
        const xobj = {
          width: parsed.width,
          height: parsed.height,
          rgbCompressed: zlib.deflateSync(parsed.rgb),
          smaskCompressed: parsed.alpha ? zlib.deflateSync(parsed.alpha) : null,
        };
        imageCache.set(cacheKey, xobj);
        return xobj;
      } catch (err) {
        // Continue checking candidate paths.
      }
    }
  }

  imageCache.set(cacheKey, false);
  return false;
}

function buildPdf(booking) {
  const pages = [];
  let commands = [];
  let y = 38;

  const logoXObject = loadPngXObject('logo', [
    'favicon-transparent.png',
    'whatsapp-preview.png',
  ]);
  const sigXObject = loadPngXObject('signature', ['signature - Edited.png']);

  const startPage = () => {
    commands = [];
    pages.push(commands);
    y = 38;

    const hasLogo = Boolean(logoXObject);
    const logoSize = 38;
    const textX = hasLogo ? LEFT + logoSize + 12 : LEFT;

    if (hasLogo) {
      const logoBottom = PAGE_HEIGHT - y - logoSize;
      commands.push(
        `q ${logoSize} 0 0 ${logoSize} ${LEFT} ${logoBottom.toFixed(2)} cm /ImLogo Do Q`,
      );
    }

    addText('RADHA RANI STUDIO', textX, y, 18, true, [0.17, 0.13, 0.1]);
    addText(
      'Wedding Photography & Videography',
      textX,
      y + 22,
      9,
      false,
      [0.43, 0.38, 0.33],
    );
    y += 46;
    addLine(LEFT, y, RIGHT, y, [0.74, 0.49, 0.16], 1.2);
    y += 18;
  };

  function ensureSpace(height) {
    if (y + height > PAGE_HEIGHT - 44) startPage();
  }

  function addText(
    value,
    x,
    top,
    size = 9,
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

  function drawImageFit(alias, imgObj, rightX, top, maxWidth, maxHeight) {
    if (!imgObj) return 0;
    const aspect = imgObj.width / imgObj.height;
    let drawW = maxWidth;
    let drawH = drawW / aspect;
    if (drawH > maxHeight) {
      drawH = maxHeight;
      drawW = drawH * aspect;
    }
    const drawX = rightX - drawW;
    const bottomY = PAGE_HEIGHT - top - drawH;
    commands.push(
      `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${bottomY.toFixed(2)} cm /${alias} Do Q`,
    );
    return drawH;
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
    ensureSpace(26);
    y += 10;
    addText(title.toUpperCase(), LEFT, y, 8.5, true, [0.66, 0.43, 0.15]);
    y += 16;
  }

  function addDetail(label, value) {
    const safeValue = ascii(value || '-');
    const maxValueWidth = 315;
    const maxChars = Math.max(20, Math.floor(maxValueWidth / 5.4));
    const valueLines = wrapText(safeValue, maxChars);
    const rowHeight = Math.max(24, valueLines.length * 12 + 8);
    ensureSpace(rowHeight);
    addText(label, LEFT, y, 9, false, [0.43, 0.39, 0.35]);
    valueLines.forEach((line, index) =>
      addText(line, 215, y + index * 12, 9, true),
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
  addText('PAYMENT RECEIPT', LEFT, y, 15, true);
  addText(paymentStatus, RIGHT - 95, y + 2, 9, true, [0.1, 0.48, 0.3]);
  y += 24;
  addParagraph(
    'Thank you for choosing Radha Rani Studio. Keep this receipt for your booking records.',
    LEFT,
    CONTENT_WIDTH,
    9,
  );
  y += 8;

  addRect(LEFT, y, CONTENT_WIDTH, 50, [0.97, 0.95, 0.9]);
  addText(
    'TOTAL AMOUNT RECEIVED',
    LEFT + 14,
    y + 10,
    8,
    true,
    [0.43, 0.39, 0.35],
  );
  addText(
    formatMoney(amountPaid),
    LEFT + 14,
    y + 24,
    15,
    true,
    [0.17, 0.13, 0.1],
  );
  y += 62;

  addSectionTitle('Receipt & customer');
  addDetail('Receipt number', receiptNumber);
  addDetail('Receipt issued', issuedAt);
  addDetail('Customer name', client.name || 'Customer');
  addDetail(
    'Email / Mobile',
    `${client.email || 'Not provided'}  |  ${client.phoneNumber || 'Not provided'}`,
  );

  addSectionTitle('Booking details');
  addDetail(
    'Photography package',
    pkg.name || booking.packageName || 'Photography package',
  );
  addDetail('Event date', formatDate(booking.eventDate));
  addDetail('Event venue', venue);

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
  addDetail('Amount received', formatMoney(amountPaid));
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
      addParagraph(description, LEFT, CONTENT_WIDTH, 8, [0.28, 0.25, 0.22], 12);
    });
  }

  const sigMaxW = 260;
  const sigMaxH = 96;
  const bottomBlockHeight = sigMaxH + 62;
  const targetBottomStart = PAGE_HEIGHT - 44 - bottomBlockHeight;
  if (y < targetBottomStart) {
    y = Math.min(targetBottomStart, y + 48);
  }
  ensureSpace(bottomBlockHeight);

  if (sigXObject) {
    const drawnH = drawImageFit(
      'ImSig',
      sigXObject,
      RIGHT,
      y,
      sigMaxW,
      sigMaxH,
    );
    y += drawnH + 4;
  } else {
    addText('Prashant', RIGHT - 110, y + 20, 16, true, [0.22, 0.18, 0.14]);
    y += 44;
  }
  addText(
    'Authorized Signatory - Prashant, Radha Rani Studio',
    RIGHT - 250,
    y,
    8.5,
    true,
    [0.43, 0.39, 0.35],
  );
  y += 14;

  addLine(LEFT, y, RIGHT, y, [0.74, 0.49, 0.16], 0.8);
  y += 10;
  addParagraph(
    'Please contact Radha Rani Studio if any detail needs correction. Venue and event logistics should be confirmed directly with the studio.',
    LEFT,
    CONTENT_WIDTH,
    8,
    [0.43, 0.39, 0.35],
    11,
  );
  addText(
    '+91 7458006822  |  radharanistudio2026@gmail.com',
    LEFT,
    y + 2,
    8.5,
    true,
    [0.3, 0.26, 0.22],
  );

  const objects = [];
  let nextObjId = 5;

  let logoObj = null;
  if (logoXObject) {
    const rgbId = nextObjId++;
    const maskId = logoXObject.smaskCompressed ? nextObjId++ : null;
    logoObj = { rgbId, maskId, xobj: logoXObject };
  }

  let sigObj = null;
  if (sigXObject) {
    const rgbId = nextObjId++;
    const maskId = sigXObject.smaskCompressed ? nextObjId++ : null;
    sigObj = { rgbId, maskId, xobj: sigXObject };
  }

  const pageObjectIds = pages.map((_, index) => nextObjId + index * 2);

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  const streamEnd = Buffer.from('\nendstream', 'ascii');
  [logoObj, sigObj].filter(Boolean).forEach(imgEntry => {
    const smaskBuf = imgEntry.xobj.smaskCompressed;
    const maskPart =
      imgEntry.maskId && smaskBuf ? ` /SMask ${imgEntry.maskId} 0 R` : '';
    const rgbHeader = Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${imgEntry.xobj.width} /Height ${imgEntry.xobj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${maskPart} /Length ${imgEntry.xobj.rgbCompressed.length} >>\nstream\n`,
      'ascii',
    );
    objects[imgEntry.rgbId] = Buffer.concat([
      rgbHeader,
      imgEntry.xobj.rgbCompressed,
      streamEnd,
    ]);

    if (imgEntry.maskId && smaskBuf) {
      const maskHeader = Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${imgEntry.xobj.width} /Height ${imgEntry.xobj.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${smaskBuf.length} >>\nstream\n`,
        'ascii',
      );
      objects[imgEntry.maskId] = Buffer.concat([
        maskHeader,
        smaskBuf,
        streamEnd,
      ]);
    }
  });

  pages.forEach((pageCommands, index) => {
    const pageId = pageObjectIds[index];
    const streamId = pageId + 1;
    const footer = `Page ${index + 1} of ${pages.length}  |  Radha Rani Studio`;
    pageCommands.push(
      `BT /F1 7.5 Tf 0.48 0.45 0.41 rg 1 0 0 1 ${LEFT} 22 Tm (${escapePdf(footer)}) Tj ET`,
    );

    const stream = `${pageCommands.join('\n')}\n`;
    const length = Buffer.byteLength(stream, 'ascii');

    const xobjs = [];
    if (logoObj && stream.includes('/ImLogo Do'))
      xobjs.push(`/ImLogo ${logoObj.rgbId} 0 R`);
    if (sigObj && stream.includes('/ImSig Do'))
      xobjs.push(`/ImSig ${sigObj.rgbId} 0 R`);
    const xobjDict = xobjs.length ? ` /XObject << ${xobjs.join(' ')} >>` : '';

    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${xobjDict} >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${length} >>\nstream\n${stream}endstream`;
  });

  const parts = [Buffer.from('%PDF-1.4\n%RRS\n', 'ascii')];
  const offsets = [0];
  let byteLength = parts[0].length;

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = byteLength;
    const objBody = Buffer.isBuffer(objects[id])
      ? objects[id]
      : Buffer.from(objects[id], 'ascii');
    const chunk = Buffer.concat([
      Buffer.from(`${id} 0 obj\n`, 'ascii'),
      objBody,
      Buffer.from('\nendobj\n', 'ascii'),
    ]);
    parts.push(chunk);
    byteLength += chunk.length;
  }

  const xrefOffset = byteLength;
  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `${xref}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(Buffer.from(trailer, 'ascii'));

  return Buffer.concat(parts);
}

module.exports = buildPdf;
