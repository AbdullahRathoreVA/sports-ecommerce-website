import { SignJWT, jwtVerify } from "jose";

/**
 * Proxy-safe session primitives — `jose` only.
 *
 * Kept free of Prisma and bcrypt so the request proxy can verify a token
 * without pulling Node-native modules into its bundle. Anything that needs
 * the database belongs in `@/lib/auth`.
 */

export const SESSION_COOKIE = "gl_admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // one working day

export type AdminRole = "OWNER" | "ADMIN" | "SALES" | "EDITOR";

export type SessionClaims = {
  sub: string;
  email: string;
  role: AdminRole;
  /** Mirrors AdminUser.tokenVersion so sessions can be revoked instantly. */
  tv: number;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  // Failing loudly beats signing tokens with a guessable fallback.
  if (!value || value.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters.");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .setSubject(claims.sub)
    .setAudience("gridline-admin")
    .sign(secret());
}

export async function readToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      audience: "gridline-admin",
    });
    return payload as unknown as SessionClaims;
  } catch {
    // Expired, tampered or signed with a rotated secret — all mean no session.
    return null;
  }
}
