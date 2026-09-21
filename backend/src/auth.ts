import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

interface AuthTokenPayload {
  sub: string;
  exp: number;
}

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

export function authenticate(username: string, password: string): boolean {
  return safeEqual(username.trim(), loginUsername) && safeEqual(password, loginPassword);
}

export function createAccessToken(): string {
  const payload: AuthTokenPayload = {
    sub: loginUsername,
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
    if (payload.sub !== loginUsername || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getLoginUsername(): string {
  return loginUsername;
}
