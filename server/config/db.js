const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env and configure MongoDB.');
  }

  if (/<[^>]+>|<username>|<password>|<cluster-url>/i.test(mongoUri)) {
    throw new Error('MONGO_URI still contains example placeholders. Set it to your MongoDB Atlas connection string or a local MongoDB URI.');
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = connectDB;
