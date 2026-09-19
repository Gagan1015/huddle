import { zodResolver } from "@hookform/resolvers/zod";
import { MailSend01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  INVITATION_TTL_DAYS,
  createInvitationInputSchema,
  type CreateInvitationInput,
  type InvitationRole,
} from "@huddle/shared";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { describedBy, FormField } from "@/components/common/form-field";
import { Spinner } from "@/components/common/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvitation } from "@/features/invitations";
import { errorMessage, isApiError } from "@/lib/api";
import { INVITATION_ROLES, ROLE_LABEL } from "@/lib/member-meta";

export function InviteMemberForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const createInvitation = useCreateInvitation(organizationId);
  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationInputSchema),
    defaultValues: { email: "", role: "MEMBER" },
  });
  const emailError = form.formState.errors.email?.message;

  const submit = form.handleSubmit((values) => {
    createInvitation.mutate(values, {
      onSuccess: (invitation) => {
        form.reset({ email: "", role: values.role });
        form.setFocus("email");
        toast.success(
          `${invitation.email} can join as soon as they sign in with that address.`,
        );
      },
      onError: (error) => {
        // "Already a member" belongs next to the field, not in a toast.
        if (isApiError(error, 409) && error.code === "ALREADY_MEMBER") {
          form.setError("email", { message: error.message });
          return;
        }
        toast.error(errorMessage(error));
      },
    });
  });

  return (
    <form
      onSubmit={(event) => void submit(event)}
      noValidate
      aria-labelledby="invite-heading"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div>
        <h3 id="invite-heading" className="text-lg font-semibold">
          Invite someone
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          No email is sent. Share the invite link or tell them to sign in with
          this address; the invitation expires after {INVITATION_TTL_DAYS} days.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <FormField
          id="invite-email"
          label="Email"
          error={emailError}
          className="flex-1"
        >
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="teammate@example.com"
            aria-invalid={Boolean(emailError)}
            aria-describedby={describedBy("invite-email", emailError)}
            {...form.register("email")}
          />
        </FormField>
        <FormField id="invite-role" label="Role" className="sm:w-36">
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(next) => field.onChange(next as InvitationRole)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITATION_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        {/* Label (14px) plus its gap (6px) is what sits above the inputs. */}
        <Button
          type="submit"
          disabled={createInvitation.isPending}
          className="sm:mt-5"
        >
          {createInvitation.isPending ? (
            <Spinner className="size-4 text-primary-foreground" />
          ) : (
            <HugeiconsIcon
              icon={MailSend01Icon}
              size={16}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
          Send invite
        </Button>
      </div>
    </form>
  );
}
