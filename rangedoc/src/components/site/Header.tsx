/**
 * Site header (server component) – loads menu data from the database and
 * hands it to the interactive <HeaderNav> client component.
 */
import { db, t, eq, and, asc } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { HeaderNav, type MenuGroup } from "@/components/site/HeaderNav";

export async function Header() {
  const [settings, conditions, cities, productCats, blogCats, helpPage, user] = await Promise.all([
    getSettings(),
    db.query.conditions.findMany({ where: eq(t.conditions.active, true), orderBy: [asc(t.conditions.sortOrder)], limit: 10, columns: { name: true, slug: true } }),
    db.query.cities.findMany({ where: and(eq(t.cities.active, true), eq(t.cities.featured, true)), orderBy: [asc(t.cities.sortOrder)], limit: 6, columns: { name: true, stateCode: true, slug: true } }),
    db.query.productCategories.findMany({ orderBy: [asc(t.productCategories.sortOrder)], limit: 8, columns: { name: true, slug: true } }),
    db.query.blogCategories.findMany({ orderBy: [asc(t.blogCategories.name)], limit: 6, columns: { name: true, slug: true } }),
    db.query.cmsPages.findFirst({ where: and(eq(t.cmsPages.slug, "help-center"), eq(t.cmsPages.published, true)), columns: { slug: true } }),
    getCurrentUser(),
  ]);

  const menus: MenuGroup[] = [
    {
      label: "Find Care",
      columns: [
        {
          title: "Providers",
          links: [
            { label: "All Providers", href: "/providers" },
            { label: "Physical Therapists", href: "/search?type=pt" },
            { label: "Chiropractors", href: "/search?type=chiro" },
            { label: "Saved Providers", href: "/saved" },
          ],
        },
        {
          title: "Top Cities",
          links: [...cities.map((c) => ({ label: `${c.name}, ${c.stateCode}`, href: `/search?city=${c.slug}` })), { label: "All locations →", href: "/locations" }],
        },
      ],
    },
    {
      label: "Conditions",
      columns: [
        { title: "Where does it hurt?", links: conditions.slice(0, 5).map((c) => ({ label: c.name, href: `/conditions/${c.slug}` })) },
        { title: " ", links: [...conditions.slice(5).map((c) => ({ label: c.name, href: `/conditions/${c.slug}` })), { label: "All conditions →", href: "/conditions" }] },
      ],
    },
    {
      label: "Recovery Marketplace",
      columns: [{ title: "Shop by pain area", links: [...productCats.map((c) => ({ label: c.name, href: `/products?category=${c.slug}` })), { label: "All products →", href: "/products" }] }],
    },
    {
      label: "Resources",
      columns: [{ title: "Articles", links: [...blogCats.map((c) => ({ label: c.name, href: `/blog/category/${c.slug}` })), { label: "All resources →", href: "/blog" }] }],
    },
    {
      label: "For Providers",
      columns: [
        {
          title: "Grow your practice",
          links: [
            { label: "Claim Your Profile", href: "/claim-your-profile" },
            { label: "Pricing", href: "/claim-your-profile#pricing" },
            { label: "Provider Login", href: "/login" },
            { label: "Create a Listing", href: "/register" },
            ...(helpPage ? [{ label: "Help Center", href: "/help-center" }] : []),
          ],
        },
      ],
    },
  ];

  const account = user ? { name: user.name, href: user.role === "ADMIN" ? "/admin" : "/dashboard" } : null;
  return <HeaderNav siteName={settings.general.siteName} logo={settings.general.logo} menus={menus} account={account} />;
}
