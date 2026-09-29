/**
 * Public site layout – header + footer on every public page,
 * plus page-view tracking.
 */
import { Suspense } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { PageViewTracker } from "@/components/site/Tracker";
import { AnalyticsScripts } from "@/components/site/AnalyticsScripts";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/* useSearchParams needs a Suspense boundary */}
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {/* Google Analytics / Tag Manager / Microsoft Clarity / Bing UET (if configured) */}
      <Suspense fallback={null}>
        <AnalyticsScripts />
      </Suspense>
    </div>
  );
}
