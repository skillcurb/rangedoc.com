/**
 * Star rating display (supports half stars) and an interactive picker.
 */
"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-amber-300" style={{ width: size, height: size }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="fill-amber-400 text-amber-400" style={{ width: size, height: size }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Clickable 1–5 star input. Writes the value into a hidden input named `name`. */
export function StarInput({ name = "rating", defaultValue = 0, onChange, size = 26 }: { name?: string; defaultValue?: number; onChange?: (v: number) => void; size?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  return (
    <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(i)}
          onClick={() => {
            setValue(i);
            onChange?.(i);
          }}
        >
          <Star style={{ width: size, height: size }} className={cn("transition", (hover || value) >= i ? "fill-amber-400 text-amber-400" : "text-navy-200")} />
        </button>
      ))}
    </div>
  );
}
