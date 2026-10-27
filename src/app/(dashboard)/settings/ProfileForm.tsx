"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import type { ProfileInput } from "@/lib/profile/validation";
import { saveProfile } from "@/server-actions/profile-actions";

interface ProfileFormProps {
  initial: ProfileInput;
  /** The connected Microsoft account's address, or null before one is connected. */
  email: string | null;
  /** IANA names for the timezone list, computed once on the server so SSR and hydration agree. */
  timeZones: string[];
}

const toForm = (p: ProfileInput) => ({
  name: p.name ?? "",
  program: p.program ?? "",
  termLabel: p.termLabel ?? "",
  timezone: p.timezone,
  reminderTime: p.reminderTime,
  remindersEnabled: p.remindersEnabled,
});

export function ProfileForm({ initial, email, timeZones }: ProfileFormProps) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(() => toForm(initial));
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

  // The saved zone is always selectable, even if the runtime's list spells it differently.
  const zoneOptions = timeZones.includes(values.timezone)
    ? timeZones
    : [values.timezone, ...timeZones];

  function toInput(): ProfileInput {
    return { ...values };
  }

  const dirty = JSON.stringify(toForm(saved)) !== JSON.stringify(values);

  function applyDeviceTimeZone() {
    setValues({ ...values, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await saveProfile(toInput());
      if (result.ok) {
        // Mirror the server's trimming/blank-to-null so the form is no longer "dirty".
        const next: ProfileInput = {
          ...toInput(),
          name: values.name.trim() || null,
          program: values.program.trim() || null,
          termLabel: values.termLabel.trim() || null,
          timezone: values.timezone.trim(),
        };
        setSaved(next);
        setValues(toForm(next));
        setStatus({ text: "Changes saved.", isError: false });
      } else {
        setStatus({ text: result.error, isError: true });
      }
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : "Could not save.", isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setValues(toForm(saved));
    setStatus(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-lg font-bold">Profile</h2>
        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="font-semibold">
              Full name
            </Label>
            <Input
              id="profile-name"
              value={values.name}
              placeholder="Your name"
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email" className="font-semibold">
              Email
            </Label>
            <Input
              id="profile-email"
              readOnly
              aria-readonly="true"
              value={email ?? ""}
              placeholder="Connect Microsoft to show your email"
              className="h-10 cursor-default text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">From your connected Microsoft account.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-program" className="font-semibold">
              Program
            </Label>
            <Input
              id="profile-program"
              value={values.program}
              placeholder="Your major"
              onChange={(e) => setValues({ ...values, program: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-term" className="font-semibold">
              Current term
            </Label>
            <Input
              id="profile-term"
              value={values.termLabel}
              placeholder="e.g. Fall 2026"
              onChange={(e) => setValues({ ...values, termLabel: e.target.value })}
              className="h-10"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-timezone" className="font-semibold">
              Timezone
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <select
                id="profile-timezone"
                value={values.timezone}
                onChange={(e) => setValues({ ...values, timezone: e.target.value })}
                className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:max-w-sm"
              >
                {zoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={applyDeviceTimeZone}>
                Use this device&apos;s timezone
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Decides which Assignments are due today and when your reminder time falls, wherever
              the server runs.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-lg font-bold">Reminders</h2>
        <div className="space-y-5">
          <label className="flex items-center gap-3 text-[15px]">
            <Checkbox
              checked={values.remindersEnabled}
              onCheckedChange={(checked) =>
                setValues({ ...values, remindersEnabled: checked === true })
              }
              className="size-5"
            />
            Remind me each morning when Assignments are due today
          </label>
          <div className="space-y-2">
            <Label htmlFor="reminder-time-hours" className="font-semibold">
              Reminder time ({values.timezone})
            </Label>
            <TimeInput
              id="reminder-time"
              value={values.reminderTime}
              onChange={(reminderTime) => setValues({ ...values, reminderTime })}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={submitting || !dirty}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={handleCancel} disabled={!dirty}>
          Cancel
        </Button>
        {status && (
          <p
            role="status"
            className={`text-sm ${status.isError ? "text-destructive" : "text-muted-foreground"}`}
          >
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
