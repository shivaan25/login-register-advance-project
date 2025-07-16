const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Service URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(globalLimiter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const authHealth = await axios.get(`${AUTH_SERVICE_URL}/health`);
    const userHealth = await axios.get(`${USER_SERVICE_URL}/health`);
    
    res.json({
      status: 'OK',
      service: 'api-gateway',
      services: {
        auth: authHealth.data,
        user: userHealth.data
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      service: 'api-gateway',
      error: 'One or more services are down'
    });
  }
});

// Specific routes MUST come before general routes to prevent conflicts
// Manual proxy implementation for auth endpoints to avoid middleware conflicts
app.post('/api/register', async (req, res) => {
  try {
    console.log('Proxying register request to:', `${AUTH_SERVICE_URL}/register`);
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Register proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({ error: 'Register service unavailable' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Proxying login request to:', `${AUTH_SERVICE_URL}/login`);
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Login proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({ error: 'Login service unavailable' });
    }
  }
});

// TEMPORARILY DISABLED - General routes (after specific ones)
// Route to Auth Service - CAUSING ROOT PATH PROXY ISSUE
/*
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
  },
  onError: (err, req, res) => {
    console.error('Auth service error:', err);
    res.status(503).json({ error: 'Auth service unavailable' });
  }
}));
*/

// Route to User Service
app.use('/api/users', createProxyMiddleware({
  target: USER_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users'
  },
  onError: (err, req, res) => {
    console.error('User service error:', err);
    res.status(503).json({ error: 'User service unavailable' });
  }
}));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`User Service: ${USER_SERVICE_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
}); 