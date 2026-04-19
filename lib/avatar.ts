// Génère un avatar (couleur + emoji) déterministe depuis n'importe quelle string.
// Utilisé pour que chaque post/commentaire ait une identité visuelle unique
// mais totalement anonyme (dérivée de l'id).

const COLORS = [
  "#ff3b6b", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
];

const EMOJIS = [
  "👻", "🤫", "🙈", "🙊", "😈", "😎", "🤡", "🤖", "👽", "👾",
  "🦊", "🐺", "🐱", "🦝", "🦉", "🦄", "🐙", "🐸", "🐲", "🦖",
  "🌵", "🔥", "⚡", "🌙", "⭐", "💀", "👑", "💎", "🎭", "🧿",
];

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getAvatar(seed: string): { color: string; emoji: string } {
  const h = hashStr(seed);
  return {
    color: COLORS[h % COLORS.length],
    emoji: EMOJIS[Math.floor(h / COLORS.length) % EMOJIS.length],
  };
}
