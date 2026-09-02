import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react";
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

// vis-network desenha em <canvas>, que o jsdom não implementa — mocka-se a
// classe inteira para poder inspecionar chamadas sem depender de canvas real.
const networkInstances = [];
vi.mock("vis-network", () => {
  return {
    Network: vi.fn().mockImplementation(function () {
      this.destroy = vi.fn();
      this.on = vi.fn();
      this.fit = vi.fn();
      networkInstances.push(this);
    }),
  };
});

class FakeDataSet {
  constructor(itens = []) {
    this._mapa = new Map(itens.map((item) => [item.id, item]));
  }
  getIds() {
    return Array.from(this._mapa.keys());
  }
  update = vi.fn((itens) => {
    itens.forEach((item) =>
      this._mapa.set(item.id, { ...this._mapa.get(item.id), ...item }),
    );
  });
  remove = vi.fn((ids) => {
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => this._mapa.delete(id));
  });
}
vi.mock("vis-data", () => ({
  DataSet: vi.fn().mockImplementation((itens) => new FakeDataSet(itens)),
}));

const grafo1 = {
  nodes: [{ id: "n1", label: "Tree" }],
  edges: [],
};
const grafo2 = {
  nodes: [
    { id: "n1", label: "Tree" },
    { id: "n2", label: "Subtree" },
  ],
  edges: [{ id: "e1", from: "n1", to: "n2", label: "HAS_SUBTREE" }],
};

function mockFetchSequencial(respostasGrafo) {
  let chamadasGrafo = 0;
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
      const data = respostasGrafo[chamadasGrafo];
      chamadasGrafo += 1;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data }),
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

describe("GraphVisualization — vis-network atualiza DataSet em vez de recriar (M4.22)", () => {
  beforeEach(() => {
    networkInstances.length = 0;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("cria a instância de Network uma única vez e atualiza os DataSets nas mudanças seguintes", async () => {
    mockFetchSequencial([grafo1, grafo2]);
    const { Network } = await import("vis-network");

    const { container } = montar();

    await rodarConsultaDeGrafo(container, "MATCH (n:Tree) RETURN n");
    await waitFor(() => expect(Network).toHaveBeenCalledTimes(1));

    const instancia = networkInstances[0];
    const nodesDataSet = Network.mock.calls[0][1].nodes;
    const edgesDataSet = Network.mock.calls[0][1].edges;

    await rodarConsultaDeGrafo(container, "MATCH (n:Subtree) RETURN n");
    await waitFor(() => expect(nodesDataSet.update).toHaveBeenCalled());

    // A instância não foi recriada nem destruída entre as duas mudanças.
    expect(Network).toHaveBeenCalledTimes(1);
    expect(instancia.destroy).not.toHaveBeenCalled();

    // Os DataSets já existentes foram atualizados, não substituídos.
    expect(nodesDataSet.update).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "n2" })]),
    );
    expect(edgesDataSet.update).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "e1" })]),
    );
  });
});
