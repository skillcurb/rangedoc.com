/** /robots.txt – keep private areas out of search engines */
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/api", "/checkout", "/cart", "/go/"] }],
    sitemap: siteUrl("/sitemap.xml"),
  };
}
