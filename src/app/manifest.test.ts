import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("installs as a standalone app named StudyDesk that starts at the dashboard", () => {
    expect(m.name).toBe("StudyDesk");
    expect(m.short_name).toBe("StudyDesk");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
  });

  it("uses the dark charcoal palette for splash and title bar", () => {
    expect(m.background_color).toBe("#292727");
    expect(m.theme_color).toBe("#292727");
  });

  it("declares 192 and 512 icons, each as both a regular and a maskable icon", () => {
    const icons = m.icons ?? [];
    const has = (size: string, purpose: string) =>
      icons.some(
        (i) =>
          i.sizes === size &&
          i.type === "image/png" &&
          (i.purpose ?? "any") === purpose,
      );
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("192x192", "maskable")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("never combines purposes in one icon entry", () => {
    for (const icon of manifest().icons ?? []) {
      expect(icon.purpose ?? "any").not.toContain(" ");
    }
  });
});
