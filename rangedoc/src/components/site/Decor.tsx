/**
 * Decorative pieces from the design:
 *  - <MountainBand>: layered mountain + pine silhouette strip (page bottoms)
 *  - <ScriptNote>: hand-written tagline with a green swoosh ("Less pain. More living.")
 */
import { cn } from "@/lib/utils";

export function ScriptNote({ text, className, light = false }: { text: string; className?: string; light?: boolean }) {
  const lines = text.split(/(?<=\.)\s+/); // one sentence per line
  return (
    <div className={cn("animate-float pointer-events-none font-script text-2xl leading-tight select-none sm:text-3xl", light ? "text-white" : "text-navy-900", className)} aria-hidden>
      {lines.map((l, i) => (
        <div key={i} style={{ transform: `rotate(-8deg) translateX(${i * 10}px)` }}>
          {l}
        </div>
      ))}
      <svg viewBox="0 0 120 20" className="mt-1 ml-6 h-4 w-24 -rotate-12 text-brand-500">
        <path d="M2 16 C 40 4, 80 2, 118 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function MountainBand({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-b from-white via-navy-50/60 to-navy-100/70", className)}>
      <svg className="absolute inset-x-0 bottom-0 h-[70%] w-full" viewBox="0 0 1440 220" preserveAspectRatio="none" aria-hidden>
        <path d="M0 150 L120 90 L220 130 L340 60 L470 120 L600 70 L720 125 L860 50 L990 115 L1120 65 L1260 120 L1440 80 V220 H0Z" fill="#c9d7ea" />
        <path d="M0 175 L150 125 L290 160 L420 110 L560 158 L700 120 L840 165 L980 115 L1130 160 L1280 120 L1440 150 V220 H0Z" fill="#a9bedb" />
        {/* pine trees */}
        {Array.from({ length: 36 }).map((_, i) => {
          const x = i * 41 + (i % 3) * 7;
          const h = 26 + ((i * 17) % 22);
          return <path key={i} d={`M${x} 220 L${x + 9} ${220 - h} L${x + 18} 220Z`} fill={i % 2 ? "#5d7c73" : "#46665d"} opacity="0.9" />;
        })}
      </svg>
      <div className="relative">{children}</div>
    </div>
  );
}
