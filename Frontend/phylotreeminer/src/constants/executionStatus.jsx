import {
  CheckCircleOutlined,
  SyncOutlined,
  StopOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";

/**
 * Estados de execução — a mesma enumeração fechada que o backend devolve.
 *
 * Correção de D22. Antes havia quatro estados, e `idle` era ao mesmo tempo
 * "nunca executado" e "o parse do log não decidiu". A interface o mostrava
 * como **"Waiting"**, de modo que um projeto que rodou 8 h 43 min e morreu no
 * meio ficava indistinguível de um que nunca começou. Dois deles precisavam
 * existir separados, e faltava um terceiro para as execuções interrompidas.
 *
 * Este módulo é a fonte única: a galeria e a tabela liam mapas próprios, e
 * duas listas de estados divergindo é o mesmo defeito de D5 noutro assunto.
 * Ver `Backend/src/services/execution_state.py`, que define `ESTADOS`.
 */
export const STATUS_MAP = {
  running: {
    color: "blue",
    icon: <SyncOutlined spin />,
    text: "Em execução",
  },
  completed: {
    color: "green",
    icon: <CheckCircleOutlined />,
    text: "Concluída",
  },
  failed: {
    color: "red",
    icon: <CloseCircleOutlined />,
    text: "Falhou",
  },
  interrupted: {
    color: "orange",
    icon: <StopOutlined />,
    text: "Interrompida",
  },
  never_run: {
    color: "default",
    icon: <MinusCircleOutlined />,
    text: "Nunca executada",
  },
  unknown: {
    color: "gold",
    icon: <QuestionCircleOutlined />,
    text: "Indeterminado",
  },
};

export const VALID_STATUSES = Object.keys(STATUS_MAP);

/** Descrição longa, para o `title` do rótulo — um estado sem explicação vira superstição. */
export const STATUS_HINT = {
  running: "Há processo vivo para este projeto agora.",
  completed: "A execução terminou e declarou conclusão.",
  failed: "A execução terminou com erro registrado no log.",
  interrupted:
    "A execução começou, não declarou conclusão, e não há processo vivo. " +
    "Não é o mesmo que nunca ter sido executada.",
  never_run: "Não há vestígio de execução: nem manifesto, nem log.",
  unknown:
    "Há vestígio de execução, e ele não permite decidir o estado. " +
    "Indeterminado é um estado; não é zero.",
};

/**
 * `hh:mm:ss` a partir de segundos. `null` devolve o motivo, nunca `00:00:00`.
 *
 * A regra 5 do projeto: "não aplicável" nunca é um número. Uma duração
 * desconhecida exibida como zero é uma afirmação falsa sobre a execução.
 */
export function formatarDuracao(segundos) {
  if (segundos === null || segundos === undefined) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return [
    pad(Math.floor(segundos / 3600)),
    pad(Math.floor((segundos % 3600) / 60)),
    pad(segundos % 60),
  ].join(":");
}
