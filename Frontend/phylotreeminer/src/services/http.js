import { API_URL, WS_URL } from '../config';
import { USER_ID_STORAGE_KEY } from '../contexts/UserContext';

/**
 * Lê o id de usuário direto do `localStorage` — a mesma chave que
 * `UserContext` grava. Um módulo de serviço não é um componente e não pode
 * usar hooks; ler a fonte de verdade que o contexto já mantém evita 12
 * chamadas repetindo `headers: { 'X-User-ID': userId }` manualmente (era
 * assim que nascia o F-8: uma esquecia o header e o backend devolvia 422).
 */
function idDoUsuario() {
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Erro de API com o status HTTP anexado, para a UI distinguir "indisponível"
 * (503, Neo4j fora do ar) de "não encontrado" (404) de "vazio" (200 sem
 * itens) — três estados diferentes que a versão anterior não tinha como
 * separar depois que a mensagem virava só uma string.
 */
export class ApiError extends Error {
  constructor(message, { status = null, detail = null, payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.payload = payload;
    this.isServiceUnavailable = status === 503;
    this.isNetworkError = status === null;
  }
}

async function corpoDeErro(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function montarUrl(path) {
  if (/^https?:|^wss?:/i.test(path)) return path;
  const base = API_URL || '';
  const barra = path.startsWith('/') ? '' : '/';
  return `${base}${barra}${path}`;
}

/**
 * Cliente único de `fetch`: base URL, header `X-User-ID` quando há um
 * usuário, `Content-Type` em corpo JSON, e erro padronizado (`ApiError`)
 * em vez de cada chamada reimplementar `if (!response.ok) throw ...`.
 *
 * @param {string} path - endpoint, com ou sem barra inicial (ex.: 'projects', '/api/neo4j/graph').
 * @param {object} [options]
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method]
 * @param {any} [options.body] - serializado como JSON, exceto se já for FormData.
 * @param {Record<string,string>} [options.headers]
 * @param {AbortSignal} [options.signal]
 * @param {boolean} [options.raw] - devolve a `Response` crua em vez de fazer `.json()`.
 * @param {string} [options.userId] - sobrescreve o id lido do `localStorage`.
 */
export async function request(path, options = {}) {
  const { method = 'GET', body, headers, signal, raw = false, userId } = options;

  const finalHeaders = { ...headers };
  const resolvedUserId = userId ?? idDoUsuario();
  if (resolvedUserId && !finalHeaders['X-User-ID']) {
    finalHeaders['X-User-ID'] = resolvedUserId;
  }

  let finalBody = body;
  const ehFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  // Corpo já serializado (ex.: `application/x-www-form-urlencoded`) passa
  // direto — só objetos viram JSON. Sem isto, uma string virava `"a=1"`
  // (JSON de string), não `a=1`.
  const jaSerializado = ehFormData || typeof body === 'string';
  if (body !== undefined && !jaSerializado) {
    if (!finalHeaders['Content-Type']) finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(montarUrl(path), {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal,
    });
  } catch (networkError) {
    if (networkError?.name === 'AbortError') throw networkError;
    throw new ApiError('Não foi possível contatar o backend.', {
      detail: networkError.message,
    });
  }

  if (!response.ok) {
    const errorBody = await corpoDeErro(response);
    const message =
      errorBody?.detail || errorBody?.message || `HTTP ${response.status}`;
    throw new ApiError(message, {
      status: response.status,
      detail: errorBody?.detail ?? errorBody?.message ?? null,
      payload: errorBody,
    });
  }

  if (raw) return response;
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export const httpGet = (path, options) => request(path, { ...options, method: 'GET' });
export const httpPost = (path, body, options) =>
  request(path, { ...options, method: 'POST', body });
export const httpPut = (path, body, options) =>
  request(path, { ...options, method: 'PUT', body });
export const httpPatch = (path, body, options) =>
  request(path, { ...options, method: 'PATCH', body });
export const httpDelete = (path, options) => request(path, { ...options, method: 'DELETE' });

/** Monta o endereço de um WebSocket a partir de `WS_URL` (mesma política do `API_URL`). */
export function wsUrl(path) {
  if (/^wss?:/i.test(path)) return path;
  const base = WS_URL || '';
  const barra = path.startsWith('/') ? '' : '/';
  return `${base}${barra}${path}`;
}

export { API_URL, WS_URL };
