// api/create-payment-intent.js
const Stripe = require('stripe');
const connectDB = require('../db');
const Order = require('../models/Order');

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Connect to the database
    await connectDB();
    
    const { amount, name, email, products } = req.body;
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      metadata: {
        name,
        email
      },
      receipt_email: email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create a pending order in the database
    const order = new Order({
      customerName: name,
      email: email,
      amount: amount,
      products: products || [{ name: 'POUCHY Pot', price: amount, quantity: 1 }],
      paymentIntentId: paymentIntent.id,
      status: 'pending'
    });
    
    await order.save();
    
    // Return the client secret to the frontend
    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      orderId: order._id
    });
  } catch (error) {
    console.error('Payment Intent Error:', error);
    res.status(500).json({ error: error.message });
  }
};