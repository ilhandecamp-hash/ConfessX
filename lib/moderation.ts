// Filtre anti-insultes / anti-spam minimaliste.
// Liste volontairement réduite — à étoffer avec une lib dédiée (leo-profanity, bad-words-fr) en prod.

const BLOCKED_WORDS: string[] = [
  // Insultes FR courantes (échantillon — à compléter)
  "connard", "connasse", "salope", "pute", "pd", "enculé", "enculer",
  "niquer", "nique ta", "nique sa", "ntm",
  // Insultes EN
  "fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot",
  // Spam
  "http://", "https://", "www.", ".com", ".fr", ".net",
];

const SPAM_PATTERNS: RegExp[] = [
  /(.)\1{6,}/i,                 // aaaaaaa
  /[A-Z\s!?]{40,}/,             // CRIS EN MAJ
  /\b(\w+)(\s+\1){3,}\b/i,      // mot mot mot mot
];

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

export function moderate(content: string): ModerationResult {
  const trimmed = content.trim();

  if (trimmed.length < 3) return { ok: false, reason: "Trop court." };
  if (trimmed.length > 280) return { ok: false, reason: "280 caractères max." };

  const lower = trimmed.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return { ok: false, reason: "Contenu non autorisé détecté." };
    }
  }

  for (const rx of SPAM_PATTERNS) {
    if (rx.test(trimmed)) return { ok: false, reason: "Contenu détecté comme spam." };
  }

  return { ok: true };
}
