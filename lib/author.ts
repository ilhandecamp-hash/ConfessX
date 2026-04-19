import { createHash } from "node:crypto";

// Server-side : transforme le token client (raw) en hash non-réversible
// stocké en DB comme "author_token". Permet de prouver l'ownership
// sans jamais stocker le token brut.
export function hashAuthorToken(raw: string): string {
  const secret = process.env.FINGERPRINT_SECRET || "dev-secret-please-change";
  if (!raw || raw.length < 16) return "";
  return createHash("sha256").update(`author|${raw}|${secret}`).digest("hex");
}
