"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/grades/format";
import { addGradeCategory, updateGradeCategory } from "@/server-actions/grade-actions";

export interface EditableCategory {
  id: string;
  name: string;
  weight: number;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  /** The Grade Category being edited, or null to add a new one. */
  category: EditableCategory | null;
  onSaved: () => void;
}

/** The one add/edit form for Grade Categories. */
export function CategoryFormDialog({
  open,
  onOpenChange,
  courseId,
  category,
  onSaved,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog opens, for whichever Category (or none) it is for.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(category?.name ?? "");
      setWeight(category ? formatNumber(category.weight) : "");
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input = { name, weight: weight.trim() === "" ? Number.NaN : Number(weight) };
      const result = category
        ? await updateGradeCategory(category.id, input)
        : await addGradeCategory(courseId, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              required
              value={name}
              placeholder="e.g. Exams"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-weight">Weight (%)</Label>
            <Input
              id="category-weight"
              required
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              value={weight}
              placeholder="e.g. 40"
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {category ? "Save" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
