/**
 * JWT expiry utilities for checking token validity without external dependencies.
 */

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(
  token: string | null | undefined,
  marginSeconds = 60
): boolean {
  if (!token) {
    return true;
  }
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) {
    // Not a JWT or no exp claim — cannot determine expiry, let the API decide
    return false;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - marginSeconds <= nowSeconds;
}
