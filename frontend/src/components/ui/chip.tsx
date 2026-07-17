import { cn } from "@/lib/utils";
import type { ChipStyle } from "@/lib/design-maps";

/** Small status/priority pill using a ChipStyle from design-maps (label + Tailwind classes). */
export function Chip({ chip, className }: { chip: ChipStyle; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-bb-chip px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] uppercase",
        chip.className,
        className,
      )}
    >
      {chip.label}
    </span>
  );
}
