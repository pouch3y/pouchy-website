// api/send-order-confirmation.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure transporter
let transporter;

// For production
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
} else {
  // For testing/development - uses Ethereal for testing without real emails
  console.log('Email credentials not found, using Ethereal test account');
}

function generateEmailTemplate(orderDetails) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #3c2415; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #3c2415; color: #f5f0e6; padding: 20px; text-align: center; }
        .footer { background-color: #f5f0e6; padding: 15px; text-align: center; margin-top: 20px; }
        .item { border-bottom: 1px solid #e6dbc9; padding: 10px 0; }
        .total { font-weight: bold; margin-top: 15px; text-align: right; }
        h1, h2, h3 { color: #3c2415; }
        .logo { font-size: 24px; font-weight: bold; letter-spacing: 1px; }
        .logo span { color: #c8973f; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">POU<span>CHY</span></div>
          <p>Order Confirmation</p>
        </div>
        
        <h2>Thank you for your order!</h2>
        <p>We're delighted to confirm your purchase with POUCHY. Your custom snus pot will be crafted with precision and care.</p>
        
        <h3>Order Summary:</h3>
        <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        
        ${orderDetails.products.map(item => `
          <div class="item">
            <p><strong>${item.name}</strong> × ${item.quantity}</p>
            <p>£${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        `).join('')}
        
        <div class="total">
          <p>Subtotal: £${orderDetails.subtotal.toFixed(2)}</p>
          <p>Shipping: £2.99</p>
          <p>Total: £${orderDetails.total.toFixed(2)}</p>
        </div>
        
        <p>Your order will be delivered within 7-14 business days.</p>
        <p>Please reply to this email if you have any specific custom engraving requests for your pot.</p>
        <p>If you have any questions, please contact us at pouch3y@gmail.com</p>
        
        <div class="footer">
          <p>&copy; 2025 POUCHY. All rights reserved.</p>
          <p>Mount Preston Street, Leeds, UK</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendOrderConfirmation(customerEmail, orderDetails) {
  try {
    // If we don't have a configured transporter, create a test account
    if (!transporter) {
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: '"POUCHY" <noreply@pouchy.com>',
      to: customerEmail,
      subject: 'Your POUCHY Order Confirmation',
      html: generateEmailTemplate(orderDetails),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    // For ethereal email, log the test URL
    if (info.messageUrl) {
      console.log('Preview URL: %s', info.messageUrl);
    } else if (nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, products, orderId, total, subtotal } = req.body;

    if (!email || !products || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const orderDetails = {
      products,
      orderId,
      total: total || subtotal + 2.99,
      subtotal: subtotal || 0,
      date: new Date().toLocaleDateString()
    };

    const result = await sendOrderConfirmation(email, orderDetails);

    if (result.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Order confirmation error:', error);
    return res.status(500).json({ error: error.message });
  }
};
