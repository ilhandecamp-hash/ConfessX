import { getAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
  seed: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-6 w-6 text-sm",
  md: "h-8 w-8 text-base",
  lg: "h-10 w-10 text-lg",
};

export function Avatar({ seed, size = "sm", className }: Props) {
  const { color, emoji } = getAvatar(seed);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full ring-1 ring-black/30",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color + "33" }} // 20% opacity bg
      aria-hidden
    >
      <span className="leading-none">{emoji}</span>
    </span>
  );
}
