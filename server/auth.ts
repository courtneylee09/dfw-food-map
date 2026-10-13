import type { Request, Response, NextFunction } from "express";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "./db";
import { activityLog, authSessions, verifiers, type Verifier } from "@shared/schema";

// Sign-in for the review page. Admins use ADMIN_PASSWORD; verifiers use their own
// username and password. Both get a session token, sent as X-Session-Token.

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const SESSION_HOURS = 12;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 10;

export type Role = "admin" | "verifier";

export interface Actor {
  role: Role;
  verifierId: string | null;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
    }
  }
}

export class AuthError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// --- passwords ---------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (value: string) => createHash("sha256").update(value).digest();

function adminPasswordMatches(provided: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

// --- lockout after repeated failures (per IP + login name) -------------------

const failures = new Map<string, { count: number; until: number }>();

function lockoutKey(req: Request, name: string) {
  return `${req.ip}|${name.toLowerCase()}`;
}

function checkLockout(key: string) {
  const entry = failures.get(key);
  if (entry && entry.until > Date.now()) {
    throw new AuthError("Too many failed sign-ins. Try again in 15 minutes.", 429);
  }
}

// Returns true when this failure triggers a lockout
function recordFailure(key: string): boolean {
  const entry = failures.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  let locked = false;
  if (entry.count >= MAX_FAILURES) {
    entry.until = Date.now() + LOCKOUT_MS;
    entry.count = 0;
    locked = true;
  }
  failures.set(key, entry);
  return locked;
}

// --- where a sign-in came from ---------------------------------------------------

function describeDevice(userAgent: string): string {
  if (!userAgent) return "Unknown device";
  const browser =
    /Edg\//.test(userAgent) ? "Edge" :
    /OPR\/|Opera/.test(userAgent) ? "Opera" :
    /Chrome\//.test(userAgent) ? "Chrome" :
    /Firefox\//.test(userAgent) ? "Firefox" :
    /Safari\//.test(userAgent) ? "Safari" :
    /curl|python|node|axios|wget/i.test(userAgent) ? "Script" : "Browser";
  const os =
    /iPhone|iPad|iPod/.test(userAgent) ? "iPhone/iPad" :
    /Android/.test(userAgent) ? "Android" :
    /Windows/.test(userAgent) ? "Windows" :
    /Mac OS X|Macintosh/.test(userAgent) ? "Mac" :
    /CrOS/.test(userAgent) ? "Chromebook" :
    /Linux/.test(userAgent) ? "Linux" : "unknown system";
  return `${browser} on ${os}`;
}

function requestOrigin(req: Request) {
  return { ip: req.ip ?? null, device: describeDevice(req.get("user-agent") ?? "") };
}

// Failed sign-ins are logged with what was tried (never the password)
async function logFailedSignIn(req: Request, role: Role, name: string, reason: string, locked: boolean) {
  const actor: Actor = { role, verifierId: null, name };
  await logActivity(actor, locked ? "sign_in_locked" : "sign_in_failed", {
    details: { ...requestOrigin(req), reason },
  });
}

// --- sessions -----------------------------------------------------------------

async function createSession(role: Role, verifierId: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.delete(authSessions).where(lt(authSessions.expiresAt, now));
  await db.insert(authSessions).values({
    tokenHash: sha256(token).toString("hex"),
    role,
    verifierId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000),
  });
  return token;
}

export async function login(
  req: Request,
  input: { role?: string; username?: string; password?: string },
): Promise<{ token: string; actor: Actor }> {
  const password = typeof input.password === "string" ? input.password : "";
  if (!password) throw new AuthError("Enter your password.");

  if (input.role === "admin") {
    if (!process.env.ADMIN_PASSWORD) throw new AuthError("Admin access is not configured", 503);
    const key = lockoutKey(req, "admin");
    checkLockout(key);
    if (!adminPasswordMatches(password)) {
      const locked = recordFailure(key);
      await logFailedSignIn(req, "admin", "Admin", "wrong password", locked);
      throw new AuthError("That password isn't right.", 401);
    }
    failures.delete(key);
    const actor: Actor = { role: "admin", verifierId: null, name: "Admin" };
    const token = await createSession("admin", null);
    await logActivity(actor, "sign_in", { details: requestOrigin(req) });
    return { token, actor };
  }

  if (input.role === "verifier") {
    const username = typeof input.username === "string" ? input.username.trim().toLowerCase() : "";
    if (!username) throw new AuthError("Enter your username.");
    const key = lockoutKey(req, username);
    checkLockout(key);
    const [verifier]: Verifier[] = await db.select().from(verifiers).where(eq(verifiers.username, username)).limit(1);
    // Same message whether the username or the password is wrong
    if (!verifier || !verifier.active || !(await verifyPassword(password, verifier.passwordHash))) {
      const locked = recordFailure(key);
      const reason = !verifier ? "unknown username" : !verifier.active ? "deactivated account" : "wrong password";
      const name = verifier ? verifier.displayName : `Unknown user "${username.slice(0, 40)}"`;
      await logFailedSignIn(req, "verifier", name, reason, locked);
      throw new AuthError("That username and password don't match an active verifier.", 401);
    }
    failures.delete(key);
    await db.update(verifiers).set({ lastLoginAt: new Date() }).where(eq(verifiers.id, verifier.id));
    const actor: Actor = { role: "verifier", verifierId: verifier.id, name: verifier.displayName };
    const token = await createSession("verifier", verifier.id);
    await logActivity(actor, "sign_in", { details: requestOrigin(req) });
    return { token, actor };
  }

  throw new AuthError("Choose Admin or Verifier.");
}

export async function logout(req: Request): Promise<void> {
  const token = req.get("x-session-token");
  if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, sha256(token).toString("hex")));
}

async function actorFromToken(token: string): Promise<Actor | null> {
  const [session] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.tokenHash, sha256(token).toString("hex")), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;
  if (session.role === "admin") return { role: "admin", verifierId: null, name: "Admin" };
  const [verifier]: Verifier[] = await db
    .select()
    .from(verifiers)
    .where(eq(verifiers.id, session.verifierId ?? ""))
    .limit(1);
  if (!verifier || !verifier.active) return null;
  return { role: "verifier", verifierId: verifier.id, name: verifier.displayName };
}

// Middleware: allow the listed roles; sets req.actor
export function requireRole(...roles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.get("x-session-token");
      const actor = token ? await actorFromToken(token) : null;
      if (!actor) return res.status(401).json({ message: "Please sign in again" });
      if (!roles.includes(actor.role)) return res.status(403).json({ message: "Your account can't do that" });
      req.actor = actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// --- activity log ---------------------------------------------------------------

export async function logActivity(
  actor: Actor,
  action: string,
  entry: { resourceId?: string | null; resourceName?: string | null; checkId?: string | null; details?: unknown } = {},
): Promise<void> {
  await db.insert(activityLog).values({
    role: actor.role,
    verifierId: actor.verifierId,
    actorName: actor.name,
    action,
    resourceId: entry.resourceId ?? null,
    resourceName: entry.resourceName ?? null,
    checkId: entry.checkId ?? null,
    details: entry.details ?? null,
  });
}

export async function getActivity(limit = 200) {
  return db.select().from(activityLog).orderBy(desc(activityLog.at)).limit(limit);
}

// --- verifier accounts (admin only) ----------------------------------------------

const USERNAME_PATTERN = /^[a-z0-9._-]{3,40}$/;

function publicVerifier(v: Verifier) {
  return {
    id: v.id,
    username: v.username,
    displayName: v.displayName,
    active: v.active,
    createdAt: v.createdAt,
    lastLoginAt: v.lastLoginAt,
  };
}

export async function listVerifiers() {
  const rows: Verifier[] = await db.select().from(verifiers).orderBy(verifiers.displayName);
  return rows.map(publicVerifier);
}

export async function createVerifier(actor: Actor, input: { username?: string; displayName?: string; password?: string }) {
  const username = (input.username ?? "").trim().toLowerCase();
  const displayName = (input.displayName ?? "").trim();
  const password = input.password ?? "";
  if (!USERNAME_PATTERN.test(username)) {
    throw new AuthError("Usernames are 3–40 characters: lowercase letters, numbers, dots, dashes or underscores.");
  }
  if (!displayName) throw new AuthError("Enter the volunteer's name.");
  if (password.length < MIN_PASSWORD_LENGTH) throw new AuthError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
  const [existing] = await db.select().from(verifiers).where(eq(verifiers.username, username)).limit(1);
  if (existing) throw new AuthError("That username is taken.", 409);

  const [created]: Verifier[] = await db
    .insert(verifiers)
    .values({ username, displayName, passwordHash: await hashPassword(password) })
    .returning();
  await logActivity(actor, "verifier_created", { details: { username, displayName } });
  return publicVerifier(created);
}

export async function updateVerifier(
  actor: Actor,
  id: string,
  input: { active?: boolean; password?: string; displayName?: string },
) {
  const [verifier]: Verifier[] = await db.select().from(verifiers).where(eq(verifiers.id, id)).limit(1);
  if (!verifier) throw new AuthError("Verifier not found", 404);

  const updates: Partial<Verifier> = {};
  const changed: string[] = [];
  if (typeof input.active === "boolean" && input.active !== verifier.active) {
    updates.active = input.active;
    changed.push(input.active ? "reactivated" : "deactivated");
  }
  if (typeof input.displayName === "string" && input.displayName.trim() && input.displayName.trim() !== verifier.displayName) {
    updates.displayName = input.displayName.trim();
    changed.push("renamed");
  }
  if (typeof input.password === "string" && input.password) {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    updates.passwordHash = await hashPassword(input.password);
    changed.push("password reset");
  }
  if (changed.length === 0) return publicVerifier(verifier);

  const [updated]: Verifier[] = await db.update(verifiers).set(updates).where(eq(verifiers.id, id)).returning();
  // Deactivating or resetting a password signs the volunteer out everywhere
  if (updates.active === false || updates.passwordHash) {
    await db.delete(authSessions).where(eq(authSessions.verifierId, id));
  }
  await logActivity(actor, "verifier_updated", { details: { username: verifier.username, changes: changed } });
  return publicVerifier(updated);
}
