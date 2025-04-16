// scripts/seed.js
const mongoose = require('mongoose');
const connectDB = require('../db');
require('dotenv').config();

// Create the Product model schema if it doesn't exist yet
const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  inventory: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model already exists before creating it
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

const products = [
  {
    name: 'COBALT BLUE POT',
    description: 'Personalise your next cobalt coated aluminium pot.',
    price: 12.99,
    color: 'blue',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  },
  {
    name: 'BRONZE POT',
    description: 'Personalise your next bronze coated aluminium pot.',
    price: 12.99,
    color: 'bronze',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  },
  {
    name: 'EBONY BLACK POT',
    description: 'Personalise your next ebony black coated aluminium pot.',
    price: 12.99,
    color: 'black',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  },
  {
    name: 'OLIVE GREEN POT',
    description: 'Personalise your next olive green coated aluminium pot.',
    price: 12.99,
    color: 'green',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  },
  {
    name: 'COCOA BROWN POT',
    description: 'Personalise your next cocoa brown coated aluminium pot.',
    price: 12.99,
    color: 'brown',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  },
  {
    name: 'PEARL PINK POT',
    description: 'Personalise your next pearl pink coated aluminium pot.',
    price: 12.99,
    color: 'pink',
    imageUrl: '/api/placeholder/250/200',
    inventory: 100,
    active: true
  }
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');
    
    // Insert new products
    const result = await Product.insertMany(products);
    console.log(`${result.length} products seeded successfully`);
    
    console.log('Database seeding completed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the function
seedProducts();
