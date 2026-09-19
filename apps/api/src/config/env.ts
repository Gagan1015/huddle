import "dotenv/config";

import { z } from "zod";

// Values copied verbatim from .env.example are treated as unset so a half-filled
// file fails fast (secrets) or degrades gracefully (optional providers).
const placeholderPattern = /^replace_/i;

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && !placeholderPattern.test(trimmed) ? trimmed : undefined;
  });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters.")
    .refine((value) => !placeholderPattern.test(value), {
      message: "BETTER_AUTH_SECRET still has the placeholder value.",
    }),
  BETTER_AUTH_URL: z.url().default("http://localhost:4000"),
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_MODEL: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${problems}`);
  }

  return result.data;
}

export const env = loadEnv();

export const isGoogleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/** Meeting-notes import needs an Anthropic key; the model falls back to a default. */
export const isImportEnabled = Boolean(env.ANTHROPIC_API_KEY);
