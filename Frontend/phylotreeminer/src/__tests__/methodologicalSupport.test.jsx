import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor, cleanup, screen } from "@testing-library/react";
import MethodologicalSupport from "../components/analysis/MethodologicalSupport";

// jsdom não implementa matchMedia; componentes do antd usam isto para breakpoints.
window.matchMedia =
  window.matchMedia ||
  (() => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const PROJETO = "Variola_VARV52_reexec_20260903";

const BRANCH_SUPPORT = {
  projeto: PROJETO,
  comparabilidade: {
    entre_metodos: false,
    nota: "Support values are NOT comparable across inference methods.",
  },
  arvores: [
    {
      pipeline: "mafft_iqtree",
      alinhador: "mafft",
      metodo: "iqtree",
      metrica: { id: "ufboot", rotulo: "UFBoot", limiar_alto: 95.0 },
      suporte_presente: true,
      ramos: [
        { clade_id: 111, n_taxa: 5, valor: 100.0, escala: [0.0, 100.0] },
        { clade_id: 222, n_taxa: 3, valor: 40.0, escala: [0.0, 100.0] },
      ],
    },
    {
      pipeline: "mafft_nj_distance",
      alinhador: "mafft",
      metodo: "nj_distance",
      metrica: null,
      suporte_presente: false,
      ramos: [],
    },
  ],
};

// clade 111 tem bootstrap=100 mas só 2 de 5 pipelines concordam — a
// discordância que o argumento do artigo mede (i).
const METODOLOGICO_MAFFT = {
  M: 5,
  clados: [
    { clade_id: 111, pipelines: ["mafft_iqtree", "mafft_raxml"], suporte: 0.4 },
    {
      clade_id: 222,
      pipelines: ["mafft_iqtree", "mafft_raxml", "mafft_fasttree"],
      suporte: 0.6,
    },
  ],
};

function mockFetchOk() {
  global.fetch = vi.fn((url) => {
    if (url.includes("/methodological-support")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(METODOLOGICO_MAFFT),
      });
    }
    if (url.includes("/branch-support")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(BRANCH_SUPPORT),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("MethodologicalSupport (M3.3) — bootstrap e suporte metodológico lado a lado", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("cruza bootstrap e suporte metodológico pelo mesmo clade e sinaliza a discordância", async () => {
    mockFetchOk();
    render(<MethodologicalSupport projectName={PROJETO} />);

    await waitFor(() =>
      expect(screen.getByText(/100\.0/)).toBeInTheDocument(),
    );

    // Clado 111: bootstrap 100, suporte metodológico 2/5 — a UI precisa
    // mostrar os dois números lado a lado, sem misturar escalas.
    expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    expect(screen.getByText(/discordant/i)).toBeInTheDocument();

    // O braço sem bootstrap (nj_distance) não deve virar linha na tabela —
    // não há bootstrap nenhum para cruzar.
    expect(screen.queryByText("mafft_nj_distance")).not.toBeInTheDocument();
  });

  it("não renderiza nada sem projectName", () => {
    const { container } = render(<MethodologicalSupport projectName={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
