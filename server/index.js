import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './src/config/db.js';

// Import Routes
import escrowRoutes from './src/modules/escrow/escrow.routes.js';
import callRoutes from './src/modules/call/call.routes.js';
import submissionRoutes from './src/modules/submission/submission.routes.js';

dotenv.config();

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "*", 
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'API is running...',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/escrow', escrowRoutes);
app.use('/api/call', callRoutes);
app.use('/api/submission', submissionRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// REQUIRED FOR VERCEL: Export the app
export default app;

// Only run app.listen locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}