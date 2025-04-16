// db.js
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection string - add this to your .env file
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pouchy';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
