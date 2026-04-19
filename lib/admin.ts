import { timingSafeEqual } from "node:crypto";

// Vérif constant-time pour éviter les attaques par timing.
export function checkAdminSecret(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || expected.length < 8 || expected === "change-me-too") return false;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
