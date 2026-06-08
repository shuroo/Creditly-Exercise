import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { Role, User } from "../models/types.js";

export type AuthUser = {
  id: string;
  role: Role;
  bankId?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Dev fallback secret; override with JWT_SECRET in the environment for anything
// beyond local development.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "12h";

/** Sign a JWT carrying the identity bits the RBAC layer needs. */
export function signToken(user: User): string {
  const payload: AuthUser = {
    id: user.id,
    role: user.role,
    ...(user.bankId ? { bankId: user.bankId } : {}),
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/**
 * Verify the Bearer token and attach req.user. Replaces the old header-based
 * mock auth — every protected route now requires a valid token.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or malformed token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = {
      id: decoded.id,
      role: decoded.role,
      ...(decoded.bankId ? { bankId: decoded.bankId } : {}),
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
