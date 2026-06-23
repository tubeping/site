/**
 * /manage/* 관리자 인증 — HMAC 서명된 쿠키 기반.
 */
import crypto from "crypto";

const COOKIE_NAME = "tp_manage";
const MAX_AGE_SEC = 60 * 60 * 12; // 12시간

function getSecret(): string {
  return process.env.MANAGE_SECRET || "fallback-not-secure";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionCookie(): string {
  const issued = Math.floor(Date.now() / 1000);
  const expires = issued + MAX_AGE_SEC;
  const payload = `${issued}.${expires}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionCookie(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [issuedStr, expiresStr, sig] = parts;
  const expected = sign(`${issuedStr}.${expiresStr}`);
  if (sig !== expected) return false;
  const expires = parseInt(expiresStr, 10);
  if (!expires || expires < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export const MANAGE_COOKIE_NAME = COOKIE_NAME;
export const MANAGE_COOKIE_MAX_AGE = MAX_AGE_SEC;

export function verifyPassword(input: string): boolean {
  const expected = process.env.MANAGE_PASSWORD || "";
  if (!expected || !input) return false;
  // 타이밍 공격 방지
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
