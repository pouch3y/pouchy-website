// api/webhook.js
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Read keys from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// This tells Vercel to treat the request body as a raw stream
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

function generateEmailTemplate(orderDetails, customerName) {
  return `
    <div style="font-family: Arial, sans-serif; color: #3c2415; padding: 20px; max-width: 600px; margin: auto;">
      <h2 style="color: #c8973f;">Thank you for your order, ${customerName || 'Valued Customer'}!</h2>
      <p>Your custom snus pots are being prepared and will be shipped shortly.</p>

      <h3 style="margin-top: 30px;">Order Summary</h3>
      ${orderDetails.products.map(product => `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e6dbc9;">
          <p><strong>${product.name}</strong> × ${product.quantity || 1}</p>
          <p>£${(product.price * (product.quantity || 1)).toFixed(2)}</p>
        </div>
      `).join('')}
      
      <div style="margin-top: 20px; text-align: right;">
        <p><strong>Subtotal:</strong> £${orderDetails.subtotal.toFixed(2)}</p>
        <p><strong>Shipping:</strong> £2.99</p>
        <p style="font-size: 1.2em;"><strong>Total:</strong> £${orderDetails.total.toFixed(2)}</p>
      </div>
      
      ${orderDetails.shippingAddress ? `
        <div style="margin-top: 30px; padding: 15px; background-color: #f5f0e6; border-radius: 8px;">
          <h3 style="margin-top: 0;">Shipping to:</h3>
          <p>${orderDetails.shippingAddress.line1 || ''}</p>
          ${orderDetails.shippingAddress.line2 ? `<p>${orderDetails.shippingAddress.line2}</p>` : ''}
          <p>${orderDetails.shippingAddress.city || ''}, ${orderDetails.shippingAddress.postalCode || ''}</p>
          <p>${orderDetails.shippingAddress.country || ''}</p>
        </div>
      ` : ''}

      <p style="margin-top: 30px;">Please reply to this email if you have any custom engraving requests for your snus pot(s).</p>
      <p>If you have any questions, feel free to contact us at pouch3y@gmail.com.</p>

      <p style="margin-top: 40px;">Cheers,<br><strong>The POUCHY Team</strong></p>
      <hr style="margin-top: 40px; border: none; border-top: 1px solid #e6dbc9;" />
      <p style="font-size: 0.9em; color: #6d584a;">This is an automated email. © 2025 POUCHY. All rights reserved.</p>
    </div>
  `;
}

async function sendOrderConfirmation(customerEmail, orderDetails, customerName) {
  try {
    // Setup email transporter - try to use configured email first
    let transporter;
    
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      // Use configured email
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      // Use Gmail if available
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
    } else {
      // Create an Ethereal test account for testing
      console.log('No email credentials found, using Ethereal test account');
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

    // Send the email
    const mailOptions = {
      from: `"POUCHY" <${process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@pouchy.com'}>`,
      to: customerEmail,
      subject: 'Your POUCHY Order Confirmation',
      html: generateEmailTemplate(orderDetails, customerName),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📬 Confirmation email sent:', info.messageId);
    
    // Log Ethereal URL for testing if applicable
    if (info.messageUrl) {
      console.log('Preview URL: %s', info.messageUrl);
    } else if (nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = async (req, res) => {
  // Add detailed debugging for the webhook request
  console.log('Webhook request received');
  console.log('Request method:', req.method);
  console.log('Stripe-Signature header present:', !!req.headers['stripe-signature']);
  
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // First, let's try a simple response to see if the 401 issue persists
  // This helps determine if the issue is with auth or with the processing logic
  if (req.headers['x-test-webhook']) {
    console.log('Test webhook detected, sending simple response');
    return res.status(200).json({ received: true, test: true });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    console.error('❌ Missing Stripe signature header');
    return res.status(400).send('Webhook Error: Missing stripe-signature header');
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
    return res.status(500).send('Server Configuration Error: Missing webhook secret');
  }

  // Collect the raw body data for Stripe signature verification
  let rawBody = '';

  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', async () => {
    console.log('Finished collecting request body');
    
    // Debugging for raw request body (be careful with sensitive data)
    console.log('Raw body length:', rawBody.length);
    
    // First, send an immediate 200 response to Stripe to prevent retries
    // We'll handle the event processing asynchronously
    res.status(200).json({ received: true });
    
    let event;
    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        Buffer.from(rawBody),
        sig,
        endpointSecret
      );

      console.log('✅ Verified event:', event.type);

      // Handle checkout.session.completed event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        try {
          // Retrieve the session with line items
          const completedSession = await stripe.checkout.sessions.retrieve(
            session.id,
            { expand: ['line_items'] }
          );
          
          console.log('Successfully retrieved completed session details');
          
          // Format the order details
          const products = completedSession.line_items.data.map(item => ({
            name: item.description || (item.price?.product?.name || 'POUCHY Pot'),
            price: item.amount_total / 100, // Convert from cents to pounds
            quantity: item.quantity
          }));
          
          const subtotal = completedSession.amount_subtotal / 100;
          const total = completedSession.amount_total / 100;
          
          // Prepare order details for the email
          const orderDetails = {
            products,
            subtotal,
            total,
            orderId: session.id,
            shippingAddress: session.customer_details?.address ? {
              line1: session.customer_details.address.line1,
              line2: session.customer_details.address.line2,
              city: session.customer_details.address.city,
              postalCode: session.customer_details.address.postal_code,
              country: session.customer_details.address.country
            } : null
          };

          console.log('Prepared order details for email');

          // Send confirmation email
          const emailResult = await sendOrderConfirmation(
            session.customer_details.email,
            orderDetails,
            session.customer_details.name
          );
          
          if (emailResult.success) {
            console.log(`✅ Order confirmation email sent to ${session.customer_details.email}`);
          } else {
            console.error(`❌ Failed to send email: ${emailResult.error}`);
          }
        } catch (processError) {
          console.error('❌ Error processing checkout event:', processError);
          console.error('Error details:', {
            message: processError.message,
            stack: processError.stack,
            type: processError.type
          });
        }
      }
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      console.error('Error details:', {
        headers: req.headers,
        signatureHeader: sig,
        errorType: error.type,
        errorCode: error.code,
        stack: error.stack
      });
      
      // We've already sent a 200 response above, so we don't need to send an error response here
    }
  });
};