import { useMemo, useState } from "react";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

type FieldName = "email" | "password";

interface LoginFormTouched {
  email: boolean;
  password: boolean;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<LoginFormTouched>({
    email: false,
    password: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const parsed = useMemo(
    () => loginFormSchema.safeParse({ email, password }),
    [email, password],
  );

  const isValid = parsed.success;
  const fieldErrors = parsed.success
    ? ({} as Partial<Record<FieldName, string>>)
    : (() => {
        const flat = parsed.error.flatten().fieldErrors;
        return {
          email: flat.email?.[0],
          password: flat.password?.[0],
        };
      })();

  const showEmailError =
    (touched.email || submitAttempted) && fieldErrors.email !== undefined;
  const showPasswordError =
    (touched.password || submitAttempted) &&
    fieldErrors.password !== undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    const result = loginFormSchema.safeParse({ email, password });
    if (!result.success) {
      return;
    }
    logger.debug("Login submitted", { email: result.data.email });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
      <div>
        <label htmlFor="login-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          placeholder="Enter email"
          aria-invalid={showEmailError}
          aria-describedby={showEmailError ? "login-email-error" : undefined}
          className={cn(
            "w-full rounded border px-3 py-2",
            showEmailError && "border-destructive",
          )}
        />
        {showEmailError ? (
          <p
            id="login-email-error"
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.email}
          </p>
        ) : null}
      </div>
      <div>
        <label
          htmlFor="login-password"
          className="mb-1 block text-sm font-medium"
        >
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="Enter password"
          aria-invalid={showPasswordError}
          aria-describedby={
            showPasswordError ? "login-password-error" : undefined
          }
          className={cn(
            "w-full rounded border px-3 py-2",
            showPasswordError && "border-destructive",
          )}
        />
        {showPasswordError ? (
          <p
            id="login-password-error"
            className="mt-1 text-sm text-destructive"
            role="alert"
          >
            {fieldErrors.password}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={!isValid}
        className={cn(
          "rounded px-4 py-2 font-medium text-white",
          isValid ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-blue-400",
        )}
      >
        Login
      </button>
    </form>
  );
}
