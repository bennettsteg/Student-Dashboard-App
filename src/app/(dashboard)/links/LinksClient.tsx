"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLink, deleteLink } from "@/server-actions/link-actions";

export interface LinkDTO {
  id: string;
  name: string;
  url: string;
}

function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LinksClient({ links }: { links: LinkDTO[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError("Enter a name and a URL.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createLink({ name, url });
      setName("");
      setUrl("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLink(id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="link-name">Name</Label>
          <Input
            id="link-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blackboard"
            required
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g. ualearn.blackboard.com"
            required
          />
        </div>
        <Button type="submit" disabled={submitting}>
          Add link
        </Button>
        {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet — add one above.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {links.map((link) => (
            <li key={link.id} className="relative">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {link.name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="w-full truncate text-sm font-medium">{link.name}</span>
                <span className="w-full truncate text-xs text-muted-foreground">
                  {hostnameFor(link.url)}
                </span>
              </a>
              <button
                type="button"
                onClick={() => handleDelete(link.id)}
                disabled={pending}
                aria-label={`Remove ${link.name}`}
                className="absolute top-1 right-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
