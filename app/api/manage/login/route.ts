import { NextResponse } from "next/server";
import { verifyPassword, createSessionCookie, MANAGE_COOKIE_NAME, MANAGE_COOKIE_MAX_AGE } from "@/lib/manage-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    password = body?.password || "";
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const cookieValue = createSessionCookie();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: MANAGE_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MANAGE_COOKIE_MAX_AGE,
  });
  return res;
}
