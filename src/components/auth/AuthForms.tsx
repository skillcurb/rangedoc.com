"use client";
/**
 * Auth forms (client components using server actions + toast errors).
 */
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction, type FormState } from "@/lib/actions/auth";

function useToastState(state: FormState) {
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok && state.message) toast.success(state.message);
  }, [state]);
}

export function PasswordInput({ name = "password", placeholder = "Password", autoComplete = "current-password", id }: { name?: string; placeholder?: string; autoComplete?: string; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required className="input pr-10" placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ role = "PROVIDER", next }: { role?: "PROVIDER" | "ADMIN"; next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  useToastState(state);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="input" autoComplete="email" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-navy-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3" pendingText="Signing in…">
        Log In
      </SubmitButton>
    </form>
  );
}

type City = { id: number; name: string; stateCode: string };

export function RegisterForm({ claim, cities, next }: { claim?: { id: number; name: string; city: string } | null; cities: City[]; next?: string }) {
  const [state, action] = useActionState(registerAction, null);
  useToastState(state);
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      {claim ? (
        <>
          <input type="hidden" name="providerId" value={claim.id} />
          <div className="rounded-lg bg-brand-50 p-3 text-sm text-navy-800">
            You&apos;re claiming <b>{claim.name}</b> {claim.city && <>({claim.city})</>}. Our team verifies ownership before your changes go live.
          </div>
        </>
      ) : (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-bold text-navy-900">Your practice</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="firstName" required placeholder="First name *" className="input" />
            <input name="lastName" required placeholder="Last name *" className="input" />
            <input name="credentials" placeholder="Credentials (e.g. PT, DPT)" className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="providerType" required className="input" defaultValue="PHYSICAL_THERAPIST" aria-label="Provider type">
              <option value="PHYSICAL_THERAPIST">Physical Therapist</option>
              <option value="CHIROPRACTOR">Chiropractor</option>
            </select>
            <input name="practiceName" placeholder="Practice name" className="input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1.2fr_1fr]">
            <input name="address" required placeholder="Street address *" className="input" />
            <select name="cityId" required className="input" defaultValue="" aria-label="City">
              <option value="" disabled>
                City *
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}, {c.stateCode}
                </option>
              ))}
            </select>
            <input name="zip" required placeholder="ZIP *" className="input" />
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="mb-2 font-bold text-navy-900">Your account</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Full name *" className="input" autoComplete="name" />
          <input name="phone" type="tel" placeholder="Phone" className="input" autoComplete="tel" />
          <input name="email" type="email" required placeholder="Email *" className="input" autoComplete="email" />
          <PasswordInput placeholder="Password (min 8 characters) *" autoComplete="new-password" />
          <input name="licenseNumber" placeholder="License number" className="input sm:col-span-2" />
        </div>
        {claim && (
          <>
            <textarea name="claimMessage" rows={2} placeholder="Anything that helps us verify you (optional)" className="input" />
            <label className="flex items-start gap-2 text-sm text-navy-800">
              <input type="checkbox" name="confirmOwner" className="checkbox mt-0.5" required /> I confirm I am this provider or authorized to manage this profile.
            </label>
          </>
        )}
        <label className="flex items-start gap-2 text-sm text-navy-800">
          <input type="checkbox" name="terms" className="checkbox mt-0.5" required /> I agree to the{" "}
          <Link href="/terms-of-use" className="link" target="_blank">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="link" target="_blank">
            Privacy Policy
          </Link>
        </label>
      </fieldset>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <SubmitButton className="w-full py-3" pendingText="Creating your account…">
        {claim ? "Claim My Profile" : "Create My Free Profile"}
      </SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  useToastState(state);
  return (
    <form action={action} className="space-y-4">
      <input name="email" type="email" required placeholder="Your account email" className="input" />
      {state?.ok && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{state.message}</p>}
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  useToastState(state);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <PasswordInput placeholder="New password" autoComplete="new-password" />
      <PasswordInput name="confirm" placeholder="Confirm new password" autoComplete="new-password" />
      <SubmitButton className="w-full" pendingText="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
