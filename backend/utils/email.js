const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USERNAME;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('Email service is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USERNAME and EMAIL_PASSWORD in Render environment variables.');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.EMAIL_SECURE === 'true' || port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  return transporter;
}

const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Radha Rani Studio <info@radharanistudio.in>',
    to: options.email,
    subject: options.subject,
    text: options.message || '',
    ...(options.html ? { html: options.html } : {}),
    ...(Array.isArray(options.attachments) && options.attachments.length
      ? { attachments: options.attachments }
      : {}),
  };

  return getTransporter().sendMail(mailOptions);
};

module.exports = sendEmail;
