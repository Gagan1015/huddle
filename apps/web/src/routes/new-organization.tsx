import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOrganizationInputSchema,
  type CreateOrganizationInput,
} from "@huddle/shared";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/common/form-field";
import { Spinner } from "@/components/common/page-state";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOrganization } from "@/features/organizations";
import { useWorkspace } from "@/features/workspace";
import { errorMessage } from "@/lib/api";
import { initials } from "@/lib/format";

export function NewOrganizationPage() {
  const navigate = useNavigate();
  const { organizations, setActiveOrganizationId } = useWorkspace();
  const createOrganization = useCreateOrganization();

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationInputSchema),
    defaultValues: { name: "", description: "" },
  });

  const name = form.watch("name");
  const nameError = form.formState.errors.name?.message;
  const descriptionError = form.formState.errors.description?.message;

  const submit = form.handleSubmit((values) => {
    createOrganization.mutate(values, {
      onSuccess: (organization) => {
        setActiveOrganizationId(organization.id);
        toast.success(`${organization.name} is ready.`);
        void navigate(`/organizations/${organization.id}`, { replace: true });
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {organizations.length === 0
                ? "Set up your workspace"
                : "New workspace"}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              A workspace holds your team&apos;s boards. You can invite others
              later.
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void submit(event)}
          noValidate
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <FormField
            id="organization-name"
            label="Workspace name"
            error={nameError}
          >
            <Input
              id="organization-name"
              placeholder="Northwind Studio"
              autoFocus
              aria-invalid={Boolean(nameError)}
              aria-describedby={describedBy("organization-name", nameError)}
              {...form.register("name")}
            />
          </FormField>
          <FormField
            id="organization-description"
            label="Description"
            hint="Optional. What does this team work on?"
            error={descriptionError}
          >
            <Textarea
              id="organization-description"
              rows={3}
              aria-invalid={Boolean(descriptionError)}
              aria-describedby={describedBy(
                "organization-description",
                descriptionError,
                "Optional. What does this team work on?",
              )}
              {...form.register("description")}
            />
          </FormField>

          <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background px-3 py-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(name || "Workspace")}
            </span>
            <span className="text-sm">
              <span className="block font-medium">
                {name.trim() || "Your workspace"}
              </span>
              <span className="block text-xs text-muted-foreground">
                This is how it appears in the sidebar.
              </span>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            {organizations.length > 0 ? (
              <Button asChild variant="ghost">
                <Link to="/">Cancel</Link>
              </Button>
            ) : null}
            <Button type="submit" disabled={createOrganization.isPending}>
              {createOrganization.isPending ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : null}
              Create workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
