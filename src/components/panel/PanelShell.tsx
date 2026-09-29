"use client";
/**
 * Shared shell for the provider dashboard and the admin panel:
 * left sidebar navigation (collapsible on mobile) + top bar.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, BookOpen, Building2, CalendarCheck, ChevronDown, CreditCard, ExternalLink, FileText, FolderOpen, HelpCircle, Home, Image as ImageIcon,
  Inbox, LayoutGrid, LogOut, Mail, MapPin, Menu, MessageSquare, Package, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, Stethoscope, Tag, Tags,
  UserCheck, UserRound, Users, X, Clock, Layers, Globe, Film, KeyRound, Upload, type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Home, UserRound, MapPin, Stethoscope, ShieldCheck, ImageIcon, Inbox, BarChart3, CreditCard, Settings, HelpCircle, CalendarCheck, Mail, Star, Clock,
  Users, UserCheck, Building2, FileText, BookOpen, Tag, Tags, Package, ShoppingBag, FolderOpen, MessageSquare, Search, Sparkles, LayoutGrid, Layers, Globe, Film, KeyRound, Upload,
};

export type NavItem = { label: string; href: string; icon: string; badge?: number; locked?: boolean };
export type NavSection = { title?: string; items: NavItem[] };

type Props = {
  siteName: string;
  logo?: string;
  sections: NavSection[];
  user: { name: string; subtitle: string; avatar?: string | null };
  logout: (formData: FormData) => Promise<void>;
  logoutTo: "admin" | "provider";
  sidebarExtra?: React.ReactNode;
  notifications?: number;
  /** "My account" link in the user menu */
  accountHref?: string;
  children: React.ReactNode;
};

export function PanelShell({ siteName, logo, sections, user, logout, logoutTo, sidebarExtra, notifications = 0, accountHref, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  const rootHref = sections[0]?.items[0]?.href ?? "/";
  const isActive = (href: string) => (href === rootHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((sec, i) => (
        <div key={i}>
          {sec.title && <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted uppercase">{sec.title}</p>}
          <ul className="space-y-0.5">
            {sec.items.map((item) => {
              const Icon = ICONS[item.icon] ?? LayoutGrid;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                      active ? "bg-brand-50 text-brand-800 before:absolute before:top-1 before:bottom-1 before:-left-3 before:w-1 before:rounded-r before:bg-brand-600" : "text-navy-800 hover:bg-surface",
                    )}
                  >
                    <Icon className={cn("size-[18px]", active ? "text-brand-700" : "text-navy-600")} />
                    <span className="flex-1">{item.label}</span>
                    {item.locked && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">PRO</span>}
                    {!!item.badge && <span className="grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {sidebarExtra}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo siteName={siteName} logo={logo} className="text-2xl" />
        </div>
        {nav}
        <form action={logout} className="border-t border-line p-3">
          <input type="hidden" name="to" value={logoutTo} />
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-800 hover:bg-surface">
            <LogOut className="size-[18px] text-navy-600" /> Log Out
          </button>
        </form>
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo siteName={siteName} logo={logo} className="text-2xl" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="size-6" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-6" />
          </button>
          <Link href="/" target="_blank" className="hidden items-center gap-1.5 text-sm text-navy-700 hover:text-brand-700 sm:flex">
            <ExternalLink className="size-4" /> View site
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="relative p-2 text-navy-700" aria-label={`${notifications} new notifications`}>
              <Bell className="size-5" />
              {notifications > 0 && <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{notifications}</span>}
            </span>
            <div className="relative">
              <button type="button" onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface">
                <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                  {user.avatar ? <img src={user.avatar} alt="" className="size-full object-cover" /> : initials(user.name)}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm leading-tight font-semibold text-navy-900">{user.name}</span>
                  <span className="block text-xs text-muted">{user.subtitle}</span>
                </span>
                <ChevronDown className="size-4 text-muted" />
              </button>
              {menu && (
                <div className="animate-pop-in absolute right-0 mt-1 w-52 origin-top-right rounded-xl border border-line bg-white py-1 shadow-pop">
                  {accountHref && (
                    <Link href={accountHref} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface">
                      <KeyRound className="size-4" /> My account &amp; password
                    </Link>
                  )}
                  <form action={logout}>
                    <input type="hidden" name="to" value={logoutTo} />
                    <button className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface">
                      <LogOut className="size-4" /> Log out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
