// api/create-checkout-session.js
const Stripe = require('stripe');

// Initialize Stripe with explicit log level
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  telemetry: false, // Disable telemetry to reduce noise in logs
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    console.log('Checkout session request received');
    
    const { email, products, success_url, cancel_url } = req.body;
    
    if (!email || !products || products.length === 0) {
      return res.status(400).json({ error: 'Missing required fields. Email and products are required.' });
    }
    
    console.log(`Processing checkout for email: ${email}, ${products.length} products`);
    
    // Validate minimum amounts
    const productTotal = products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (productTotal < 0.5) {
      return res.status(400).json({ error: 'Total amount must be at least £0.50' });
    }
    
    // Create line items for Stripe
    const lineItems = products.map(product => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: product.name,
        },
        unit_amount: Math.round(product.price * 100), // Convert to cents/pence
      },
      quantity: product.quantity,
    }));
    
    console.log('Creating checkout session with Stripe');
    
    // Define default URLs in case custom ones are not provided
    const defaultSuccessUrl = `https://pouchy-server-a4vslu876-juans-projects-4167736d.vercel.app/order-confirmation.html`;
    const defaultCancelUrl = `https://pouchy-server-a4vslu876-juans-projects-4167736d.vercel.app/`;
    
    // Create Stripe checkout session with custom success and cancel URLs if provided
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || defaultSuccessUrl,
      cancel_url: cancel_url || defaultCancelUrl,
      customer_email: email,
    });
    
    console.log(`Checkout session created: ${session.id}`);
    return res.status(200).json({ url: session.url });
    
  } catch (error) {
    console.error('Stripe Error:', error);
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Unknown error';
    let statusCode = 500;
    
    // Check for specific Stripe errors
    if (error.type === 'StripeCardError') {
      statusCode = 400;
    } else if (error.type === 'StripeInvalidRequestError') {
      statusCode = 400;
    } else if (error.type === 'StripeAPIError') {
      statusCode = 503;
    } else if (error.type === 'StripeConnectionError') {
      statusCode = 503;
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Authentication with Stripe failed. Please check API keys.';
      statusCode = 401;
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      code: error.code || 'unknown',
      type: error.type || 'unknown'
    });
  }
};