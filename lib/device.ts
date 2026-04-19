"use client";

// ============================================================
// Client-side : gère un UUID persistant en localStorage.
// Ce token identifie "ce device" pour : delete, edit, mes posts.
// L'utilisateur reste anonyme : le token n'est lié à aucun PII.
// ============================================================

const KEY = "confessx_device_token";

export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem(KEY);
  if (!t) {
    t = crypto.randomUUID() + "-" + crypto.randomUUID();
    localStorage.setItem(KEY, t);
  }
  return t;
}

export function peekDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function resetDeviceToken(): string {
  if (typeof window === "undefined") return "";
  const t = crypto.randomUUID() + "-" + crypto.randomUUID();
  localStorage.setItem(KEY, t);
  return t;
}
