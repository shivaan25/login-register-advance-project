const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { prisma, checkDatabaseHealth, disconnect: disconnectDB } = require('./database');
const { connect: connectRedis, disconnect: disconnectRedis, checkRedisHealth, hGetAll, hSet, expire } = require('./redis');

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3001;
const USER_CACHE_TTL = 60; // seconds

// Performance monitoring
let requestCount = 0;
let cacheHitCount = 0;
let cacheMissCount = 0;
let startTime = Date.now();

// Initialize connections
async function initializeServices() {
  try {
    await connectRedis();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Advanced rate limiting for high-scale operations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50000, // Increased limit for high-scale testing
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  requestCount++;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const checkEmailSchema = z.object({
  email: z.string().email()
});

// Enhanced health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();
    const uptime = Date.now() - startTime;
    
    res.json({
      status: dbHealth && redisHealth ? 'OK' : 'DEGRADED',
      service: 'user-service',
      uptime: `${Math.floor(uptime / 1000)}s`,
      metrics: {
        totalRequests: requestCount,
        cacheHitRate: requestCount > 0 ? ((cacheHitCount / requestCount) * 100).toFixed(2) + '%' : '0%',
        cacheHits: cacheHitCount,
        cacheMisses: cacheMissCount
      },
      services: {
        database: dbHealth ? 'OK' : 'ERROR',
        redis: redisHealth ? 'OK' : 'ERROR'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      service: 'user-service',
      error: error.message
    });
  }
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
  const uptime = Date.now() - startTime;
  const rps = requestCount / (uptime / 1000);
  
  res.json({
    requestsPerSecond: rps.toFixed(2),
    totalRequests: requestCount,
    cacheHitRate: requestCount > 0 ? ((cacheHitCount / requestCount) * 100).toFixed(2) + '%' : '0%',
    cacheHits: cacheHitCount,
    cacheMisses: cacheMissCount,
    uptime: `${Math.floor(uptime / 1000)}s`
  });
});

// Create user with optimized caching
app.post('/users', async (req, res) => {
  try {
    const { email, password } = createUserSchema.parse(req.body);
    
    // Check if user exists (with cache)
    const redisKey = `user:email:${email}`;
    const cachedUser = await hGetAll(redisKey);
    if (cachedUser && cachedUser.email) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check database
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      // Cache the existing user
      await hSet(redisKey, {
        id: existingUser.id,
        email: existingUser.email,
        password: existingUser.password,
        createdAt: existingUser.createdAt.toISOString()
      });
      await expire(redisKey, USER_CACHE_TTL);
      
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await prisma.user.create({
      data: { email, password },
      select: { id: true, email: true, createdAt: true }
    });

    // Cache new user
    await hSet(redisKey, {
      id: user.id,
      email: user.email,
      password,
      createdAt: user.createdAt.toISOString()
    });
    await expire(redisKey, USER_CACHE_TTL);

    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check email existence with cache optimization
app.get('/users/check-email', async (req, res) => {
  try {
    const { email } = checkEmailSchema.parse(req.query);
    
    // Check Redis cache first
    const redisKey = `user:email:${email}`;
    const cachedUser = await hGetAll(redisKey);
    if (cachedUser && cachedUser.email) {
      cacheHitCount++;
      return res.json({ exists: true, user: cachedUser });
    }

    // Database lookup
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true }
    });

    if (user) {
      // Cache the result
      await hSet(redisKey, {
        id: user.id,
        email: user.email,
        password: user.password || '',
        createdAt: user.createdAt ? user.createdAt.toISOString() : ''
      });
      await expire(redisKey, USER_CACHE_TTL);
    }

    cacheMissCount++;
    res.json({ exists: !!user, user: user || null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by email with advanced caching
app.get('/users/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const redisKey = `user:email:${email}`;

    // Try Redis cache first
    const cachedUser = await hGetAll(redisKey);
    if (cachedUser && cachedUser.email) {
      cacheHitCount++;
      return res.json({
        id: parseInt(cachedUser.id, 10),
        email: cachedUser.email,
        password: cachedUser.password,
        createdAt: cachedUser.createdAt
      });
    }

    // Fallback to DB
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, password: true, createdAt: true }
    });

    if (!user) {
      cacheMissCount++;
      return res.status(404).json({ error: 'User not found' });
    }

    // Cache in Redis
    await hSet(redisKey, {
      id: user.id,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt.toISOString()
    });
    await expire(redisKey, USER_CACHE_TTL);

    cacheMissCount++;
    res.json({
      id: user.id,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server with service initialization
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    console.log(`User service running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Metrics: http://localhost:${PORT}/metrics`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  await disconnectRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectDB();
  await disconnectRedis();
  process.exit(0);
});

// Start the server
startServer().catch(console.error); 