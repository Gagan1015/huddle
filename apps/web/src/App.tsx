import { HugeiconsIcon } from "@hugeicons/react";
import { Task01Icon } from "@hugeicons/core-free-icons";

export function App() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-6 py-16 text-[hsl(var(--foreground))]">
      <section className="mx-auto max-w-3xl rounded-3xl border border-[hsl(var(--border))] bg-white p-8 shadow-sm sm:p-12">
        <div className="mb-8 flex size-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-white">
          <HugeiconsIcon icon={Task01Icon} size={22} strokeWidth={1.5} />
        </div>
        <p className="mb-3 text-sm font-medium text-[hsl(var(--primary))]">
          Workspace initialized
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn the conversation into a clear plan.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted-foreground))]">
          Huddle is ready for the organization, board, real-time, and
          notes-import phases.
        </p>
      </section>
    </main>
  );
}
