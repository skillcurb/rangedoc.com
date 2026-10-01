/**
 * Root layout – wraps every page (site, provider dashboard and admin).
 * Loads fonts, global CSS and the toast notification container.
 */
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

// Self-hosted fonts from npm (@fontsource) – no requests to Google, works offline,
// and no layout shift. Plus Jakarta Sans (body), Outfit (headings), Caveat (handwritten notes).
const body = localFont({ src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2", variable: "--font-body", weight: "200 800", display: "swap" });
const heading = localFont({ src: "../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2", variable: "--font-heading", weight: "100 900", display: "swap" });
const script = localFont({
  src: [
    { path: "../../node_modules/@fontsource/caveat/files/caveat-latin-500-normal.woff2", weight: "500" },
    { path: "../../node_modules/@fontsource/caveat/files/caveat-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-script-face",
  display: "swap",
});

// Pages read settings from the database on every request
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings().catch(() => null);
  const name = s?.general.siteName ?? "RangeDoc";
  return {
    metadataBase: new URL(siteUrl("/")),
    title: { default: name, template: `%s | ${name}` },
    applicationName: name,
    icons: { icon: s?.general.favicon || "/favicon.svg" },
    // Search Console / Bing Webmaster ownership verification (Admin → Settings → Analytics & SEO)
    verification: {
      google: s?.scripts.googleSiteVerification || undefined,
      other: s?.scripts.bingSiteVerification ? { "msvalidate.01": s.scripts.bingSiteVerification } : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0c2250",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${script.variable}`}>
      <body>
        {children}
        {/* Global toast notifications (react-hot-toast) */}
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: 14, borderRadius: 12, boxShadow: "0 12px 40px rgb(16 33 72 / 0.16)" } }} />
      </body>
    </html>
  );
}
