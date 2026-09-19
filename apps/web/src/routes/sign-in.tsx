import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { describedBy, FormField } from "@/components/common/form-field";
import { FullPageLoader, Spinner } from "@/components/common/page-state";
import { Brand } from "@/components/layout/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  meQueryOptions,
  publicConfigQueryOptions,
  useMe,
} from "@/features/session";
import { errorMessage, isApiError } from "@/lib/api";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/auth";
import { queryKeys } from "@/lib/query-keys";

const signInSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

type SignInValues = z.infer<typeof signInSchema>;
type Mode = "sign-in" | "sign-up";

function friendlyAuthError(error: unknown, mode: Mode) {
  if (isApiError(error, 401)) {
    return "That email and password did not match. Try again.";
  }
  if (isApiError(error, 422) && mode === "sign-up") {
    return "An account with this email already exists. Sign in instead.";
  }
  if (isApiError(error, 429)) {
    return error.message;
  }
  return errorMessage(error, "Sign-in failed. Please try again.");
}

export function SignInPage() {
  const me = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const config = useQuery(publicConfigQueryOptions);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [formError, setFormError] = useState<string | null>(
    searchParams.get("error") === "google"
      ? "Google sign-in was cancelled or failed. Try again or use your email."
      : null,
  );
  const [googlePending, setGooglePending] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;
  const destination = from && from !== "/sign-in" ? from : "/";

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  if (me.isPending) {
    return <FullPageLoader label="Checking your session" />;
  }

  if (me.data) {
    return <Navigate to={destination} replace />;
  }

  const googleEnabled = config.data?.auth.google ?? false;

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (mode === "sign-up") {
        const name = values.name?.trim();
        if (!name) {
          form.setError("name", { message: "Tell us what to call you." });
          return;
        }
        await signUpWithEmail({
          name,
          email: values.email,
          password: values.password,
        });
      } else {
        await signInWithEmail({
          email: values.email,
          password: values.password,
        });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      await queryClient.fetchQuery(meQueryOptions);
      void navigate(destination, { replace: true });
    } catch (error) {
      setFormError(friendlyAuthError(error, mode));
    }
  });

  const startGoogle = async () => {
    setFormError(null);
    setGooglePending(true);
    try {
      await signInWithGoogle(`${window.location.origin}/`);
    } catch (error) {
      setGooglePending(false);
      toast.error(
        errorMessage(error, "Google sign-in is unavailable right now."),
      );
    }
  };

  const nameError = form.formState.errors.name?.message;
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Turn meeting notes into a board your whole team can see move.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {googleEnabled ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={googlePending}
                onClick={() => void startGoogle()}
              >
                {googlePending ? (
                  <Spinner className="size-4" />
                ) : (
                  <HugeiconsIcon
                    icon={GoogleIcon}
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                )}
                Continue with Google
              </Button>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                or use your email
                <Separator className="flex-1" />
              </div>
            </>
          ) : null}

          <form
            onSubmit={(event) => void submit(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            {mode === "sign-up" ? (
              <FormField id="name" label="Name" error={nameError}>
                <Input
                  id="name"
                  autoComplete="name"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={describedBy("name", nameError)}
                  {...form.register("name")}
                />
              </FormField>
            ) : null}
            <FormField id="email" label="Email" error={emailError}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(emailError)}
                aria-describedby={describedBy("email", emailError)}
                {...form.register("email")}
              />
            </FormField>
            <FormField
              id="password"
              label="Password"
              error={passwordError}
              hint={mode === "sign-up" ? "At least 8 characters." : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
                aria-invalid={Boolean(passwordError)}
                aria-describedby={describedBy(
                  "password",
                  passwordError,
                  mode === "sign-up" ? "At least 8 characters." : undefined,
                )}
                {...form.register("password")}
              />
            </FormField>
            <Button
              type="submit"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : null}
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? "New to Huddle?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => {
              setFormError(null);
              form.clearErrors();
              setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            }}
          >
            {mode === "sign-in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
