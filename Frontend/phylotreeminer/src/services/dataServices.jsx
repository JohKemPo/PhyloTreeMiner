import { API_URL, httpGet, httpPost } from './http';

/** Mantido por compatibilidade — vários componentes importam `API_BASE_URL`
 * daqui para montar URLs próprias (downloads, links). Fonte única: config.js. */
export const API_BASE_URL = API_URL;

/**
 * Busca a lista de projetos.
 */
export const fetchProjects = () => httpGet('projects');

/**
 * Busca a lista de dados de entrada (input_data).
 */
export const fetchInputData = () => httpGet('inputs_data');

export const fetchNcbiInfo = (identifier) =>
  httpPost('/api/ncbi/info', { identifier });

export const executeGraphQuery = (query) => httpPost('/api/neo4j/graph', { query });
