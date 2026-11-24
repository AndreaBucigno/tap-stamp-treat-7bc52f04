import { Coffee, Gift, Heart, ShoppingBag, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const stampIcons = {
  gift: Gift,
  star: Star,
  heart: Heart,
  coffee: Coffee,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
};

export function StampGrid({ stamps, total, light, stampColor, stampIcon = "gift" }: { stamps: number; total: number; light?: boolean; stampColor?: string; stampIcon?: string }) {
  const Icon = stampIcons[stampIcon as keyof typeof stampIcons] ?? Gift;

  return (
    <div className="grid grid-cols-5 gap-2.5">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < stamps;
        return (
          <div
            key={i}
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border-2 border-dashed",
              filled
                ? "animate-stamp border-transparent bg-stamp text-accent-foreground"
                : light
                  ? "border-primary-foreground/30 text-primary-foreground/30"
                  : "border-border bg-stamp-empty text-muted-foreground/50",
            )}
            style={filled ? { animationDelay: `${i * 40}ms`, ...(stampColor ? { backgroundColor: stampColor } : {}) } : undefined}
          >
            <Icon className="size-1/2" strokeWidth={1.8} />
          </div>
        );
      })}
    </div>
  );
}
