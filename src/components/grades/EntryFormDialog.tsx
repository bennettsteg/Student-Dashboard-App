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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/grades/format";
import { addGradeEntry, updateGradeEntry } from "@/server-actions/grade-actions";

export interface EditableEntry {
  id: string;
  categoryId: string;
  name: string;
  pointsEarned: number;
  pointsPossible: number;
  /** "YYYY-MM-DD" or null. */
  date: string | null;
}

interface EntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  categories: Array<{ id: string; name: string }>;
  /** The Grade Entry being edited, or null to add a new one. */
  entry: EditableEntry | null;
  onSaved: () => void;
}

interface Values {
  name: string;
  categoryId: string;
  pointsEarned: string;
  pointsPossible: string;
  date: string;
}

function toNumber(text: string): number {
  return text.trim() === "" ? Number.NaN : Number(text);
}

/** The one add/edit form for Grade Entries. */
export function EntryFormDialog({
  open,
  onOpenChange,
  courseId,
  categories,
  entry,
  onSaved,
}: EntryFormDialogProps) {
  const [values, setValues] = useState<Values>({
    name: "",
    categoryId: "",
    pointsEarned: "",
    pointsPossible: "",
    date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset local state each time the dialog opens, for whichever entry (or none) it is for.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setValues(
        entry
          ? {
              name: entry.name,
              categoryId: entry.categoryId,
              pointsEarned: formatNumber(entry.pointsEarned),
              pointsPossible: formatNumber(entry.pointsPossible),
              date: entry.date ?? "",
            }
          : {
              name: "",
              categoryId: categories[0]?.id ?? "",
              pointsEarned: "",
              pointsPossible: "",
              date: "",
            },
      );
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input = {
        name: values.name,
        categoryId: values.categoryId,
        pointsEarned: toNumber(values.pointsEarned),
        pointsPossible: toNumber(values.pointsPossible),
        date: values.date || null,
      };
      const result = entry
        ? await updateGradeEntry(entry.id, input)
        : await addGradeEntry(courseId, input);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit grade entry" : "Add grade entry"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entry-name">Name</Label>
            <Input
              id="entry-name"
              required
              value={values.name}
              placeholder="e.g. Midterm 1"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-category">Category</Label>
            <Select
              items={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={values.categoryId || null}
              onValueChange={(categoryId) => setValues({ ...values, categoryId: categoryId ?? "" })}
            >
              <SelectTrigger id="entry-category" className="w-full">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="entry-earned">Points earned</Label>
              <Input
                id="entry-earned"
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={values.pointsEarned}
                onChange={(e) => setValues({ ...values, pointsEarned: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entry-possible">Points possible</Label>
              <Input
                id="entry-possible"
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={values.pointsPossible}
                onChange={(e) => setValues({ ...values, pointsPossible: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entry-date">Date (optional)</Label>
            <Input
              id="entry-date"
              type="date"
              value={values.date}
              onChange={(e) => setValues({ ...values, date: e.target.value })}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {entry ? "Save" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
