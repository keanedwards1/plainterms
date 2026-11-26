import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import SearchPanel from "@/components/search/SearchPanel";
import { invalidateDocumentIndex } from "@/lib/documentSearchIndex";

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
  invalidateDocumentIndex();
});

const DOCS = [
  {
    id: "pt_harbor",
    createdAt: "2026-11-24T00:00:00Z",
    fileName: "attachment Heavy 3.docx",
    status: "complete",
    riskScore: 53,
    riskLabel: "medium",
    recommendationAction: "negotiate",
    recommendationLabel: "Negotiate",
    flagCount: 5,
    expiresAt: null,
    parties: ["Harbor Media Inc.", "Luna Park Studio"],
    verdict: "Negotiate before you sign",
    issues: [],
    deal: [],
    gaps: [],
    text: "PRODUCTION SERVICES AGREEMENT This Agreement is between Harbor Media Inc. and Luna Park Studio. Any dispute goes to binding arbitration in Seattle.",
  },
];

function mockIndex() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ documents: DOCS, nextCursor: null }), { status: 200, headers: { "content-type": "application/json" } }))
  );
}

describe("SearchPanel", () => {
  it("finds documents by words inside the contract and opens the result with Enter", async () => {
    const user = userEvent.setup();
    mockIndex();
    render(<SearchPanel />);

    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Recent documents");
    await user.type(screen.getByRole("combobox"), "arbitr seat");

    const results = await screen.findByRole("listbox", { name: "Results" });
    const option = within(results).getByRole("option");
    expect(option.textContent).toContain("Production services agreement");
    expect(option.textContent).toContain("In the contract");
    expect(option.querySelectorAll("mark").length).toBeGreaterThan(0);

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/result/pt_harbor");
  });

  it("opens with Ctrl+K and says when nothing matches", async () => {
    const user = userEvent.setup();
    mockIndex();
    render(<SearchPanel />);
    await user.keyboard("{Control>}k{/Control}");
    await screen.findByText("Recent documents");
    await user.type(screen.getByRole("combobox"), "zebra");
    expect(await screen.findByText(/No documents match/)).toBeTruthy();
  });
});

describe("SearchPanel closing", () => {
  it("closes on Escape and on a click outside", async () => {
    const user = userEvent.setup();
    mockIndex();
    render(
      <div>
        <SearchPanel />
        <p>Outside</p>
      </div>
    );
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Recent documents");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Recent documents")).toBeNull();
    await user.click(screen.getByRole("combobox"));
    await screen.findByText("Recent documents");
    await user.click(screen.getByText("Outside"));
    expect(screen.queryByText("Recent documents")).toBeNull();
  });
});
