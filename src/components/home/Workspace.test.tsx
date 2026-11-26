import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Workspace from "@/components/home/Workspace";

// jsdom doesn't implement modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const PARTIES = [
  { name: "Harbor Media Inc.", role: "client" },
  { name: "Luna Park Studio", role: "vendor" },
];

function mockApi(parties = PARTIES) {
  const analyzeBodies: Array<Record<string, unknown>> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    if (url.endsWith("/api/upload-url")) return json({ uploadUrl: "https://uploads.example/put", objectKey: "uploads/a.docx" });
    if (url.startsWith("https://uploads.example")) return new Response(null, { status: 200 });
    if (url.endsWith("/api/precheck")) return json({ precheckPassed: true, precheckToken: "token", parties });
    if (url.endsWith("/api/analyze")) {
      analyzeBodies.push(JSON.parse(String(init?.body)));
      return json({ resultId: "pt_1", accessKey: "key", status: "refining", plan: "pro" });
    }
    return json({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return analyzeBodies;
}

async function addContractAndRead(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(input, new File(["This agreement is between Harbor and Luna."], "contract.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  await screen.findByText("Ready to analyze");
  await user.click(screen.getByRole("button", { name: /Read it/ }));
}

describe("Workspace asks which party you are", () => {
  it("asks before analyzing and sends the chosen party", async () => {
    const user = userEvent.setup();
    const analyzeBodies = mockApi();
    const { container } = render(<Workspace signedIn />);

    await addContractAndRead(user, container);
    expect(await screen.findByRole("heading", { name: "Which one are you?" })).toBeTruthy();
    expect(analyzeBodies).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: /Luna Park Studio/ }));
    await waitFor(() => expect(analyzeBodies).toHaveLength(1));
    expect(analyzeBodies[0].party).toBe("Luna Park Studio");
    expect(analyzeBodies[0]).not.toHaveProperty("parties");
  });

  it("lets the user skip choosing a side", async () => {
    const user = userEvent.setup();
    const analyzeBodies = mockApi();
    const { container } = render(<Workspace signedIn />);

    await addContractAndRead(user, container);
    await user.click(await screen.findByRole("button", { name: "Someone else, or not sure" }));
    await waitFor(() => expect(analyzeBodies).toHaveLength(1));
    expect(analyzeBodies[0]).not.toHaveProperty("party");
  });

  it("doesn't ask when the parties couldn't be found", async () => {
    const user = userEvent.setup();
    const analyzeBodies = mockApi([]);
    const { container } = render(<Workspace signedIn />);

    await addContractAndRead(user, container);
    await waitFor(() => expect(analyzeBodies).toHaveLength(1));
    expect(screen.queryByRole("heading", { name: "Which one are you?" })).toBeNull();
  });
});
