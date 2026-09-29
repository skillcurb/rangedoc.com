/**
 * ADMIN – SITEMAP & INDEXING ( /admin/sitemap )
 * Shows when the sitemap was last regenerated (it happens automatically on
 * every save), what it contains, and whether search engines were notified.
 */
import Link from "next/link";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { buildSitemap, getSitemapState } from "@/lib/sitemap";
import { getSettings } from "@/lib/settings";
import { regenerateSitemapNow } from "@/lib/admin/actions";
import { formatDate, formatNumber, siteUrl } from "@/lib/utils";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionButton } from "@/components/forms/FormKit";

export const metadata = { title: "Sitemap & Indexing" };

export default async function SitemapAdminPage() {
  const [entries, state, s] = await Promise.all([buildSitemap(), getSitemapState(), getSettings()]);
  const groups = [
    ["Main pages", (u: string) => !/\/(provider|conditions|locations|blog|products)\//.test(u)],
    ["Providers", (u: string) => u.includes("/provider/")],
    ["Conditions", (u: string) => u.includes("/conditions/")],
    ["Cities", (u: string) => u.includes("/locations/")],
    ["Blog", (u: string) => u.includes("/blog/")],
    ["Products", (u: string) => u.includes("/products/")],
  ] as const;
  const images = entries.reduce((n, e) => n + (e.images?.length ?? 0), 0);
  const sitemapUrl = siteUrl("/sitemap.xml");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sitemap & Indexing"
        subtitle="The sitemap is rebuilt automatically every time something is saved (providers, cities, conditions, posts, products, pages, settings)."
        actions={
          <>
            <a href="/sitemap.xml" target="_blank" className="btn-light">
              <ExternalLink className="size-4" /> View sitemap.xml
            </a>
            <ActionButton run={regenerateSitemapNow} className="btn-primary">
              <RefreshCw className="size-4" /> Regenerate &amp; notify now
            </ActionButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-muted">URLs in sitemap</p>
          <p className="font-display text-3xl font-extrabold text-navy-900">{formatNumber(entries.length)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Images listed</p>
          <p className="font-display text-3xl font-extrabold text-navy-900">{formatNumber(images)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Last regenerated</p>
          <p className="text-lg font-bold text-navy-900">{state ? formatDate(state.updatedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not yet"}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Search engines (IndexNow)</p>
          <p className="flex items-center gap-1.5 text-lg font-bold text-navy-900">
            {state?.lastPing?.sent ? <CheckCircle2 className="size-5 text-brand-600" /> : <XCircle className="size-5 text-navy-300" />}
            {state?.lastPing?.sent ? "Notified" : s.scripts.indexNowEnabled ? "Waiting" : "Off"}
          </p>
          {state?.lastPing && !state.lastPing.sent && <p className="text-xs text-muted">{state.lastPing.reason === "localhost" ? "Skipped on localhost – works on your live domain" : state.lastPing.reason}</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="What's inside">
          <ul className="divide-y divide-line text-sm">
            {groups.map(([label, test]) => (
              <li key={label} className="flex justify-between py-2">
                <span>{label}</span>
                <b>{entries.filter((e) => test(e.url)).length}</b>
              </li>
            ))}
          </ul>
          {state?.lastPaths?.length ? (
            <p className="mt-4 text-xs text-muted">
              Last change: {state.lastPaths.slice(0, 5).join(", ")}
            </p>
          ) : null}
        </Panel>
        <Panel title="Submit once to Google & Bing">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-navy-800">
            <li>
              Verify your site: paste the verification codes in{" "}
              <Link href="/admin/settings?tab=scripts" className="link">
                Settings → Analytics &amp; SEO
              </Link>
              .
            </li>
            <li>
              In <b>Google Search Console</b> → Sitemaps, submit: <code className="rounded bg-surface px-1.5 py-0.5 text-xs">{sitemapUrl}</code>
            </li>
            <li>
              In <b>Bing Webmaster Tools</b> → Sitemaps, submit the same URL.
            </li>
            <li>That's it – Google re-reads the sitemap automatically, and Bing/Yandex are pinged instantly (IndexNow) after every save.</li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
