/**
 * Site logo – uploaded logo image (Admin → Settings) or a text wordmark
 * where the last part is green, e.g. "Range" + "Doc".
 */
import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import { cn } from "@/lib/utils";

export function Logo({ siteName, logo, light = false, className }: { siteName: string; logo?: string | null; light?: boolean; className?: string }) {
  if (logo) {
    return (
      <Link href="/" className={cn("inline-flex items-center", className)} aria-label={`${siteName} home`}>
        <AppImage src={logo} alt={siteName} width={180} height={44} className="h-9 w-auto object-contain" priority />
      </Link>
    );
  }
  // Split "RangeDoc" into "Range" + "Doc" (last capitalised word part is green)
  const match = siteName.match(/^(.*?)([A-Z][a-z]*)$/);
  const first = match && match[1] ? match[1] : siteName;
  const last = match && match[1] ? match[2] : "";
  return (
    <Link href="/" className={cn("font-display text-[28px] leading-none font-extrabold tracking-tight", className)} aria-label={`${siteName} home`}>
      <span className={light ? "text-white" : "text-navy-900"}>{first}</span>
      <span className="text-brand-500">{last}</span>
    </Link>
  );
}
