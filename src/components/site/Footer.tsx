/**
 * Site footer – same navy footer on every public page.
 * Links are built from the database (conditions, specialties, CMS pages).
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/site/Logo";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TiktokIcon, XIcon, YoutubeIcon } from "@/components/ui/SocialIcons";

export async function Footer() {
  const [s, conditions, specialties, pages] = await Promise.all([
    getSettings(),
    prisma.condition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 8, select: { name: true, slug: true } }),
    prisma.specialty.findMany({ orderBy: { sortOrder: "asc" }, take: 7, select: { name: true, slug: true } }),
    prisma.cmsPage.findMany({ where: { published: true, footerGroup: { not: null } }, orderBy: { sortOrder: "asc" }, select: { title: true, slug: true, footerGroup: true } }),
  ]);

  const socials = [
    { href: s.social.facebook, Icon: FacebookIcon, label: "Facebook" },
    { href: s.social.instagram, Icon: InstagramIcon, label: "Instagram" },
    { href: s.social.youtube, Icon: YoutubeIcon, label: "YouTube" },
    { href: s.social.x, Icon: XIcon, label: "X" },
    { href: s.social.linkedin, Icon: LinkedinIcon, label: "LinkedIn" },
    { href: s.social.tiktok, Icon: TiktokIcon, label: "TikTok" },
  ].filter((x) => x.href);

  const columns = [
    {
      title: "Find Care",
      links: [
        { label: "All Providers", href: "/providers" },
        { label: "Physical Therapists", href: "/search?type=pt" },
        { label: "Chiropractors", href: "/search?type=chiro" },
        { label: "Browse by Location", href: "/locations" },
        { label: "Browse by Condition", href: "/conditions" },
        { label: "Saved Providers", href: "/saved" },
      ],
    },
    { title: "Conditions", links: conditions.map((c) => ({ label: c.name, href: `/conditions/${c.slug}` })) },
    {
      title: "Specialties / Browse",
      links: [...specialties.map((sp) => ({ label: sp.name, href: `/search?specialty=${sp.slug}` })), { label: "Recovery Marketplace", href: "/products" }],
    },
    {
      title: "For Providers",
      links: [
        { label: "Claim Your Profile", href: "/claim-your-profile" },
        { label: "Pricing", href: "/claim-your-profile#pricing" },
        { label: "Provider Login", href: "/login" },
        ...pages.filter((p) => p.footerGroup === "providers").map((p) => ({ label: p.title, href: `/${p.slug}` })),
      ],
    },
    {
      title: s.general.siteName,
      links: [
        ...pages.filter((p) => p.footerGroup === "company").map((p) => ({ label: p.title, href: `/${p.slug}` })),
        { label: "Resources", href: "/blog" },
        { label: "Contact Us", href: "/contact" },
      ],
    },
  ];

  return (
    <footer className="bg-navy-900 text-navy-100">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(5,1fr)]">
        <div className="space-y-4">
          <Logo siteName={s.general.siteName} logo={s.general.logo} light />
          <p className="text-sm font-semibold text-white">{s.general.tagline}</p>
          <p className="text-sm leading-6 text-navy-200">{s.general.footerAbout}</p>
          <div className="flex gap-3">
            {socials.map(({ href, Icon, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-brand-600">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 text-sm font-bold text-white">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-navy-200 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-xs text-navy-300 sm:flex-row">
          <p>{s.general.copyright.replace("{year}", String(new Date().getFullYear()))}</p>
          <p>
            {s.general.contactEmail} · {s.general.contactPhone}
          </p>
        </div>
      </div>
    </footer>
  );
}
