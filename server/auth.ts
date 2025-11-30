import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

export interface AuthRequest extends Request {
  admin?: { id: string; email: string };
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateToken(adminId: string, email: string): string {
  return jwt.sign({ id: adminId, email }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    return decoded;
  } catch {
    return null;
  }
}

export function authenticateAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.admin = decoded;
  next();
}
