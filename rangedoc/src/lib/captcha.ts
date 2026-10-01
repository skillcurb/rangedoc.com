/**
 * Google reCAPTCHA v2 ("I'm not a robot") server-side verification.
 * Keys are set in Admin → Settings → reCAPTCHA. When disabled, every
 * request passes (handy for local development).
 */
import "server-only";
import { getSettings } from "@/lib/settings";

export async function verifyCaptcha(token: string | null | undefined) {
  const s = await getSettings();
  if (!s.captcha.enabled || !s.captcha.secretKey) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: s.captcha.secretKey, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}
