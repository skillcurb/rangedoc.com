/**
 * Third-party analytics for the PUBLIC site (not admin / dashboard).
 * Each one only loads when its ID is set in Admin → Settings → Analytics & SEO:
 *  - Google Analytics 4 (gtag.js)
 *  - Google Tag Manager
 *  - Microsoft Clarity (Bing's free heatmaps & session analytics)
 *  - Microsoft Advertising / Bing UET tag
 * Search Console + Bing Webmaster verification meta tags are added in app/layout.tsx.
 */
import Script from "next/script";
import { getSettings } from "@/lib/settings";

// IDs are pasted by admins – only allow safe characters before putting them in a script
const safe = (v: string) => v.replace(/[^\w-]/g, "");

export async function AnalyticsScripts() {
  const { scripts } = await getSettings();
  const ga = safe(scripts.googleAnalyticsId);
  const gtm = safe(scripts.googleTagManagerId);
  const clarity = safe(scripts.microsoftClarityId);
  const uet = safe(scripts.bingUetTagId);
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {gtm && (
        <>
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="gtm" />
          </noscript>
        </>
      )}
      {clarity && <Script id="ms-clarity" strategy="afterInteractive">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}</Script>}
      {uet && <Script id="bing-uet" strategy="afterInteractive">{`(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${uet}",enableAutoSpaTracking:true};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`}</Script>}
    </>
  );
}
