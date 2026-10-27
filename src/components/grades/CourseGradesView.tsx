"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { categoryScore, currentGrade, weightTotal } from "@/lib/grades/currentGrade";
import { formatNumber, formatPercent } from "@/lib/grades/format";
import { deleteGradeEntry } from "@/server-actions/grade-actions";

import { CategoryDeleteDialog } from "./CategoryDeleteDialog";
import { CategoryFormDialog, type EditableCategory } from "./CategoryFormDialog";
import { EntryFormDialog, type EditableEntry } from "./EntryFormDialog";

export interface GradeEntryDTO {
  id: string;
  categoryId: string;
  name: string;
  pointsEarned: number;
  pointsPossible: number;
  /** "YYYY-MM-DD" or null. */
  date: string | null;
}

export interface GradeCategoryDTO {
  id: string;
  name: string;
  weight: number;
  entries: GradeEntryDTO[];
}

export interface CourseGradesDTO {
  id: string;
  name: string;
  code: string | null;
  instructor: string | null;
  categories: GradeCategoryDTO[];
}

// Grade Entry dates are calendar dates stored at UTC midnight, so they are shown in UTC.
function formatEntryDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Detail page for one Course: its Grade Scheme and Grade Entries, with Current Grade. */
export function CourseGradesView({ course }: { course: CourseGradesDTO }) {
  const router = useRouter();
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EditableCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<EditableCategory | null>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditableEntry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { categories } = course;
  const grade = currentGrade(categories);
  const total = weightTotal(categories);
  // Compare with a small tolerance so decimal weights that add up to 100 do not warn.
  const weightsOff = categories.length > 0 && Math.abs(total - 100) > 1e-9;
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const entries = categories.flatMap((c) => c.entries);
  const refresh = () => router.refresh();

  function openAddCategory() {
    setEditingCategory(null);
    setCategoryFormOpen(true);
  }

  function openEditCategory(category: EditableCategory) {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  }

  function openAddEntry() {
    setEditingEntry(null);
    setEntryFormOpen(true);
  }

  function openEditEntry(entry: GradeEntryDTO) {
    setEditingEntry(entry);
    setEntryFormOpen(true);
  }

  async function removeEntry(id: string) {
    setDeleteError(null);
    const result = await deleteGradeEntry(id);
    if (!result.ok) setDeleteError(result.error);
    refresh();
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <Link href="/courses" className="text-sm text-muted-foreground hover:underline">
          ← Courses
        </Link>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl">{course.name}</h1>
            <p className="truncate text-sm text-muted-foreground">
              {course.instructor ?? "No instructor"}
              {course.code ? ` · ${course.code}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Current grade</p>
            <p
              className={`text-3xl font-bold ${grade === null ? "text-muted-foreground" : ""}`}
              aria-label={grade === null ? "No current grade yet" : undefined}
            >
              {formatPercent(grade, 1)}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
          {grade !== null && (
            <div
              className="h-full rounded-full bg-highlight"
              style={{ width: `${Math.min(Math.max(grade, 0), 100)}%` }}
            />
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Grade scheme</h2>
            <p className="text-sm text-muted-foreground">
              Total weight {formatNumber(total)}%
            </p>
          </div>
          <Button type="button" onClick={openAddCategory}>
            <Plus data-icon="inline-start" />
            Add category
          </Button>
        </div>

        {weightsOff && (
          <p
            role="status"
            className="rounded-lg bg-due-soon px-3 py-2 text-sm text-due-soon-foreground"
          >
            Weights total {formatNumber(total)}%, not 100%. You can still save; Current Grade
            rescales the weights of the categories that have entries.
          </p>
        )}

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add the weighted categories from the syllabus, such as Exams 40%.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((category) => {
              const score = categoryScore(category.entries);
              return (
                <li key={category.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.entries.length}{" "}
                      {category.entries.length === 1 ? "entry" : "entries"}
                      {score === null ? "" : ` · ${formatPercent(score, 1)}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatNumber(category.weight)}%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => openEditCategory(category)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeletingCategory(category)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">Grade entries</h2>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <Button type="button" onClick={openAddEntry} disabled={categories.length === 0}>
            <Plus data-icon="inline-start" />
            Add entry
          </Button>
        </div>

        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a category before recording scores.</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No grade entries yet. Add a score to see the current grade.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal">Category</th>
                  <th className="py-2 pr-3 font-normal">Score</th>
                  <th className="py-2 pr-3 font-normal">Date</th>
                  <th className="py-2 font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.flatMap((category) =>
                  category.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2 pr-3 font-semibold">{entry.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {categoryName.get(entry.categoryId)}
                      </td>
                      <td className="py-2 pr-3">
                        {formatNumber(entry.pointsEarned)} / {formatNumber(entry.pointsPossible)}
                        <span className="ml-2 text-muted-foreground">
                          {formatPercent((entry.pointsEarned / entry.pointsPossible) * 100, 1)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {entry.date ? formatEntryDate(entry.date) : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${entry.name}`}
                            onClick={() => openEditEntry(entry)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${entry.name}`}
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        courseId={course.id}
        category={editingCategory}
        onSaved={refresh}
      />
      <CategoryDeleteDialog
        category={deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onDeleted={refresh}
      />
      <EntryFormDialog
        open={entryFormOpen}
        onOpenChange={setEntryFormOpen}
        courseId={course.id}
        categories={categories}
        entry={editingEntry}
        onSaved={refresh}
      />
    </div>
  );
}
