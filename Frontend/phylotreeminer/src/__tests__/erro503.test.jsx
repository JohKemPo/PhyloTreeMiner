import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup, screen } from "@testing-library/react";
import { UserProvider } from "../contexts/UserContext";
import GraphVisualization from "../components/analysis/GraphVisualization";

// jsdom não implementa matchMedia; o <Row> do antd usa isto para breakpoints.
window.matchMedia =
  window.matchMedia ||
  (() => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

// vis-network desenha em <canvas>, que o jsdom não implementa.
vi.mock("vis-network", () => ({
  Network: vi.fn().mockImplementation(function () {
    this.destroy = vi.fn();
    this.on = vi.fn();
    this.fit = vi.fn();
  }),
}));
vi.mock("vis-data", () => ({
  DataSet: vi.fn().mockImplementation((itens = []) => ({
    getIds: () => itens.map((i) => i.id),
    update: vi.fn(),
    remove: vi.fn(),
  })),
}));

// M4.1: com o Neo4j fora do ar, /api/neo4j/graph devolve 503 com este corpo
// e header Retry-After — a UI deve mostrar um banner, não ficar em branco.
function mockFetch503() {
  global.fetch = vi.fn((url) => {
    if (url.includes("/predefined-queries")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, queries: {} }),
      });
    }
    if (url.includes("/status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ connected: true, uri: "", username: "" }),
      });
    }
    if (url.includes("/api/neo4j/graph")) {
      return Promise.resolve({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            connected: false,
            message: "Neo4j está fora do ar no momento.",
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

const montar = () =>
  render(
    <UserProvider>
      <GraphVisualization />
    </UserProvider>,
  );

async function rodarConsultaDeGrafo(container, texto) {
  const textarea = container.querySelector(
    'textarea[placeholder="MATCH (n) RETURN n LIMIT 25"]',
  );
  fireEvent.change(textarea, { target: { value: texto } });
  const botao = Array.from(container.querySelectorAll("button")).find((b) =>
    b.textContent.includes("View Graph"),
  );
  fireEvent.click(botao);
}

describe("GraphVisualization — banner de 503 do Neo4j (M4.23)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mostra um banner de aviso com a mensagem do corpo, em vez de tela em branco", async () => {
    mockFetch503();
    const { container } = montar();

    await rodarConsultaDeGrafo(container, "MATCH (n:Tree) RETURN n");

    await waitFor(() =>
      expect(screen.getByText("Neo4j indisponível")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(/Neo4j está fora do ar no momento\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/Tente novamente em instantes/)).toBeInTheDocument();
  });
});
