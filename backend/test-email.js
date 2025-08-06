require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'sgtmgamer@gmail.com',
      subject: 'Teste SMTP Hostinger',
      text: 'Este é um teste simples do Nodemailer com Hostinger!',
    });
    console.log('E-mail enviado:', info.response);
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

sendTestEmail();
