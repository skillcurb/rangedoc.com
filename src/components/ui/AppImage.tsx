/**
 * <AppImage> – wrapper around next/image.
 * - SVG and external unknown hosts are rendered unoptimised.
 * - Falls back to a soft placeholder when src is empty.
 * - `alt` is required for SEO / accessibility.
 */
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "src" | "alt"> & { src?: string | null; alt: string; fallbackClassName?: string };

export function AppImage({ src, alt, className, fallbackClassName, ...rest }: Props) {
  if (!src) {
    return <div aria-label={alt} role="img" className={cn("bg-gradient-to-br from-navy-100 to-brand-100", className, fallbackClassName)} />;
  }
  const unoptimized = src.endsWith(".svg") || src.startsWith("data:");
  return <Image src={src} alt={alt} className={className} unoptimized={unoptimized} {...rest} />;
}
