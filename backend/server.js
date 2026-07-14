const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const loanRoutes = require('./routes/loanRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow Vercel deployments and localhost for dev
// FRONTEND_URL = your stable Vercel domain (e.g. https://loan-desk.vercel.app)
// Vercel preview URLs (*.vercel.app) are also allowed for convenience
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Render health checks)
    if (!origin) return callback(null, true);
    // Allow localhost dev
    if (origin.startsWith('http://localhost')) return callback(null, true);
    // Allow all *.vercel.app origins (covers stable + preview deployments)
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Log incoming API calls
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Loan Desk Prototype API Server is running.' });
});

// Base API router mapping
app.use('/api', authRoutes);
app.use('/api', loanRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'An internal server error occurred' });
});

app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Loan Desk API Server is live at http://localhost:${PORT}`);
  console.log(`===================================================`);
});
