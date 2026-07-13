import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthPayload, UserRole } from "../types";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({ success: false, message: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;

    // Fetch current user from DB to get up-to-date role
    const currentUser = await User.findById(decoded.userId).select("role email name");
    if (!currentUser) {
      res.status(401).json({ success: false, message: "User no longer exists" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: currentUser.email,
      role: currentUser.role,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/**
 * Role-based authorization middleware.
 * Must be used after `authenticate`.
 * @param roles - Allowed roles for the route
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}
