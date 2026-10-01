/** CONTACT US  ( /contact ) – protected by Google reCAPTCHA */
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "@/components/contact/ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("contact", { title: "Contact Us", description: "Questions about our directory or your provider profile? Get in touch." });
}

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="bg-surface py-10">
      <div className="container-x grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="card p-6 sm:p-8">
          <h1 className="text-3xl font-extrabold">Contact Us</h1>
          <p className="mt-1 mb-6 text-navy-700">We usually reply within one business day.</p>
          <ContactForm siteKey={s.captcha.enabled ? s.captcha.siteKey : ""} />
        </div>
        <aside className="card h-fit space-y-4 p-6">
          <h2 className="text-lg font-bold">Get in touch</h2>
          <p className="flex gap-3 text-sm text-navy-800"><Mail className="size-5 text-brand-600" /> {s.general.contactEmail}</p>
          <p className="flex gap-3 text-sm text-navy-800"><Phone className="size-5 text-brand-600" /> {s.general.contactPhone}</p>
          <p className="flex gap-3 text-sm text-navy-800"><MapPin className="size-5 shrink-0 text-brand-600" /> {s.general.address}</p>
          <p className="border-t border-line pt-4 text-xs text-muted">For medical emergencies call 911. This form is not for medical advice.</p>
        </aside>
      </div>
    </div>
  );
}
