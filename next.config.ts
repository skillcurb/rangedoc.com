/**
 * Next.js configuration.
 * ------------------------------------------------------------------
 * - images.remotePatterns: external hosts allowed for <Image>. Add your CDN here.
 * - images.localPatterns: local paths allowed for optimisation.
 *   /uploads/** is served by our own route handler (src/app/uploads/[...path]/route.ts)
 *   because files added to /public after `next build` are NOT served in production.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native Node packages that must not be bundled
  serverExternalPackages: ["mysql2", "sharp", "nodemailer"],
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 90],
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/seed/**" },
      { pathname: "/images/**" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "randomuser.me" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
    ],
    // Seed placeholder illustrations are SVG; they are rendered unoptimised (see AppImage)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    // Allow larger media uploads through Server Actions (videos/PDFs go through /api/media)
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
