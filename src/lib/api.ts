import "server-only";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "./errors";

const requests = new Map<string, { count: number; expires: number }>();
export function guard(request: Request) {
  const code = process.env.DEMO_ACCESS_CODE?.trim();
  if (code) {
    const supplied = request.headers.get("x-demo-access-code") || "";
    const a = Buffer.from(code),
      b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new AppError(
        "ACCESS_CODE",
        "Enter the demo access code to continue.",
        401,
      );
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new AppError(
      "ORIGIN",
      "Send requests from the app's own origin.",
      403,
    );
  const now = Date.now();
  for (const [key, value] of requests)
    if (value.expires <= now) requests.delete(key);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  for (const [key, limit] of [
    [ip, 40],
    ["__all", 200],
  ] as const) {
    const count = requests.get(key) || {
      count: 0,
      expires: now + 15 * 60 * 1000,
    };
    if (count.count >= limit || requests.size > 2000)
      throw new AppError(
        "RATE_LIMIT",
        "The demo request limit was reached. Please try again later.",
        429,
      );
    count.count++;
    requests.set(key, count);
  }
}
export async function readBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new AppError("CONTENT_TYPE", "Send JSON content.", 415);
  if (Number(request.headers.get("content-length") || 0) > 16000)
    throw new AppError("TOO_LARGE", "The request is too large.", 413);
  const text = await request.text();
  if (text.length > 16000)
    throw new AppError("TOO_LARGE", "The request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("BAD_JSON", "The request could not be read.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof AppError)
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  if (error instanceof z.ZodError)
    return Response.json(
      {
        error: error.issues[0]?.message || "Invalid request.",
        code: "VALIDATION",
      },
      { status: 400 },
    );
  // Do not return upstream exceptions or URLs; they can contain credentials.
  return Response.json(
    {
      error: "The request could not be completed. Please try again.",
      code: "INTERNAL",
    },
    { status: 500 },
  );
}
