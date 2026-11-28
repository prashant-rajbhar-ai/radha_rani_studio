const crypto = require('crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const OtpVerification = require('../models/OtpVerification');

const router = express.Router();

const GRAPH_VERSION = process.env.WHATSAPP_API_VERSION || 'v27.0';
const PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || '1410598058806512';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const OTP_TEMPLATE_NAME =
  process.env.WHATSAPP_OTP_TEMPLATE || 'radha_rani_login_otp';
const OTP_TEMPLATE_LANG = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'en';

const mailTransport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: Number(process.env.EMAIL_PORT || 2525),
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function hashOtp(code) {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error('Missing OTP_SECRET in environment variables');
  }
  return crypto.createHmac('sha256', secret).update(String(code)).digest('hex');
}

function normalizeEmail(raw = '') {
  return String(raw).trim().toLowerCase();
}

function normalizePhone(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

async function sendWhatsAppAuthOtp(toPhone, otpCode) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'template',
      template: {
        name: OTP_TEMPLATE_NAME,
        language: { code: OTP_TEMPLATE_LANG },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otpCode }],
          },
          {
            type: 'button',
            sub_type: 'copy_code',
            index: '0',
            parameters: [{ type: 'text', text: otpCode }],
          },
        ],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'WhatsApp OTP delivery failed');
  }
  return data;
}

// POST /api/auth/send-email-otp
router.post('/send-email-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid email address.' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpVerification.deleteMany({
      target: email,
      channel: 'email',
      verified: false,
    });
    await OtpVerification.create({
      target: email,
      channel: 'email',
      codeHash: hashOtp(code),
      expiresAt,
    });

    await mailTransport.sendMail({
      from:
        process.env.EMAIL_FROM ||
        'Radha Rani Studio <hello@radharanistudio.in>',
      replyTo: process.env.EMAIL_REPLY_TO || 'radharanistudio2026@gmail.com',
      to: email,
      subject: `${code} is your Radha Rani Studio verification code`,
      text: `Your Radha Rani Studio verification code is ${code}. It expires in 10 minutes. Do not share this code with anyone.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="margin-top: 0; color: #111;">Radha Rani Studio</h2>
          <p>Use this one-time verification code to verify your email address:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 12px 16px; background: #f7f7f7; border-radius: 6px; text-align: center; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 13px;">This code is valid for 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>
      `,
    });

    return res.json({ ok: true, message: 'Verification code sent to email.' });
  } catch (err) {
    console.error('Send Email OTP error:', err.message);
    return res.status(500).json({ error: 'Failed to send email OTP.' });
  }
});

// POST /api/auth/send-whatsapp-otp
router.post('/send-whatsapp-otp', async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone || phone.length < 12) {
      return res
        .status(400)
        .json({ error: 'Please enter a valid 10-digit WhatsApp number.' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OtpVerification.deleteMany({
      target: phone,
      channel: 'whatsapp',
      verified: false,
    });
    await OtpVerification.create({
      target: phone,
      channel: 'whatsapp',
      codeHash: hashOtp(code),
      expiresAt,
    });

    await sendWhatsAppAuthOtp(phone, code);

    return res.json({
      ok: true,
      message: 'Verification code sent on WhatsApp.',
    });
  } catch (err) {
    console.error('Send WhatsApp OTP error:', err.message);
    return res
      .status(500)
      .json({ error: err.message || 'Failed to send WhatsApp OTP.' });
  }
});

async function checkOtpRecord(channel, target, inputCode) {
  const record = await OtpVerification.findOne({
    target,
    channel,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!record || record.expiresAt < new Date()) {
    return {
      ok: false,
      status: 400,
      error: `${channel === 'email' ? 'Email' : 'WhatsApp'} OTP expired or not requested.`,
    };
  }

  if (record.attempts >= 5) {
    return {
      ok: false,
      status: 429,
      error: `Too many ${channel} OTP attempts. Please request a new code.`,
    };
  }

  const expectedBuf = Buffer.from(record.codeHash);
  const actualBuf = Buffer.from(hashOtp(inputCode));
  const isMatch =
    expectedBuf.length === actualBuf.length &&
    crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    return {
      ok: false,
      status: 400,
      error: `Invalid ${channel === 'email' ? 'Email' : 'WhatsApp'} OTP.`,
    };
  }

  record.verified = true;
  await record.save();
  return { ok: true };
}

// POST /api/auth/verify-dual-otp
router.post('/verify-dual-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const phone = normalizePhone(req.body.phone);
    const emailOtp = String(req.body.emailOtp || '').trim();
    const whatsappOtp = String(req.body.whatsappOtp || '').trim();

    if (!email || !phone || !emailOtp || !whatsappOtp) {
      return res.status(400).json({
        error: 'Email, WhatsApp number, and both OTP codes are required.',
      });
    }

    const emailCheck = await checkOtpRecord('email', email, emailOtp);
    if (!emailCheck.ok) {
      return res.status(emailCheck.status).json({ error: emailCheck.error });
    }

    const waCheck = await checkOtpRecord('whatsapp', phone, whatsappOtp);
    if (!waCheck.ok) {
      return res.status(waCheck.status).json({ error: waCheck.error });
    }

    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign(
        { email, phone, verified: true },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      );
    }

    return res.json({
      ok: true,
      message: 'Email and WhatsApp verified successfully.',
      client: { email, phone },
      token,
    });
  } catch (err) {
    console.error('Verify Dual OTP error:', err.message);
    return res.status(500).json({ error: 'OTP verification failed.' });
  }
});

module.exports = router;
