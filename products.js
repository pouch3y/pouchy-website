// api/products.js
const connectDB = require('../db');
const Product = require('../models/Product');

module.exports = async (req, res) => {
  // Connect to database
  await connectDB();
  
  if (req.method === 'GET') {
    try {
      const products = await Product.find({ active: true });
      return res.status(200).json(products);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};
