import {
  Alert02Icon,
  ArrowDown01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { IMPORT_MAX_ISSUES, MEETING_NOTES_MAX } from "@huddle/shared";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { ImportProcessing } from "@/components/board/import-processing";
import { describedBy, FormField } from "@/components/common/form-field";
import { Spinner } from "@/components/common/page-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useImportNotes } from "@/features/imports";
import { useRealtimeStatus } from "@/features/realtime";
import { errorMessage } from "@/lib/api";
import { pluralize } from "@/lib/format";
import { SAMPLE_NOTES } from "@/lib/sample-notes";

const PLACEHOLDER = `Weekly sync, Sept 19
- Marcus to finish the pricing copy by Thursday
- Priya is halfway through the status page; needs DNS from IT
- Decision: launch stays Oct 14`;

const PRIVACY_NOTE =
  "Notes are sent to Claude only to identify tasks. Huddle does not keep a copy.";

// The signature interaction. The dialog stays open while Claude reads the
// notes, closes once the tasks are committed, and hands progress over to the
// board, where cards land one by one for everyone. On failure the notes stay
// put so a retry is one click away.
export function ImportNotesDialog({
  boardId,
  boardTitle,
  open,
  onOpenChange,
}: {
  boardId: string;
  boardTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const importNotes = useImportNotes(boardId);
  const realtime = useRealtimeStatus();
  const pending = importNotes.isPending;
  const trimmed = notes.trim();
  const canSubmit = trimmed.length > 0 && !pending;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    setError(null);
    importNotes.mutate(
      { notes: trimmed },
      {
        onSuccess: (result) => {
          setNotes("");
          onOpenChange(false);
          // With a live socket the board shows progress itself.
          if (realtime !== "connected") {
            toast.success(
              `${pluralize(result.total, "task")} created from your notes.`,
            );
          }
        },
        onError: (mutationError) =>
          setError(
            errorMessage(
              mutationError,
              "The import did not finish. Your notes are still here, so try again.",
            ),
          ),
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  const hint = `Up to ${IMPORT_MAX_ISSUES} tasks are created, each in the column that fits its state.`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing mid-request would hide the outcome; the wait is a few seconds.
        if (!next && pending) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <form
          noValidate
          className="flex flex-col gap-5"
          onKeyDown={onKeyDown}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon
                icon={SparklesIcon}
                size={18}
                strokeWidth={1.5}
                className="text-status-ai"
                aria-hidden="true"
              />
              Import notes
            </DialogTitle>
            <DialogDescription>
              Paste notes from a meeting. Claude picks out the actionable work
              and adds it to{" "}
              <strong className="font-medium text-foreground">
                {boardTitle}
              </strong>{" "}
              as issues you can edit, move, or delete.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <Alert variant="destructive">
              <HugeiconsIcon
                icon={Alert02Icon}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <AlertTitle>Nothing was imported</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <FormField id="import-notes" label="Meeting notes" hint={hint}>
            <div className="relative">
              <Textarea
                id="import-notes"
                autoFocus
                rows={10}
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setError(null);
                }}
                disabled={pending}
                maxLength={MEETING_NOTES_MAX}
                placeholder={PLACEHOLDER}
                aria-describedby={describedBy("import-notes", undefined, hint)}
                className="max-h-[50vh] min-h-52 resize-y leading-6"
              />
              {pending ? <ImportProcessing /> : null}
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              {notes.length === 0 && !pending ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Use sample notes
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={14}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuLabel>Sample meeting notes</DropdownMenuLabel>
                    {SAMPLE_NOTES.map((sample) => (
                      <DropdownMenuItem
                        key={sample.id}
                        className="flex-col items-start gap-0.5 py-1.5"
                        onSelect={() => setNotes(sample.notes)}
                      >
                        <span className="font-medium">{sample.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {sample.hint}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="shrink-0 tabular-nums">
                {notes.length.toLocaleString()} /{" "}
                {MEETING_NOTES_MAX.toLocaleString()}
              </span>
            </div>
          </FormField>

          <p className="text-xs leading-5 text-muted-foreground">
            {PRIVACY_NOTE}
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pending ? (
                <Spinner className="size-4 text-primary-foreground" />
              ) : (
                <HugeiconsIcon
                  icon={SparklesIcon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              )}
              {pending ? "Creating tasks…" : "Create tasks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
