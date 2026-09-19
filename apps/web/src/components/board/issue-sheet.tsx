import { zodResolver } from "@hookform/resolvers/zod";
import { Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TITLE_MAX,
  type BoardColumn,
  type Issue,
} from "@huddle/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { APPEND_INDEX } from "@/components/board/board-model";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteIssue,
  useMoveIssue,
  useUpdateIssue,
} from "@/features/boards";
import { errorMessage } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

const issueFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the issue a title.")
    .max(ISSUE_TITLE_MAX),
  description: z.string().trim().max(ISSUE_DESCRIPTION_MAX),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

export function IssueSheet({
  boardId,
  issue,
  columns,
  open,
  onOpenChange,
}: {
  boardId: string;
  issue: Issue | null;
  columns: BoardColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateIssue = useUpdateIssue(boardId);
  const moveIssue = useMoveIssue(boardId);
  const deleteIssue = useDeleteIssue(boardId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: { title: "", description: "" },
  });

  const issueId = issue?.id;
  const issueUpdatedAt = issue?.updatedAt;

  // Re-seed the form when a different issue opens or the server copy changes.
  useEffect(() => {
    if (issue) {
      form.reset({ title: issue.title, description: issue.description ?? "" });
    }
  }, [issueId, issueUpdatedAt, form]);

  const titleError = form.formState.errors.title?.message;
  const descriptionError = form.formState.errors.description?.message;
  const currentColumn = columns.find((column) => column.id === issue?.columnId);

  const save = form.handleSubmit((values) => {
    if (!issue) {
      return;
    }
    updateIssue.mutate(
      {
        issueId: issue.id,
        title: values.title,
        description: values.description || null,
      },
      {
        onSuccess: () => toast.success("Issue saved."),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
      >
        {issue ? (
          <>
            <SheetHeader className="border-b border-border">
              <SheetTitle className="sr-only">Issue details</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2 text-xs">
                {issue.source === "AI_IMPORT" ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">
                    <HugeiconsIcon
                      icon={SparklesIcon}
                      size={12}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    Created from meeting notes
                  </span>
                ) : null}
                <span>Created {formatRelativeTime(issue.createdAt)}</span>
                {issue.updatedAt !== issue.createdAt ? (
                  <span>· Updated {formatRelativeTime(issue.updatedAt)}</span>
                ) : null}
              </SheetDescription>
            </SheetHeader>

            <form
              id="issue-form"
              className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5"
              onSubmit={(event) => void save(event)}
              noValidate
            >
              <FormField id="issue-title" label="Title" error={titleError}>
                <Input
                  id="issue-title"
                  className="text-base font-medium"
                  maxLength={ISSUE_TITLE_MAX}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={describedBy("issue-title", titleError)}
                  {...form.register("title")}
                />
              </FormField>

              <FormField id="issue-column" label="Column">
                <Select
                  value={issue.columnId}
                  onValueChange={(columnId) => {
                    if (columnId === issue.columnId) {
                      return;
                    }
                    moveIssue.mutate(
                      { issueId: issue.id, columnId, index: APPEND_INDEX },
                      { onError: (error) => toast.error(errorMessage(error)) },
                    );
                  }}
                >
                  <SelectTrigger id="issue-column" className="w-full">
                    <SelectValue placeholder="Choose a column">
                      {currentColumn?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                id="issue-description"
                label="Description"
                error={descriptionError}
                hint="Plain text. Keep the outcome and the next step clear."
              >
                <Textarea
                  id="issue-description"
                  rows={8}
                  maxLength={ISSUE_DESCRIPTION_MAX}
                  aria-invalid={Boolean(descriptionError)}
                  aria-describedby={describedBy(
                    "issue-description",
                    descriptionError,
                    "Plain text. Keep the outcome and the next step clear.",
                  )}
                  {...form.register("description")}
                />
              </FormField>
            </form>

            <SheetFooter className="flex-row items-center justify-between border-t border-border">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  form="issue-form"
                  disabled={updateIssue.isPending || !form.formState.isDirty}
                >
                  {updateIssue.isPending ? (
                    <Spinner className="size-4 text-primary-foreground" />
                  ) : null}
                  Save changes
                </Button>
              </div>
            </SheetFooter>

            <ConfirmDialog
              open={confirmDelete}
              onOpenChange={setConfirmDelete}
              title="Delete this issue?"
              description={`“${issue.title}” will be removed from the board. This cannot be undone.`}
              confirmLabel="Delete issue"
              destructive
              pending={deleteIssue.isPending}
              onConfirm={() =>
                deleteIssue.mutate(issue.id, {
                  onSuccess: () => {
                    setConfirmDelete(false);
                    onOpenChange(false);
                    toast.success("Issue deleted.");
                  },
                  onError: (error) => toast.error(errorMessage(error)),
                })
              }
            />
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Issue details</SheetTitle>
            <SheetDescription>
              This issue is no longer on the board.
            </SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
