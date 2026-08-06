import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function StarRating({ rating, size = "sm", interactive = false, onChange }: {
  rating: number; size?: "sm" | "md" | "lg";
  interactive?: boolean; onChange?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "w-7 h-7" : size === "md" ? "w-4 h-4" : "w-3 h-3";
  const display = interactive ? (hovered || rating) : rating;
  return (
    <span className={cn("flex items-center gap-1", interactive && "gap-1.5")}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            sz,
            i <= Math.round(display) ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground",
            interactive && "cursor-pointer hover:scale-110 transition-transform"
          )}
          onMouseEnter={() => interactive && setHovered(i)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(i)}
        />
      ))}
      {!interactive && (
        <span className="ml-0.5 font-semibold text-foreground text-sm">{rating.toFixed(1)}</span>
      )}
    </span>
  );
}
