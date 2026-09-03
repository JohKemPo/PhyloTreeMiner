import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, waitFor, cleanup, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserProvider } from "../contexts/UserContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import CQLExecutor from "../components/CQLExecutor";

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

// Regressão do painel/notificação de status de execução CQL em lote: o
// componente reconstrói sua própria função de continuação (executeNextCommand)
// a cada render, mas a chama recursivamente via setTimeout referenciando a si
// mesma — a cadeia inteira, do primeiro ao último chunk, roda com a closure
// de quando a execução começou. finishExecution lia `executionStats` direto
// dessa closure (sempre travado nos valores iniciais, antes de qualquer
// sucesso/falha ser contado) para montar tanto o modal quanto a notificação
// final, então os dois mostravam 0 sucessos / 0 falhas mesmo com resultados
// reais — e o card "Review and Retry", que lia o estado ao vivo por outro
// caminho, mostrava o número certo ao lado, desalinhado com o resto do painel.
function mockFetchBatch() {
  global.fetch = vi.fn((url) => {
    if (url.includes("/execute-batch")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            execution_type: "batch",
            executed: 1,
            total: 2,
            results: [
              { success: true },
              { success: false, error: "constraint violation" },
            ],
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

const montar = (fileContent) =>
  render(
    <MemoryRouter>
      <UserProvider>
        <NotificationProvider>
          <CQLExecutor fileContent={fileContent} fileName="test.cql" />
        </NotificationProvider>
      </UserProvider>
    </MemoryRouter>,
  );

describe("CQLExecutor — painel e notificação de status batem com o resultado real", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("modal, card de retry e notificação final mostram 1 sucesso/1 falha, não 0/0", async () => {
    mockFetchBatch();
    const { container } = montar(
      "MERGE (a:X) RETURN a; MERGE (b:Y) RETURN b;",
    );

    const botao = await screen.findByRole("button", { name: /Execute/i });
    fireEvent.click(botao);

    await waitFor(() => screen.getByText("Execution Result:"), {
      timeout: 3000,
    });

    // Alert de resumo (antes lia uma cópia congelada em 0/0 por bug de
    // closure em finishExecution)
    expect(
      screen.getByText("Execution Completed - 50% success rate"),
    ).toBeInTheDocument();
    expect(container.textContent).toContain(
      "1 of 2 commands executed successfully",
    );
    expect(container.textContent).toContain("1 commands failed");

    // Card de retry — mesma fonte agora, não pode divergir do Alert acima
    expect(
      screen.getByText("Review and Retry Failed Commands (1)"),
    ).toBeInTheDocument();

    // Notificação final (renderizada pelo GlobalNotificationCenter) — também
    // lia a closure travada; precisa mostrar os mesmos números do modal
    await waitFor(() =>
      expect(screen.getByText("CQL Execution Completed")).toBeInTheDocument(),
    );
    const notificationArea = screen
      .getByText("CQL Execution Completed")
      .closest(".ant-alert");
    expect(notificationArea.textContent).toMatch(/Success:\s*1/);
    expect(notificationArea.textContent).toMatch(/Failures:\s*1/);
    expect(notificationArea.textContent).toContain("Success rate: 50%");
  });
});
