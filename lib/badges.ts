export interface Badge {
  id: string;
  label: string;
  emoji: string;
  min: number;
  color: string;
}

export const BADGES: Badge[] = [
  { id: "novice",    label: "Novice",             emoji: "🌱", min: 0,     color: "#84cc16" },
  { id: "whisper",   label: "Chuchoteur",         emoji: "🤫", min: 50,    color: "#06b6d4" },
  { id: "confessor", label: "Confesseur",         emoji: "🗣️", min: 200,   color: "#8b5cf6" },
  { id: "devil",     label: "Avocat du Diable",   emoji: "😈", min: 1000,  color: "#ff3b6b" },
  { id: "legend",    label: "Légende",            emoji: "👑", min: 5000,  color: "#f59e0b" },
];

export function getBadge(karma: number): Badge {
  let current = BADGES[0];
  for (const b of BADGES) {
    if (karma >= b.min) current = b;
  }
  return current;
}

export function nextBadge(karma: number): Badge | null {
  return BADGES.find((b) => b.min > karma) || null;
}
