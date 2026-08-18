"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLink, deleteLink } from "@/server-actions/link-actions";

const TILE_COLORS = ["#9e1b32", "#c9a15a", "#5b7c99", "#6b8f71", "#7c5295", "#4a8c8c"];

export interface LinkDTO {
  id: string;
  name: string;
  url: string;
}

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TILE_COLORS[hash % TILE_COLORS.length];
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
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="link-name">Name</Label>
          <Input
            id="link-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Blackboard"
            required
          />
        </div>
        <div className="space-y-1.5">
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
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links yet — add one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center hover:bg-accent"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(link.id);
                }}
                disabled={pending}
                aria-label={`Remove ${link.name}`}
                className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground hover:text-destructive"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ backgroundColor: colorFor(link.id) }}
              >
                {link.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="w-full truncate text-sm font-medium">{link.name}</span>
              <span className="w-full truncate text-xs text-muted-foreground">
                {hostnameFor(link.url)}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
