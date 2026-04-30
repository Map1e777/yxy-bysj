import crypto from 'crypto';

const DEFAULT_SECRET = process.env.AUTH_SECRET || 'campus_shuttle_dev_secret';
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

export function signToken(payload) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  };
  const encodedPayload = base64url(JSON.stringify(body));
  const signature = base64url(
    crypto.createHmac('sha256', DEFAULT_SECRET).update(encodedPayload).digest()
  );
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  const [encodedPayload, signature] = String(token || '').split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid token');
  }

  const expectedSignature = base64url(
    crypto.createHmac('sha256', DEFAULT_SECRET).update(encodedPayload).digest()
  );
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(decodeBase64url(encodedPayload));
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}
