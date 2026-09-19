import { zodResolver } from "@hookform/resolvers/zod";
import { Delete02Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ISSUE_DESCRIPTION_MAX,
  ISSUE_TITLE_MAX,
  type BoardColumn,
  type Issue,
  type UpdateIssueInput,
} from "@huddle/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { APPEND_INDEX } from "@/components/board/board-model";
import { useBoardPeople } from "@/components/board/board-people";
import {
  AssigneeSelect,
  DueDateInput,
  PrioritySelect,
} from "@/components/board/issue-field-controls";
import { ClaudeAvatar } from "@/components/common/claude-avatar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { describedBy, FormField } from "@/components/common/form-field";
import { Spinner } from "@/components/common/page-state";
import { UserAvatar } from "@/components/common/user-avatar";
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
  // Priority, assignee, and due date save on change; a separate mutation keeps
  // their spinner off the "Save changes" button that belongs to the text form.
  const updateMeta = useUpdateIssue(boardId);
  const moveIssue = useMoveIssue(boardId);
  const deleteIssue = useDeleteIssue(boardId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { userById } = useBoardPeople();

  const saveMeta = (patch: UpdateIssueInput) => {
    if (!issue) {
      return;
    }
    updateMeta.mutate(
      { issueId: issue.id, ...patch },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  };

  const creator = issue?.createdById ? userById.get(issue.createdById) : null;
  const assigner = issue?.assignedById
    ? userById.get(issue.assignedById)
    : null;
  // Claude authors imported issues; `createdById` then records who imported.
  const fromNotes = issue?.source === "AI_IMPORT";

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
                <span className="inline-flex items-center gap-1.5">
                  {fromNotes ? (
                    <ClaudeAvatar size="xs" />
                  ) : issue.createdById ? (
                    <UserAvatar user={creator} size="xs" />
                  ) : null}
                  Created {formatRelativeTime(issue.createdAt)}
                  {fromNotes
                    ? " by Claude"
                    : creator
                      ? ` by ${creator.name}`
                      : null}
                </span>
                {fromNotes && creator ? (
                  <span>· Imported by {creator.name}</span>
                ) : null}
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

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField id="issue-priority" label="Priority">
                  <PrioritySelect
                    id="issue-priority"
                    className="w-full"
                    value={issue.priority}
                    onChange={(priority) => saveMeta({ priority })}
                  />
                </FormField>
                <FormField id="issue-due-date" label="Due date">
                  <DueDateInput
                    id="issue-due-date"
                    value={issue.dueDate}
                    onChange={(dueDate) => saveMeta({ dueDate })}
                  />
                </FormField>
              </div>

              <FormField
                id="issue-assignee"
                label="Assignee"
                hint={
                  issue.assigneeId && assigner
                    ? `Assigned by ${assigner.name}.`
                    : undefined
                }
              >
                <AssigneeSelect
                  id="issue-assignee"
                  className="w-full"
                  value={issue.assigneeId}
                  onChange={(assigneeId) => saveMeta({ assigneeId })}
                />
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
