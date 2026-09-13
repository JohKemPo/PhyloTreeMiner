/**
 * Endereço do backend, vindo do ambiente (Vite injeta `VITE_*` em build/dev
 * a partir de `.env.development`/`.env.production`/`.env`).
 *
 * F-2: antes disto, `http://localhost:8000` estava fixado em 14 arquivos —
 * a aplicação não rodava fora da máquina do autor. Sem `VITE_API_URL`
 * definido (build de produção sem `.env`), cai em string vazia: quem
 * consome decide o que fazer, em vez de inventar um destino que não existe.
 */
export const API_URL = import.meta.env.VITE_API_URL || '';

/** Mesma política do `API_URL`, para o WebSocket de métricas do sistema. */
export const WS_URL = import.meta.env.VITE_WS_URL || '';
