// ============================================================
// WayGo - Servicio de correo
// provider "console": imprime los correos en consola (desarrollo)
// provider "smtp": usa nodemailer (produccion, requiere SMTP_*)
// ============================================================
const config = require('../config/env');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;
  // Carga diferida para no exigir nodemailer en desarrollo
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.mail.smtp.host,
    port: config.mail.smtp.port,
    secure: config.mail.smtp.port === 465,
    auth: config.mail.smtp.user
      ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass }
      : undefined,
  });
  return transporter;
}

/**
 * Envia un correo. En modo "console" lo imprime en el log del servidor.
 */
async function sendMail({ to, subject, text, html }) {
  if (config.mail.provider === 'console') {
    console.log('\n================ [MAIL:console] ================');
    console.log(`Para:    ${to}`);
    console.log(`Asunto:  ${subject}`);
    console.log('Contenido:');
    console.log(text || html);
    console.log('================================================\n');
    return { delivered: 'console' };
  }
  const t = await getTransporter();
  await t.sendMail({ from: config.mail.from, to, subject, text, html });
  return { delivered: 'smtp' };
}

const appUrl = () => config.clientUrl.replace(/\/$/, '');

/** Correo de confirmacion de cuenta */
async function sendEmailConfirmation(to, token) {
  const link = `${appUrl()}/confirmar-correo?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: 'Confirma tu cuenta en WayGo',
    text: `Bienvenido a WayGo.\n\nConfirma tu correo electronico abriendo este enlace:\n${link}\n\nSi no creaste esta cuenta, ignora este mensaje.`,
    html: `<p>Bienvenido a <b>WayGo</b>.</p><p>Confirma tu correo electronico haciendo clic aqui:</p><p><a href="${link}">${link}</a></p><p>Si no creaste esta cuenta, ignora este mensaje.</p>`,
  });
}

/** Correo de recuperacion de contrasena */
async function sendPasswordReset(to, token) {
  const link = `${appUrl()}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: 'Recuperacion de contrasena - WayGo',
    text: `Recibimos una solicitud para restablecer tu contrasena.\n\nAbre este enlace para continuar (expira en 1 hora):\n${link}\n\nSi no fuiste tu, ignora este mensaje.`,
    html: `<p>Recibimos una solicitud para restablecer tu contrasena.</p><p><a href="${link}">Restablecer contrasena</a> (expira en 1 hora)</p><p>Si no fuiste tu, ignora este mensaje.</p>`,
  });
}

module.exports = { sendMail, sendEmailConfirmation, sendPasswordReset };
