/**
 * Session tokens (JWT) — edge-safe (no database), so it can also run in proxy.ts.
 * ------------------------------------------------------------------
 * After login we store a signed JWT in an httpOnly cookie. The token only
 * contains the user id and role; everything else is loaded from the DB.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rd_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export type SessionPayload = {
  userId: number;
  role: "ADMIN" | "PROVIDER";
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set in .env and be at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed token for a user */
export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Verify a token; returns null when missing, expired or tampered with */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number" || (payload.role !== "ADMIN" && payload.role !== "PROVIDER")) return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
