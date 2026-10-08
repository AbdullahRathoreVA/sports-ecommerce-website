"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Field, inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";
import { changePassword, forgotPassword, logIn, resendCode, signUp, updateProfile, verifyEmail, type FormState } from "./actions";

function Submit({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-70", className)}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-[var(--radius-control)] bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="rounded-[var(--radius-control)] bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        {state.ok}
      </p>
    );
  return null;
}

function Password({ name = "password", label = "Password", autoComplete = "current-password", hint }: { name?: string; label?: string; autoComplete?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} required minLength={autoComplete === "new-password" ? 8 : undefined} maxLength={200} autoComplete={autoComplete} className={cn(inputClass, "pr-12")} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-subtle hover:text-fg">
          {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(logIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <Password />
      <div className="flex justify-end">
        <Link href="/account/forgot" className="text-sm font-medium text-accent hover:underline">
          Forgot password?
        </Link>
      </div>
      <Message state={state} />
      <Submit>Log in</Submit>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  // Echoed values: React resets the form after the action, these become the defaults.
  const v = state?.values;
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name">
          <input id="name" name="name" required maxLength={80} autoComplete="name" defaultValue={v?.name} className={inputClass} />
        </Field>
        <Field label="Team / company" htmlFor="company" optional>
          <input id="company" name="company" maxLength={120} autoComplete="organization" defaultValue={v?.company} className={inputClass} />
        </Field>
      </div>
      <Field label="Work email" htmlFor="email" hint="Use the email you send quotes or orders from — they'll appear in your portal.">
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={v?.email} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp / phone" htmlFor="phone" optional>
          <input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" defaultValue={v?.phone} className={inputClass} />
        </Field>
        <Field label="Country" htmlFor="country" optional>
          <input id="country" name="country" maxLength={80} autoComplete="country-name" defaultValue={v?.country} className={inputClass} />
        </Field>
      </div>
      <Password autoComplete="new-password" hint="At least 8 characters." />
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Message state={state} />
      <Submit>Create my account</Submit>
      <p className="text-xs text-subtle">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline">terms</Link> and{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </form>
  );
}

export function VerifyForm() {
  const [state, action] = useActionState(verifyEmail, undefined);
  const [resent, resend] = useActionState(resendCode, undefined);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <Field label="6-digit code" htmlFor="code">
          <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="123456" className={cn(inputClass, "text-center font-mono text-2xl tracking-[0.5em]")} />
        </Field>
        <Message state={state} />
        <Submit>Verify email</Submit>
      </form>
      <form action={resend} className="text-center">
        <Message state={resent} />
        <ResendButton />
      </form>
    </div>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="mt-2 text-sm font-medium text-accent hover:underline disabled:opacity-60">
      {pending ? "Sending…" : "Send a new code"}
    </button>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPassword, undefined);
  const codeStep = state?.step === "code";
  return (
    <form action={action} className="space-y-4">
      {codeStep ? (
        <>
          <input type="hidden" name="step" value="code" />
          <input type="hidden" name="email" value={state?.email ?? ""} />
          <Field label="6-digit code" htmlFor="code">
            <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={7} placeholder="123456" className={cn(inputClass, "text-center font-mono text-2xl tracking-[0.5em]")} />
          </Field>
          <Password label="New password" autoComplete="new-password" hint="At least 8 characters." />
        </>
      ) : (
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
      )}
      <Message state={state} />
      <Submit>{codeStep ? "Set new password" : "Send reset code"}</Submit>
    </form>
  );
}

export function ProfileForm({ initial }: { initial: { name: string; company: string | null; phone: string | null; country: string | null; email: string } }) {
  const [state, action] = useActionState(updateProfile, undefined);
  // After saving, show what was saved (not the page's original values).
  const v = { ...initial, ...state?.values };
  return (
    <form action={action} className="space-y-4">
      <Field label="Email" htmlFor="email-ro" hint="To change your login email, message our team.">
        <input id="email-ro" value={initial.email} readOnly className={cn(inputClass, "bg-surface-2 text-muted")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name">
          <input id="name" name="name" required maxLength={80} defaultValue={v.name} autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Team / company" htmlFor="company" optional>
          <input id="company" name="company" maxLength={120} defaultValue={v.company ?? ""} autoComplete="organization" className={inputClass} />
        </Field>
        <Field label="WhatsApp / phone" htmlFor="phone" optional>
          <input id="phone" name="phone" type="tel" maxLength={30} defaultValue={v.phone ?? ""} autoComplete="tel" className={inputClass} />
        </Field>
        <Field label="Country" htmlFor="country" optional>
          <input id="country" name="country" maxLength={80} defaultValue={v.country ?? ""} autoComplete="country-name" className={inputClass} />
        </Field>
      </div>
      <Message state={state} />
      <Submit className="sm:w-auto sm:px-8">Save details</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Password name="current" label="Current password" />
      <Password label="New password" autoComplete="new-password" hint="At least 8 characters." />
      <Message state={state} />
      <Submit className="sm:w-auto sm:px-8">Change password</Submit>
    </form>
  );
}
