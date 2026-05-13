import jwt, { type SignOptions } from "jsonwebtoken";

export interface SessionPayload {
  sub: string;
  username?: string;
  email?: string;
  name?: string;
}

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET is not configured (min 16 chars)");
  }
  return s;
}

export function signSession(
  payload: SessionPayload,
  expiresIn: SignOptions["expiresIn"] = "7d",
): string {
  return jwt.sign(payload, getSecret(), { expiresIn, algorithm: "HS256" });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  if (typeof decoded === "string") throw new Error("Invalid token");
  return decoded as SessionPayload;
}

export function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader);
  return m ? m[1].trim() : null;
}
