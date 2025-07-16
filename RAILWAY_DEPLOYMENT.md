# Railway Deployment Guide for High-Scale Microservices

This guide will help you deploy your 100K RPS authentication system on Railway.

## 🚀 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repo
3. **Railway CLI** (optional): `npm install -g @railway/cli`

## 📋 Step-by-Step Deployment

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

### Step 2: Add Database (PostgreSQL)

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Note the connection details (you'll need them later)

### Step 3: Add Redis

1. Click "New" again
2. Select "Database" → "Redis"
3. Note the connection details

### Step 4: Deploy User Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to: `services/user-service`
4. Add these environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   REDIS_URL=your_redis_connection_string
   NODE_ENV=production
   ```
5. Deploy the service

### Step 5: Deploy Auth Service

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to: `services/auth-service`
4. Add these environment variables:
   ```
   USER_SERVICE_URL=https://your-user-service-url.railway.app
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   NODE_ENV=production
   ```
5. Deploy the service

### Step 6: Deploy API Gateway

1. Click "New" → "GitHub Repo"
2. Select your repository
3. Set the **Root Directory** to: `services/api-gateway`
4. Add these environment variables:
   ```
   AUTH_SERVICE_URL=https://your-auth-service-url.railway.app
   USER_SERVICE_URL=https://your-user-service-url.railway.app
   NODE_ENV=production
   ```
5. Deploy the service

### Step 7: Set Up Custom Domain (Optional)

1. In your API Gateway service
2. Go to "Settings" → "Domains"
3. Add your custom domain

## 🔧 Environment Variables Reference

### User Service
```env
DATABASE_URL=postgresql://username:password@host:port/database
REDIS_URL=redis://username:password@host:port
NODE_ENV=production
```

### Auth Service
```env
USER_SERVICE_URL=https://your-user-service-url.railway.app
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=production
```

### API Gateway
```env
AUTH_SERVICE_URL=https://your-auth-service-url.railway.app
USER_SERVICE_URL=https://your-user-service-url.railway.app
NODE_ENV=production
```

## 📊 Scaling Configuration

### For 100K RPS, Railway recommends:

1. **User Service**: 2-4 instances
2. **Auth Service**: 2-4 instances  
3. **API Gateway**: 2-4 instances

### To scale services:

1. Go to your service in Railway
2. Click "Settings"
3. Under "Scaling", increase the number of instances
4. Railway will automatically load balance between instances

## 🔍 Monitoring & Health Checks

### Health Check Endpoints:
- **API Gateway**: `https://your-domain.railway.app/health`
- **Auth Service**: `https://your-auth-service.railway.app/health`
- **User Service**: `https://your-user-service.railway.app/health`

### Metrics Endpoints:
- **API Gateway**: `https://your-domain.railway.app/metrics`
- **User Service**: `https://your-user-service.railway.app/metrics`

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://your-domain.railway.app/health
```

### 2. Register a User
```bash
curl -X POST https://your-domain.railway.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

### 3. Login
```bash
curl -X POST https://your-domain.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'
```

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL service is running

2. **Redis Connection Failed**
   - Check `REDIS_URL` environment variable
   - Ensure Redis service is running

3. **Service Communication Failed**
   - Check service URLs in environment variables
   - Ensure all services are deployed and healthy

4. **Build Failures**
   - Check Dockerfile syntax
   - Ensure all dependencies are in package.json

### Logs:
- View logs in Railway dashboard for each service
- Use `railway logs` command if using CLI

## 📈 Performance Optimization

### Railway Auto-Scaling:
- Railway automatically scales based on CPU/memory usage
- Set up alerts for high resource usage

### Database Optimization:
- Use Railway's managed PostgreSQL with connection pooling
- Monitor query performance

### Redis Optimization:
- Use Railway's managed Redis
- Monitor memory usage and cache hit rates

## 🔐 Security Best Practices

1. **Change JWT Secret**: Use a strong, unique JWT secret
2. **Environment Variables**: Never commit secrets to Git
3. **HTTPS**: Railway provides SSL certificates automatically
4. **Rate Limiting**: Already configured in the services

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: For code-related issues

---

## 🎯 Expected Performance on Railway

With proper scaling and optimization:
- **Requests/Second**: 10,000-50,000+ (depending on plan)
- **Response Time**: 50-200ms average
- **Uptime**: 99.9%+
- **Auto-scaling**: Based on demand

For 100K RPS, consider:
- **Railway Pro Plan** for higher limits
- **Multiple regions** for global distribution
- **CDN** for static assets
- **Database read replicas** for high read loads 