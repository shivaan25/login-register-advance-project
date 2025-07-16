const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { z } = require('zod');

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 3002;
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service' });
});

// Register user
app.post('/register', async (req, res) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user via User Service
    const userResponse = await axios.post(`${USER_SERVICE_URL}/users`, {
      email,
      password: hashedPassword
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: userResponse.data.id, email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userResponse.data.id,
        email: userResponse.data.email
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    
    if (error.response?.status === 409) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
app.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Get user from User Service
    const userResponse = await axios.get(`${USER_SERVICE_URL}/users/by-email/${email}`);
    const user = userResponse.data;
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    
    if (error.response?.status === 404) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
app.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
}); 