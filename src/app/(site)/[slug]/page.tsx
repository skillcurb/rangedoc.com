/**
 * CMS PAGES  ( /about-us, /privacy-policy, /terms-of-use, /help-center … )
 * Created and edited in Admin → Pages.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { formatDate, stripHtml, truncate } from "@/lib/utils";
import { AppImage } from "@/components/ui/AppImage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await prisma.cmsPage.findUnique({ where: { slug: (await params).slug } });
  if (!page || !page.published) return { title: "Page not found" };
  return buildMetadata({ title: page.metaTitle || page.title, description: page.metaDescription || page.excerpt || truncate(stripHtml(page.content), 160), keywords: page.metaKeywords, image: page.ogImage || page.heroImage, path: `/${page.slug}` });
}

export default async function CmsPage({ params }: Props) {
  const page = await prisma.cmsPage.findUnique({ where: { slug: (await params).slug } });
  if (!page || !page.published) notFound();
  return (
    <div>
      <section className="bg-gradient-to-b from-navy-50 to-white">
        <div className="container-x py-12">
          <h1 className="text-4xl font-extrabold">{page.title}</h1>
          <p className="mt-2 text-sm text-muted">Last updated {formatDate(page.updatedAt)}</p>
        </div>
      </section>
      <div className="container-x max-w-3xl py-8">
        {page.heroImage && (
          <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl">
            <AppImage src={page.heroImage} alt={page.title} fill sizes="768px" className="object-cover" />
          </div>
        )}
        <div className="prose-rd" dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </div>
  );
}
