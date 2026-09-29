"use client";
/**
 * Contact form protected by Google reCAPTCHA v2.
 * The widget only loads when a site key is set in Admin → Settings → reCAPTCHA.
 */
import { useActionState, useEffect, useRef } from "react";
import Script from "next/script";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { submitContact } from "@/lib/actions/public";

declare global {
  interface Window {
    grecaptcha?: { reset: () => void };
  }
}

export function ContactForm({ siteKey }: { siteKey: string }) {
  const [state, action] = useActionState(submitContact, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Sent!");
      ref.current?.reset();
    } else if (state.error) toast.error(state.error);
    window.grecaptcha?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      {siteKey && <Script src="https://www.google.com/recaptcha/api.js" strategy="afterInteractive" />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-name">Name *</label>
          <input id="c-name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="c-email">Email *</label>
          <input id="c-email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="c-phone">Phone</label>
          <input id="c-phone" name="phone" type="tel" className="input" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="c-subject">Subject *</label>
          <input id="c-subject" name="subject" required className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message *</label>
        <textarea id="c-msg" name="message" required rows={6} className="input" />
      </div>
      {siteKey ? <div className="g-recaptcha" data-sitekey={siteKey} /> : <p className="text-xs text-muted">reCAPTCHA is disabled (enable it in Admin → Settings).</p>}
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
