import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopFixes from "@/components/result/TopFixes";

const ITEMS = ["Lower the deposit.", "Require lien waivers.", "Add a finish date.", "A fourth ask."];

describe("TopFixes", () => {
  it("shows at most three fixes, in order", () => {
    render(<TopFixes items={ITEMS} emptyMessage="Nothing to fix." />);
    const fixes = screen.getAllByRole("listitem");
    expect(fixes).toHaveLength(3);
    expect(fixes[0].textContent).toContain("Lower the deposit.");
    expect(screen.queryByText("A fourth ask.")).toBeNull();
  });

  it("copies a fix to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<TopFixes items={ITEMS} emptyMessage="Nothing to fix." />);
    await user.click(screen.getByRole("button", { name: "Copy fix 2" }));
    expect(writeText).toHaveBeenCalledWith("Require lien waivers.");
    expect(screen.getByRole("button", { name: "Copy fix 2" }).textContent).toBe("Copied");
  });

  it("offers an email draft only when there are fixes", async () => {
    const user = userEvent.setup();
    const onDraftEmail = vi.fn();
    const { rerender } = render(<TopFixes items={ITEMS} onDraftEmail={onDraftEmail} emptyMessage="Nothing to fix." />);
    await user.click(screen.getByRole("button", { name: /Draft email/ }));
    expect(onDraftEmail).toHaveBeenCalledOnce();

    rerender(<TopFixes items={[]} onDraftEmail={onDraftEmail} emptyMessage="Nothing to fix." />);
    expect(screen.queryByRole("button", { name: /Draft email/ })).toBeNull();
    expect(screen.getByText("Nothing to fix.")).toBeTruthy();
  });
});
