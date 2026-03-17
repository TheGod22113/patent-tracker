import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// ── Basit şifre hash/karşılaştırma (bcrypt yerine native crypto) ──────────
// Railway'de bcrypt sorun çıkarabilir, bu yüzden native crypto kullanıyoruz
const SALT_LENGTH = 16;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<string> {
  const crypto = await import("crypto");
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const crypto = await import("crypto");
  const [salt, key] = hash.split(":");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString("hex") === key);
    });
  });
}

// ── JWT benzeri session token (cookie tabanlı) ─────────────────────────────
// Basit ama güvenli: HMAC-SHA256 imzalı JSON token
const SECRET = process.env.AUTH_SECRET || process.env.DATABASE_URL || "patent-tracker-secret-key-2024";

async function sign(payload: Record<string, unknown>): Promise<string> {
  const crypto = await import("crypto");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

async function verify(token: string): Promise<Record<string, unknown> | null> {
  const crypto = await import("crypto");
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (signature !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const COOKIE_NAME = "pt-session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 gün

export async function createSession(user: SessionUser): Promise<string> {
  const token = await sign({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + MAX_AGE * 1000,
  });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verify(token);
    if (!payload) return null;
    // Token süresi dolmuş mu?
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ── İlk admin kullanıcı oluşturma ─────────────────────────────────────────
export async function ensureAdminExists(): Promise<void> {
  const count = await prisma.user.count();
  if (count === 0) {
    const hash = await hashPassword("admin123");
    await prisma.user.create({
      data: {
        email: "admin@jagadamba.com",
        passwordHash: hash,
        name: "Admin",
        role: "admin",
      },
    });
    console.log("✅ Varsayılan admin oluşturuldu: admin@jagadamba.com / admin123");
  }
}
