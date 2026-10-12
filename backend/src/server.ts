import compression from 'compression';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import http from 'http';
import os from 'os';
import { dbService, disconnectDatabase, initDatabase } from './config/db';
import enquiryRoutes from './routes/enquiryRoutes';
import statsRoutes from './routes/statsRoutes';
import lawyerRoutes from './routes/lawyerRoutes';
import financeRoutes from './routes/financeRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { getOfficeTimeOffsetMinutes } from './utils/time';
import { validateSmsConfiguration } from './services/smsService';
import { validateNotificationEncryptionConfiguration } from './services/notificationGatewayService';
import { startNotificationWorker, stopNotificationWorker } from './services/notificationWorker';
import {
  authenticateAdmin,
  createAccessToken,
  getLoginUsername,
  validateAuthConfiguration,
  verifyAccessToken,
  verifyPassword,
} from './auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const apiKey = (process.env.API_KEY || '').trim();
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (!origin || (!isProduction && allowedOrigins.length === 0) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  maxAge: 86400
}));
app.use(express.json({ limit: '32kb' }));

app.use('/api/v1', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const routeWithoutQuery = req.originalUrl.split('?')[0];
    console.log(`[${req.method}] ${routeWithoutQuery} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Advocate Office Client Enquiry API'
  });
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX || 1000),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please wait and try again.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

function hasValidApiKey(candidate: string): boolean {
  const suppliedBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(apiKey);
  if (!apiKey || suppliedBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

async function requireAuthentication(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    const verified = verifyAccessToken(bearerMatch[1]);
    if (verified) {
      if (verified.lawyerId) {
        try {
          const current = await dbService.getLawyerAuthById(verified.lawyerId);
          if (!current || !current.isActive || current.authVersion !== verified.authVersion) {
            res.status(401).json({ success: false, message: 'Your account access changed. Please sign in again.' });
            return;
          }
          verified.lawyerName = current.name;
          verified.role = 'lawyer';
          verified.assignedTasks = current.assignedTasks;
        } catch {
          res.status(503).json({ success: false, message: 'Could not verify your account. Please try again.' });
          return;
        }
      }
      (req as any).user = verified;
      next();
      return;
    }
  }

  const supplied = req.header('x-api-key') || '';
  if (hasValidApiKey(supplied)) {
    (req as any).user = { sub: 'service-api', role: 'service', lawyerId: null };
    next();
    return;
  }

  res.status(401).json({ success: false, message: 'Your login session is missing or has expired.' });
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (user?.role === 'admin') {
    next();
    return;
  }
  res.status(403).json({ success: false, message: 'Administrator access is required for this action.' });
}

app.use('/api/v1', apiLimiter);

app.post('/api/v1/auth/login', loginLimiter, async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    res.status(400).json({ success: false, message: 'Username and password are required.' });
    return;
  }

  // 1. Check Chamber Master Admin Credentials
  if (authenticateAdmin(username, password)) {
    const token = createAccessToken({
      sub: getLoginUsername(),
      role: 'admin',
    });
    res.json({
      success: true,
      data: {
        token,
        username: getLoginUsername(),
        role: 'admin',
        lawyerId: null,
      },
    });
    return;
  }

  // 2. Check Junior Lawyer Credentials from database
  try {
    const lawyer = await dbService.findLawyerByUsername(username);
    if (lawyer) {
      if (!lawyer.isActive) {
        res.status(403).json({ success: false, message: 'This lawyer account has been deactivated by the admin.' });
        return;
      }
      if (lawyer.passwordHash && verifyPassword(password, lawyer.passwordHash)) {
        const token = createAccessToken({
          sub: lawyer.username || lawyer.name,
          lawyerId: lawyer.id,
          lawyerName: lawyer.name,
          role: 'lawyer',
          assignedTasks: lawyer.assignedTasks || [],
          authVersion: lawyer.authVersion || 1,
        });
        res.json({
          success: true,
          data: {
            token,
            username: lawyer.username || lawyer.name,
            lawyerName: lawyer.name,
            role: 'lawyer',
            lawyerId: lawyer.id,
            assignedTasks: lawyer.assignedTasks || [],
          },
        });
        return;
      }
    }
  } catch (dbErr) {
    console.error('Login database lookup error:', dbErr);
  }

  res.status(401).json({ success: false, message: 'Username or password is incorrect.' });
});

app.get('/api/v1/auth/session', requireAuthentication, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    data: {
      username: user.sub,
      lawyerId: user?.lawyerId || null,
      lawyerName: user?.lawyerName || null,
      role: user.role,
      assignedTasks: user?.assignedTasks || [],
    },
  });
});

app.use('/api/v1', requireAuthentication);
app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/lawyers', (req, res, next) => req.method === 'GET' ? next() : requireAdmin(req, res, next), lawyerRoutes);
app.use('/api/v1/admin/fees', requireAdmin, financeRoutes);
app.use('/api/v1/settings', requireAdmin, settingsRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const isCorsError = err.message === 'Origin is not allowed by CORS';
  const isBadRequest = err.status === 400;
  if (isCorsError || isBadRequest) {
    console.warn(`Request rejected: ${isCorsError ? 'CORS origin not allowed' : 'invalid JSON body'}`);
  } else {
    console.error('Unhandled error:', err);
  }
  res.status(isCorsError ? 403 : isBadRequest ? 400 : 500).json({
    success: false,
    message: isCorsError ? err.message : isBadRequest ? 'Invalid JSON request body' : 'Internal Server Error'
  });
});

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const key in interfaces) {
    for (const network of interfaces[key] || []) {
      if (network.family === 'IPv4' && !network.internal) addresses.push(network.address);
    }
  }
  return addresses;
}

async function startServer(): Promise<void> {
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be a valid TCP port');
  if (isProduction && apiKey.length < 24) {
    throw new Error('API_KEY must be set to a random value of at least 24 characters in production');
  }
  validateAuthConfiguration(isProduction);
  validateNotificationEncryptionConfiguration(isProduction);
  validateSmsConfiguration(isProduction);
  getOfficeTimeOffsetMinutes();

  await initDatabase();
  startNotificationWorker();
  const server = http.createServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`Advocate Office Backend API is running on ${HOST}:${PORT}`);
    console.log(`Local health: http://localhost:${PORT}/api/v1/health`);
    if (!isProduction) {
      getLocalIpAddresses().forEach((ip) => console.log(`Expo device: http://${ip}:${PORT}/api/v1/health`));
    }
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received; closing the API server`);
    stopNotificationWorker();
    server.close(() => {
      disconnectDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error('Database shutdown failed:', error);
          process.exit(1);
        });
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Backend startup failed:', error);
  process.exit(1);
});
