const API_BASE_URL = 'http://localhost:8000';

/**
 * Função genérica para tratar as requisições e erros.
 * @param {string} endpoint - O endpoint da API para fazer a requisição.
 * @returns {Promise<any>} - Retorna os dados em formato JSON.
 * @throws {Error} - Lança um erro se a requisição falhar.
 */
async function fetchFromAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching from endpoint ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Busca a lista de projetos.
 */
export const fetchProjects = () => {
  return fetchFromAPI('projects');
};

/**
 * Busca a lista de dados de entrada (input_data).
 */
export const fetchInputData = () => {
  return fetchFromAPI('inputs_data');
};