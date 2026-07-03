import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import "dotenv/config";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "access-secret-dev";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "refresh-secret-dev";
const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  cedula: string;
  rol: string;
  refugiosPermitidos: string[];
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(payload: {
  sub: string;
  cedula: string;
  rol: string;
  refugiosPermitidos: string[];
}): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: { sub: string; tokenVersion: number }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

export function decodeExpiredAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    try {
      const decoded = jwt.decode(token) as AccessTokenPayload | null;
      return decoded;
    } catch {
      return null;
    }
  }
}
