import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config';
import { testConnection } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/activityLogger';
import { sanitizeBody } from './middleware/validation';

// Create Express app
const app: Express = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Request logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize request body
app.use(sanitizeBody);

// Activity logging
app.use(requestLogger);

// Static files (for uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

// API routes
app.use(`/api/${config.apiVersion}`, routes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'CarWash POS API',
    version: '1.0.0',
    status: 'running',
    environment: config.env,
    documentation: `/api/${config.apiVersion}`,
  });
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbHealthy = await testConnection();
  const status = dbHealthy ? 'healthy' : 'unhealthy';
  const statusCode = dbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close server
  server.close(async () => {
    console.log('HTTP server closed.');

    // Close database connections
    const { closePool } = await import('./config/database');
    await closePool();

    console.log('Database connections closed.');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Start server
const PORT = config.port;
const server = app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚗  CarWash POS API Server                                 ║
║                                                              ║
║   Environment: ${config.env.padEnd(44)}║
║   Port: ${PORT.toString().padEnd(51)}║
║   API Version: ${config.apiVersion.padEnd(44)}║
║                                                              ║
║   API URL: http://localhost:${PORT}/api/${config.apiVersion}                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Test database connection
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log('✅ Database connection established');
  } else {
    console.error('❌ Database connection failed');
  }
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
