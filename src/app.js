require('dotenv').config();
const express = require('express');

const app = express();

app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes); // Prefix with /api for clarity

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running!' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;