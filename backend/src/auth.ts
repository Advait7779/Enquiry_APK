import crypto from 'crypto';
import dotenv from 'dotenv';
import { AuthTokenPayload } from './types';

dotenv.config();

const loginUsername = (process.env.LOGIN_USERNAME || '').trim();
const loginPassword = process.env.LOGIN_PASSWORD || '';
const authSecret = process.env.AUTH_SECRET || '';
const tokenTtlHours = Number(process.env.AUTH_TOKEN_TTL_HOURS || 168);

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value: string): string {
  return crypto.createHmac('sha256', authSecret).update(value).digest('base64url');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function validateAuthConfiguration(isProduction: boolean): void {
  if (!loginUsername || !loginPassword) {
    throw new Error('LOGIN_USERNAME and LOGIN_PASSWORD must be configured');
  }
  if (!Number.isFinite(tokenTtlHours) || tokenTtlHours < 1 || tokenTtlHours > 720) {
    throw new Error('AUTH_TOKEN_TTL_HOURS must be between 1 and 720');
  }
  if (isProduction && authSecret.length < 32) {
    throw new Error('AUTH_SECRET must be a random value of at least 32 characters in production');
  }
  if (!isProduction && !authSecret) {
    throw new Error('AUTH_SECRET must be configured');
  }
}

export function authenticateAdmin(username: string, password: string): boolean {
  return safeEqual(username.trim().toLowerCase(), loginUsername.toLowerCase()) && safeEqual(password, loginPassword);
}

export function createAccessToken(userPayload: {
  sub: string;
  lawyerId?: string | null;
  lawyerName?: string;
  role?: string;
  assignedTasks?: string[];
  authVersion?: number;
}): string {
  const payload: AuthTokenPayload = {
    sub: userPayload.sub,
    lawyerId: userPayload.lawyerId || null,
    lawyerName: userPayload.lawyerName || userPayload.sub,
    role: userPayload.role || 'admin',
    assignedTasks: userPayload.assignedTasks || [],
    authVersion: userPayload.authVersion,
    exp: Math.floor(Date.now() / 1000) + Math.floor(tokenTtlHours * 60 * 60),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    if (!safeEqual(parts[1], sign(parts[0]))) return null;

    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as AuthTokenPayload;
    if (!payload.sub || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getLoginUsername(): string {
  return loginUsername;
}
