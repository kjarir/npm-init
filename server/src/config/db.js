import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Check if MONGO_URI is configured
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI not configured in .env file');
      console.warn('⚠️  Database connection skipped');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are now default in Mongoose 6+, but included for clarity
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Make sure MongoDB is running and MONGO_URI is correct');
    
    // Don't exit in development - allow server to run without DB for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

export default connectDB;
