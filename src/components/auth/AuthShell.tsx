/**
 * Two-column layout for login / register pages (form + benefits panel).
 */
import { CheckCircle2 } from "lucide-react";
import { MountainBand } from "@/components/site/Decor";

export function AuthShell({ title, subtitle, children, aside = true }: { title: string; subtitle?: string; children: React.ReactNode; aside?: boolean }) {
  return (
    <MountainBand className="min-h-[70vh]">
      <div className="container-x grid items-start gap-8 py-12 lg:grid-cols-[1fr_380px]">
        <div className="card animate-fade-up mx-auto w-full max-w-2xl p-6 shadow-lift sm:p-8">
          <h1 className="text-3xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-navy-700">{subtitle}</p>}
          {children}
        </div>
        {aside && (
          <aside className="card hidden bg-white/90 p-6 lg:block">
            <h2 className="text-lg font-bold">Why providers choose us</h2>
            <ul className="mt-4 space-y-3 text-sm text-navy-800">
              {["Reach patients actively searching near you", "Receive appointment requests and emails", "See who views and contacts your profile", "Add photos, locations, FAQs and more"].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="size-5 shrink-0 text-brand-600" /> {t}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </MountainBand>
  );
}
