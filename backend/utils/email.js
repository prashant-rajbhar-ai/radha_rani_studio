const { MailtrapClient } = require('mailtrap');
const validator = require('validator');

let mailtrapClient;
let activeClientConfig;

function parseAddress(value, label) {
  const raw = String(value || '').trim();
  if (!raw) {
    throw new Error(`${label} is required. Configure it in backend/config.env or Render Environment Variables.`);
  }

  const match = raw.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const email = (match ? match[2] : raw).trim();
  const name = match && match[1].trim()
    ? match[1].trim().replace(/^['"]|['"]$/g, '')
    : String(process.env.EMAIL_FROM_NAME || 'Radha Rani Studio').trim();

  if (!validator.isEmail(email)) {
    throw new Error(`${label} must contain a valid email address. Received: ${raw}`);
  }

  return { email, name };
}

function getMailtrapClient() {
  const token = String(process.env.MAILTRAP_API_KEY || '').trim();
  if (!token) {
    throw new Error('Mailtrap is not configured. Add MAILTRAP_API_KEY to backend/config.env and Render Environment Variables.');
  }

  const sandbox = String(process.env.MAILTRAP_SANDBOX || 'false').toLowerCase() === 'true';
  const sandboxIdRaw = String(process.env.MAILTRAP_SANDBOX_ID || '').trim();
  const sandboxId = sandboxIdRaw ? Number(sandboxIdRaw) : undefined;

  if (sandbox && (!Number.isSafeInteger(sandboxId) || sandboxId <= 0)) {
    throw new Error('MAILTRAP_SANDBOX_ID must be a positive integer when MAILTRAP_SANDBOX=true.');
  }

  const configKey = `${token}:${sandbox}:${sandboxId || ''}`;
  if (!mailtrapClient || activeClientConfig !== configKey) {
    mailtrapClient = new MailtrapClient({
      token,
      bulk: false,
      sandbox,
      ...(sandbox ? { sandboxId } : {}),
    });
    activeClientConfig = configKey;
  }

  return mailtrapClient;
}

function normalizeRecipients(value) {
  const recipients = (Array.isArray(value) ? value : [value]).filter(Boolean);
  if (!recipients.length) {
    throw new Error('At least one recipient email address is required.');
  }

  return recipients.map((recipient) => {
    if (typeof recipient === 'string') {
      const email = recipient.trim();
      if (!validator.isEmail(email)) throw new Error(`Invalid recipient email address: ${email}`);
      return { email };
    }

    const email = String(recipient.email || '').trim();
    if (!validator.isEmail(email)) throw new Error(`Invalid recipient email address: ${email || '(empty)'}`);
    return {
      email,
      ...(recipient.name ? { name: String(recipient.name).trim() } : {}),
    };
  });
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;

  return attachments.map((attachment) => {
    if (!attachment || !attachment.filename || attachment.content === undefined || attachment.content === null) {
      throw new Error('Every email attachment must include a filename and content.');
    }

    let content = attachment.content;
    if (Buffer.isBuffer(content)) {
      // Mailtrap's Node SDK accepts Buffer content for attachments.
    } else if (content instanceof Uint8Array) {
      content = Buffer.from(content);
    } else if (typeof content === 'string') {
      // String attachment content is interpreted as base64 data.
      content = Buffer.from(content, 'base64');
    } else {
      throw new Error(`Unsupported content type for email attachment: ${attachment.filename}`);
    }

    return {
      filename: String(attachment.filename),
      content,
      disposition: attachment.disposition || 'attachment',
      ...(attachment.content_id ? { content_id: String(attachment.content_id) } : {}),
    };
  });
}

const sendEmail = async (options = {}) => {
  const from = parseAddress(
    process.env.EMAIL_FROM,
    'EMAIL_FROM (example: Radha Rani Studio <hello@radharanistudio.in>)',
  );
  const replyToValue = options.replyTo || process.env.EMAIL_REPLY_TO;
  const replyTo = replyToValue ? parseAddress(replyToValue, 'EMAIL_REPLY_TO') : undefined;
  const recipients = normalizeRecipients(options.email || options.to);
  const subject = String(options.subject || '').trim();
  if (!subject) throw new Error('Email subject is required.');

  const text = String(options.message ?? options.text ?? '').trim();
  const html = options.html ? String(options.html) : undefined;
  if (!text && !html) throw new Error('Email must include a text or HTML body.');

  const payload = {
    from,
    to: recipients,
    subject,
    ...(text ? { text } : {}),
    ...(html ? { html } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(options.category ? { category: String(options.category) } : {}),
    ...(options.attachments ? { attachments: normalizeAttachments(options.attachments) } : {}),
  };

  return getMailtrapClient().send(payload);
};

module.exports = sendEmail;
