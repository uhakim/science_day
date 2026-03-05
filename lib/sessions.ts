import { createHmac, timingSafeEqual } from "crypto";
import { getEnv } from "@/lib/env";
import type { StudentSession } from "@/lib/types";

export const SESSION_COOKIE_NAME = "science_day_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const ADMIN_SESSION_COOKIE_NAME = "science_day_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 4;

export interface AdminSession {
  role: "admin";
  iat: number;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  const { sessionSecret } = getEnv();
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

export function createSessionToken(
  payload: Omit<StudentSession, "iat" | "exp">,
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_MAX_AGE_SECONDS;
  const data: StudentSession = { ...payload, iat, exp };
  const body = toBase64Url(JSON.stringify(data));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): StudentSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [body, providedSignature] = parts;
  const expectedSignature = sign(body);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(body)) as StudentSession;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}

export function createAdminToken(): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ADMIN_SESSION_MAX_AGE_SECONDS;
  const data: AdminSession = { role: "admin", iat, exp };
  const body = toBase64Url(JSON.stringify(data));
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyAdminToken(token: string): AdminSession | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, providedSignature] = parts;
  const expectedSignature = sign(body);
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(body)) as AdminSession;
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAdminSessionMaxAgeSeconds(): number {
  return ADMIN_SESSION_MAX_AGE_SECONDS;
}

