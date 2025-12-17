const nodemailer = require('nodemailer');

// Налаштування для відправки email через Gmail
const createTransporter = () => {
  // Використовуємо змінні середовища або дефолтні значення
  const emailUser = process.env.EMAIL_USER || '';
  const emailPassword = process.env.EMAIL_PASSWORD || '';
  const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const emailPort = process.env.EMAIL_PORT || 587;

  if (!emailUser || !emailPassword) {
    console.warn('⚠️ Email credentials not configured. Email sending will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  });
};

// Відправити email про нову підписку
const sendSubscriptionEmail = async (email, category) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('📧 Email sending disabled (no credentials). Would send to vikafoer@gmail.com:', {
      email,
      category
    });
    return { success: false, error: 'Email not configured' };
  }

  const categoryNames = {
    'colorant': 'Колоранти',
    'mix': 'Колірувальне обладнання',
    'bruker-o': 'Брукер Оптікс (БІЧ)',
    'axs': 'Брукер АХС',
    'filter': 'Фільтри',
    'lab': 'Лабораторка'
  };

  const categoryName = categoryNames[category] || category;

  const mailOptions = {
    from: `"SmartMarket" <${process.env.EMAIL_USER}>`,
    to: 'vikafoer@gmail.com',
    subject: `Нова підписка на персональні ціни - ${categoryName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Нова підписка на персональні ціни</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Категорія:</strong> ${categoryName}</p>
        <p><strong>Дата:</strong> ${new Date().toLocaleString('uk-UA')}</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Цей email був залишений через QR-код на сторінці категорії "${categoryName}".
        </p>
      </div>
    `,
    text: `
Нова підписка на персональні ціни

Email: ${email}
Категорія: ${categoryName}
Дата: ${new Date().toLocaleString('uk-UA')}

Цей email був залишений через QR-код на сторінці категорії "${categoryName}".
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSubscriptionEmail,
  createTransporter
};





