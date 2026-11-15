import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerSearch } from "@/components/CustomerSearch";

const { rpc, track } = vi.hoisted(() => ({ rpc: vi.fn(), track: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

describe("Customer search events", () => {
  beforeEach(() => {
    rpc.mockReset(); track.mockReset();
    window.__lovableEvents = { track };
  });
  it("counts a completed distinct manual search once, never as a camera scan", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CustomerSearch /></QueryClientProvider>);
    const input = screen.getByLabelText("Cerca cliente");
    fireEvent.change(input, { target: { value: "Cliente verifica" } });
    await screen.findByText("Nessun cliente trovato.");
    fireEvent.blur(input); fireEvent.blur(input);
    await waitFor(() => expect(track).toHaveBeenCalledTimes(1));
    expect(track).toHaveBeenCalledWith("project.customer_searched", {});
    expect(track).not.toHaveBeenCalledWith("project.card_scanned", expect.anything());
  });
});