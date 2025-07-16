const { createClient } = require('redis');

// Redis connection pool configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_POOL_SIZE = parseInt(process.env.REDIS_POOL_SIZE) || 20;

// Create Redis client with optimized settings
const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Redis connection failed after 10 retries');
        return false;
      }
      return Math.min(retries * 100, 3000);
    }
  },
  // Performance optimizations
  disableOfflineQueue: true,
  maxRetriesPerRequest: 3
});

// Connection management
let isConnected = false;

redisClient.on('connect', () => {
  console.log('Redis connected');
  isConnected = true;
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
  isConnected = false;
});

redisClient.on('end', () => {
  console.log('Redis disconnected');
  isConnected = false;
});

// Connect to Redis
async function connect() {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}

// Health check for Redis
async function checkRedisHealth() {
  try {
    if (!isConnected) {
      return false;
    }
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Optimized hash operations with error handling
async function hGetAll(key) {
  try {
    return await redisClient.hGetAll(key);
  } catch (error) {
    console.error('Redis hGetAll error:', error);
    return null;
  }
}

async function hSet(key, data) {
  try {
    return await redisClient.hSet(key, data);
  } catch (error) {
    console.error('Redis hSet error:', error);
    throw error;
  }
}

async function expire(key, ttl) {
  try {
    return await redisClient.expire(key, ttl);
  } catch (error) {
    console.error('Redis expire error:', error);
    throw error;
  }
}

// Graceful shutdown
async function disconnect() {
  try {
    await redisClient.quit();
  } catch (error) {
    console.error('Error disconnecting Redis:', error);
  }
}

module.exports = {
  redisClient,
  connect,
  disconnect,
  checkRedisHealth,
  isConnected: () => isConnected,
  hGetAll,
  hSet,
  expire
}; 