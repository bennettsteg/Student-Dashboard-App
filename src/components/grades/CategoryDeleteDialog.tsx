"use client";

import { useEffect, useState } from "react";

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
  deleteGradeCategory,
  getGradeCategoryDeleteImpact,
} from "@/server-actions/grade-actions";

interface CategoryDeleteDialogProps {
  /** The Grade Category being deleted, or null when the dialog is closed. */
  category: { id: string; name: string } | null;
  onClose: () => void;
  onDeleted: () => void;
}

/** Confirm deleting a Grade Category, which also deletes its Grade Entries. */
export function CategoryDeleteDialog({ category, onClose, onDeleted }: CategoryDeleteDialogProps) {
  // The loaded count is keyed by Category so a stale result is never shown for another one.
  const [loaded, setLoaded] = useState<{ categoryId: string; entries: number | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const categoryId = category?.id ?? null;
  const entries = loaded && loaded.categoryId === categoryId ? loaded.entries : null;

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    getGradeCategoryDeleteImpact(categoryId).then((impact) => {
      if (!cancelled) setLoaded({ categoryId, entries: impact?.entries ?? 0 });
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  async function handleConfirm() {
    if (!category) return;
    setSubmitting(true);
    try {
      await deleteGradeCategory(category.id);
      onDeleted();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={category !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {category?.name}?</DialogTitle>
          <DialogDescription>
            {entries === null
              ? "Checking what this will delete…"
              : entries === 0
                ? "This permanently deletes the category. This cannot be undone."
                : `This permanently deletes the category and ${entries} grade ${entries === 1 ? "entry" : "entries"}. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting || entries === null}
          >
            {submitting ? "Deleting…" : "Delete category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
