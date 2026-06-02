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
  if (config.authDisabled) {
    const adminEmail = adminSeed.email ?? "admin@gmail.com";
    let user = await userRepo.findByEmail(adminEmail);
    if (!user) {
      const password = adminSeed.password ?? "admin1234";
      const passwordHash = await hashPassword(password);
      user = await userRepo.create({ email: adminEmail, passwordHash, role: "ADMIN" as any, organizationId: 1 });
    }
    req.user = { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId } as any;
    return next();
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
    req.user = {
      id: typeof payload.sub === 'string' ? Number(payload.sub) : payload.sub,
      email: payload.email,
      role: payload.role as any,
      organizationId: payload.organizationId,
    };
    return next();
  } catch (err) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
};
