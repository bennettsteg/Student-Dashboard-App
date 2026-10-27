"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { completeAssignment } from "@/server-actions/assignment-actions";

/**
 * The yes/no confirm for Complete, shared by the Assignments page and the Dashboard so both
 * behave identically: Yes permanently deletes the Assignment, anything else changes nothing.
 * Open it by passing the Assignment; `onClose` is called however it ends.
 */
export function CompleteAssignmentDialog({
  assignment,
  onClose,
}: {
  assignment: { id: string; title: string } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirmComplete() {
    if (!assignment) return;
    const id = assignment.id;
    startTransition(async () => {
      try {
        await completeAssignment(id);
      } finally {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <ConfirmDialog
      open={assignment !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Complete this assignment?"
      description={`"${assignment?.title ?? ""}" will be permanently deleted. This can't be undone.`}
      confirmLabel="Yes, complete"
      pending={pending}
      onConfirm={confirmComplete}
    />
  );
}
