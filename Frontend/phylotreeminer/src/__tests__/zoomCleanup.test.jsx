import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import * as d3 from "d3";
import PhylogeneticTreeViewer from "../components/analysis/PhylogeneticTreeViewer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PhylogeneticTreeViewer — limpeza do zoom D3 (M4.21)", () => {
  it("remove o listener de zoom do <svg> ao desmontar", () => {
    const onSpy = vi.spyOn(d3.selection.prototype, "on");

    const { unmount } = render(
      <PhylogeneticTreeViewer data="(A:0.1,B:0.1,C:0.1);" projectName={null} />,
    );

    unmount();

    // O cleanup do efeito de render precisa desanexar o listener de zoom do
    // <svg> — sem isto ele sobrevive entre renders (M4.21).
    const chamouLimpezaDoZoom = onSpy.mock.calls.some(
      (args) => args[0] === ".zoom" && args[1] === null,
    );
    expect(chamouLimpezaDoZoom).toBe(true);
  });

  it("desanexa o listener antigo antes de recriar o zoom numa mudança de layout", () => {
    const onSpy = vi.spyOn(d3.selection.prototype, "on");

    const { rerender } = render(
      <PhylogeneticTreeViewer data="(A:0.1,B:0.1,C:0.1);" projectName={null} />,
    );
    onSpy.mockClear();

    // Muda uma dependência do efeito de render (colorBy não é prop; usa-se
    // uma nova prop `data` equivalente para forçar o efeito a rodar de novo).
    rerender(
      <PhylogeneticTreeViewer data="(A:0.1,B:0.1,D:0.1);" projectName={null} />,
    );

    const chamouLimpezaDoZoom = onSpy.mock.calls.some(
      (args) => args[0] === ".zoom" && args[1] === null,
    );
    expect(chamouLimpezaDoZoom).toBe(true);
  });
});
