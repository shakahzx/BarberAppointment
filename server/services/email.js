const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASS;
  if (!user || !password) {
    throw Object.assign(new Error('Email sending is not configured.'), { status: 503 });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
}

async function sendVerificationEmail({ email, name, code }) {
  const transporter = createTransporter();
  const safeName = escapeHtml(name);
  const sender = process.env.EMAIL_USER;

  try {
    await transporter.sendMail({
      from: `Still / Form <${sender}>`,
      to: email,
      subject: 'Verify your Still / Form account',
      text: `Hi ${name}, your verification code is ${code}. It expires in 10 minutes.`,
      html: emailShell({ title: 'Verify your email', body: `Hi ${safeName}, enter this code to finish creating your account. It expires in 10 minutes.<p class="code">${code}</p><p>If you didn’t request this, you can ignore this email.</p>` }),
    });
  } catch {
    throw Object.assign(new Error('Verification email could not be sent.'), { status: 503 });
  }
}

function emailShell({ title, body, avatarUrl = '' }) {
  const safeAvatarUrl = /^https:\/\//i.test(avatarUrl) ? escapeHtml(avatarUrl) : '';
  const avatar = safeAvatarUrl
    ? `<img class="avatar" src="${safeAvatarUrl}" width="72" height="72" alt="Your barber" />`
    : '<div class="avatar-fallback">SF</div>';
  return `<html><head><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><style>:root{color-scheme:light dark}.email-bg{background:#f6f5f1}.email-card{background:#fff;color:#23241f}.email-muted{color:#77776f}.email-gold{color:#987841}.avatar{width:72px;height:72px;border-radius:50%;object-fit:cover}.avatar-fallback{width:72px;height:72px;border-radius:50%;display:inline-grid;place-items:center;background:#23241f;color:#e4c98f;font:600 20px Arial,sans-serif;line-height:72px;text-align:center}.code{font-size:30px;letter-spacing:8px;font-weight:700;padding:16px 0}@media(prefers-color-scheme:dark){.email-bg{background:#171814!important}.email-card{background:#25261f!important;color:#f6f5f1!important}.email-muted{color:#c4c1b7!important}.email-gold{color:#e4c98f!important}.avatar-fallback{background:#e4c98f!important;color:#23241f!important}}</style></head><body class="email-bg" style="margin:0;padding:24px;background:#f6f5f1;font-family:Arial,sans-serif;color:#23241f"><div class="email-card" style="max-width:560px;margin:0 auto;padding:32px;background:#fff;color:#23241f"><p class="email-gold" style="color:#987841;font-size:12px;letter-spacing:2px">STILL / FORM</p><h1 style="font-weight:500">${escapeHtml(title)}</h1>${avatar}<div style="font-size:15px;line-height:1.7">${body}</div><p class="email-muted" style="margin-top:28px;color:#77776f;font-size:12px">Considered cuts. Unhurried craft.</p></div></body></html>`;
}

async function sendAppointmentEmail({ appointment, kind, manageToken }) {
  const customer = appointment.customer;
  const transporter = createTransporter();
  const details = `${appointment.service?.name || 'Your service'} with ${appointment.barber?.name || 'your barber'} on ${appointment.appointmentDate} at ${appointment.startTime}`;
  const messages = {
    requested: ['Appointment request received', `We received your appointment request: ${details}. The shop will confirm it shortly.`],
    confirmed: ['Appointment confirmed', `Your appointment is confirmed: ${details}.`],
    cancelled: ['Appointment cancelled', `Your appointment has been cancelled: ${details}.`],
    rejected: ['Appointment update', `The shop could not accept this appointment: ${details}. Please choose another time.`],
    upcoming24h: ['Your appointment is tomorrow', `A reminder for your appointment: ${details}. We look forward to seeing you.`],
    upcoming2h: ['Your appointment is coming up', `Your appointment is in about two hours: ${details}. We look forward to seeing you.`],
  };
  const [subject, text] = messages[kind];
  const safeName = escapeHtml(customer.name);
  const safeText = escapeHtml(text);
  const barberAvatar = appointment.barber?.avatarUrl || process.env.BARBER_AVATAR_FALLBACK || '';
  const manageUrl = manageToken
    ? `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/manage-appointment?token=${encodeURIComponent(manageToken)}`
    : '';
  const actionLink = manageUrl
    ? `<p><a style="display:inline-block;padding:12px 18px;background:#23241f;color:#fff;text-decoration:none" href="${escapeHtml(manageUrl)}">Review or change appointment</a></p><p class="email-muted" style="font-size:12px">This private link expires in 48 hours and can be used once.</p>`
    : '';
  await transporter.sendMail({
    from: `Still / Form <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject,
    text: `Hi ${customer.name}, ${text}`,
    html: emailShell({ title: subject, body: `<p>Hi ${safeName}, ${safeText}</p>${actionLink}`, avatarUrl: barberAvatar }),
  });
}

module.exports = { emailShell, sendAppointmentEmail, sendVerificationEmail };