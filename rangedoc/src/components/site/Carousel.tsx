"use client";
/**
 * Horizontal carousel: scrolls with touch/trackpad and shows ← → buttons
 * when the content is wider than the screen ("Where does it hurt?").
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Carousel({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="relative">
      <div ref={ref} onScroll={update} className={cn("no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1", className)}>
        {children}
      </div>
      {canLeft && (
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="absolute top-1/2 -left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-pop ring-1 ring-line hover:bg-brand-50">
          <ChevronLeft className="size-5" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="absolute top-1/2 -right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white shadow-pop ring-1 ring-line hover:bg-brand-50">
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}
