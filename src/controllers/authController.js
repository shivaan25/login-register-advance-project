const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const redis = require('redis');
const redisClient = redis.createClient(); // Configure as needed

redisClient.connect().catch(console.error);

const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

exports.login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({ message: 'Login successful' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
    }
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const take = parseInt(req.query.take, 10) || 10;
    const cursor = req.query.cursor ? parseInt(req.query.cursor, 10) : null;
    const cacheKey = `users:${take}:${cursor || 0}`;

    // Try to get from Redis cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const prismaCursor = cursor ? { id: cursor } : undefined;
    const users = await prisma.user.findMany({
      take: take + 1,
      ...(prismaCursor && { skip: 1, cursor: prismaCursor }),
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true },
    });

    let nextCursor = null;
    if (users.length > take) {
      const nextUser = users.pop();
      nextCursor = nextUser.id;
    }

    const response = { users, nextCursor };

    // Cache the result in Redis for 60 seconds
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

    res.json(response);
  } catch (err) {
    next(err);
  }
}; 