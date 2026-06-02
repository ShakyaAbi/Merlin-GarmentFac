import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config/env";

// Payload carried inside JWT tokens
export type TokenPayload = {
  sub: number;
  email: string;
  role: string;
  organizationId: number;
};

// Creates and signs a new JWT access token
export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions) as string;
};

// Verifies and decodes a JWT access token
export const verifyAccessToken = (
  token: string
): TokenPayload & { iat: number; exp: number } =>
  jwt.verify(token, config.jwtSecret) as unknown as TokenPayload & {
    iat: number;
    exp: number;
  };
