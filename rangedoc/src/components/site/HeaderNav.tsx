"use client";
/**
 * Interactive header: dropdown menus, quick search, cart badge and the
 * mobile slide-out menu. Same look on every public page.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/lib/client/stores";
import { cn } from "@/lib/utils";

export type MenuLink = { label: string; href: string };
export type MenuGroup = { label: string; columns: { title: string; links: MenuLink[] }[] };

type Props = {
  siteName: string;
  logo?: string;
  menus: MenuGroup[];
  account: { name: string; href: string } | null;
};

export function HeaderNav({ siteName, logo, menus, account }: Props) {
  const [open, setOpen] = useState<string | null>(null); // open desktop dropdown
  const [mobile, setMobile] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Add a soft shadow once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus when the route changes
  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setSearchOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <header className={cn("sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md transition-shadow duration-300", scrolled ? "border-transparent shadow-card" : "border-line")}>
      <div className="container-x flex h-16 items-center gap-6">
        <Logo siteName={siteName} logo={logo} />

        {/* Desktop menu */}
        <nav ref={navRef} className="hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {menus.map((m) => (
            <div key={m.label} className="relative" onMouseEnter={() => setOpen(m.label)} onMouseLeave={() => setOpen(null)}>
              <button
                type="button"
                className={cn("flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-navy-800 hover:text-brand-700", open === m.label && "text-brand-700")}
                aria-expanded={open === m.label}
                onClick={() => setOpen(open === m.label ? null : m.label)}
              >
                {m.label} <ChevronDown className="size-3.5" />
              </button>
              {open === m.label && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="animate-slide-down flex gap-8 rounded-xl border border-line bg-white p-5 shadow-pop">
                    {m.columns.map((col, i) => (
                      <div key={i} className="min-w-44">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{col.title}</p>
                        <ul className="space-y-1.5">
                          {col.links.map((l) => (
                            <li key={l.href + l.label}>
                              <Link href={l.href} className="block text-sm text-navy-800 hover:text-brand-700">
                                {l.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => setSearchOpen((v) => !v)} className="rounded-md p-2 text-navy-800 hover:bg-navy-50" aria-label="Search">
            <Search className="size-5" />
          </button>
          <Link href="/cart" className="relative rounded-md p-2 text-navy-800 hover:bg-navy-50" aria-label="Cart">
            <ShoppingCart className="size-5" />
            {count > 0 && <span className="absolute -top-0.5 -right-0.5 grid size-4.5 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{count}</span>}
          </Link>
          {account ? (
            <Link href={account.href} className="hidden items-center gap-1.5 px-2 text-sm font-medium text-navy-800 hover:text-brand-700 sm:flex">
              <UserRound className="size-4" /> Dashboard
            </Link>
          ) : (
            <Link href="/login" className="hidden px-2 text-sm font-medium text-navy-800 hover:text-brand-700 sm:block">
              Log In
            </Link>
          )}
          <Link href="/claim-your-profile" className="btn-primary hidden sm:inline-flex">
            Claim Your Profile
          </Link>
          <button type="button" className="rounded-md p-2 text-navy-900 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {/* Quick search bar */}
      {searchOpen && (
        <div className="animate-slide-down border-t border-line bg-white">
          <form onSubmit={submitSearch} className="container-x flex gap-2 py-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-9" placeholder="Search a condition, provider name or treatment…" />
            </div>
            <button className="btn-primary">Search</button>
          </form>
        </div>
      )}

      {/* Mobile drawer */}
      {mobile && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-navy-950/50" onClick={() => setMobile(false)} />
          <div className="animate-fade-in absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Logo siteName={siteName} logo={logo} />
              <button type="button" onClick={() => setMobile(false)} aria-label="Close menu" className="p-1">
                <X className="size-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {menus.map((m) => (
                <div key={m.label} className="border-b border-line">
                  <button type="button" className="flex w-full items-center justify-between py-3 text-left font-medium text-navy-900" onClick={() => setMobileGroup(mobileGroup === m.label ? null : m.label)}>
                    {m.label}
                    <ChevronDown className={cn("size-4 transition", mobileGroup === m.label && "rotate-180")} />
                  </button>
                  {mobileGroup === m.label && (
                    <ul className="space-y-2 pb-3 pl-2">
                      {m.columns.flatMap((c) => c.links).map((l) => (
                        <li key={l.href + l.label}>
                          <Link href={l.href} className="text-sm text-navy-700">
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t border-line p-4">
              <Link href={account?.href ?? "/login"} className="btn-light w-full">
                {account ? "Dashboard" : "Log In"}
              </Link>
              <Link href="/claim-your-profile" className="btn-primary w-full">
                Claim Your Profile
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
