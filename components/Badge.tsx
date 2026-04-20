import { getBadge, nextBadge } from "@/lib/badges";
import { cn } from "@/lib/utils";

interface Props {
  karma: number;
  size?: "sm" | "md";
  showProgress?: boolean;
  className?: string;
}

export function Badge({ karma, size = "sm", showProgress = false, className }: Props) {
  const b = getBadge(karma);
  const next = nextBadge(karma);

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
          size === "sm" ? "text-[11px]" : "text-xs",
        )}
        style={{ backgroundColor: b.color + "22", color: b.color }}
        title={`${karma} karma`}
      >
        <span>{b.emoji}</span>
        <span>{b.label}</span>
      </span>
      {showProgress && next && (
        <div className="w-full">
          <div className="h-1 overflow-hidden rounded-full bg-bg-soft">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, ((karma - b.min) / (next.min - b.min)) * 100)}%`,
                backgroundColor: b.color,
              }}
            />
          </div>
          <p className="mt-1 text-[10px] text-neutral-500">
            {next.min - karma} karma avant « {next.emoji} {next.label} »
          </p>
        </div>
      )}
    </div>
  );
}
