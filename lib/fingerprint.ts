import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Produit un hash stable et non-réversible à partir de l'IP + User-Agent + secret.
// Utilisé pour anti-spam votes/reports sans stocker d'info personnelle identifiable.
export function getFingerprint(req: Request | NextRequest): string {
  const secret = process.env.FINGERPRINT_SECRET || "dev-secret-please-change";
  const ua = req.headers.get("user-agent") || "unknown";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";

  return createHash("sha256").update(`${ip}|${ua}|${secret}`).digest("hex");
}
