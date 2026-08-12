import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError } from "../utils/errors";
import { config, adminSeed } from "../config/env";
import * as userRepo from "../repositories/userRepository";
import { hashPassword } from "../utils/password";

// Authenticates user via JWT or bypasses when disabled
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Bypass authentication if disabled — ensure seeded admin exists
  const isLocalRequest =
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1' ||
    req.hostname === '::1';

  if (config.authDisabled && isLocalRequest) {
    const adminEmail = adminSeed.email ?? "admin@gmail.com";
    let user = await userRepo.findByEmail(adminEmail);
    if (!user) {
      const password = adminSeed.password ?? "admin1234";
      const passwordHash = await hashPassword(password);
      user = await userRepo.create({ email: adminEmail, passwordHash, role: "ADMIN" as any, organizationId: 1 });
    }
    if (!user) {
      return next(new UnauthorizedError("Unable to bootstrap local admin account"));
    }
    req.user = { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } as any;
    return next();
  }

  if (config.authDisabled && !isLocalRequest) {
    return next(new UnauthorizedError("Authentication bypass is only allowed on localhost"));
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new UnauthorizedError("Missing or invalid Authorization header"),
    );
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    const userId = typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub;
    if (!Number.isInteger(userId)) {
      return next(new UnauthorizedError("Invalid access token subject"));
    }

    // Resolve authorization from the database on every request so role changes,
    // removals, and organization changes take effect before token expiry.
    const user = await userRepo.findById(userId);
    if (!user) {
      return next(new UnauthorizedError("User account is no longer active"));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    return next();
  } catch (err) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
};
