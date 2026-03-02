const axios = require('axios');
const https = require('https');
const logger = require('./logger');

// Configuración general de User-Agents y variables globales
const CONFIG = {
    // Array de User-Agents para ir rotando y simular navegación orgánica
    USER_AGENTS: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ],
    // Tiempos de espera por defecto
    REQUEST: {
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 3000,
        TIMEOUT_MS: 15000 // 15 segundos
    }
};

// Agente HTTPs para ignorar errores SSL de certificados raiz en webs del gobierno
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

/**
 * Obtiene un User-Agent aleatorio del listado.
 * @returns {string} User-Agent string
 */
function getRandomUserAgent() {
    const randomIndex = Math.floor(Math.random() * CONFIG.USER_AGENTS.length);
    return CONFIG.USER_AGENTS[randomIndex];
}

/**
 * Pausa la ejecución por un tiempo determinado (Sleep).
 * Útil para aplicar "Rate Limiting" manual.
 * @param {number} ms Milisegundos a pausar
 * @returns {Promise<void>}
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Realiza una petición GET con Axios, incorporando:
 * - Rotación de User-Agent.
 * - Manejo de Errores y Retries Automáticos.
 * - Logs automáticos.
 * 
 * @param {string} url La URL a consultar.
 * @param {object} headers Opcional. Headers extra (ej. validaciones específicas).
 * @param {string} responseType Opcional. Tipo de respuesta (ej. 'arraybuffer' para PDFs).
 * @returns {Promise<object>} Objeto de respuesta de Axios.
 */
async function fetchWithRetry(url, headers = {}, responseType = 'text', currentRetry = 0) {
    try {
        const _headers = {
            'User-Agent': getRandomUserAgent(),
            'Accept-Language': 'es-CO,es;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ...headers
        };

        const response = await axios.get(url, {
            headers: _headers,
            timeout: CONFIG.REQUEST.TIMEOUT_MS,
            responseType: responseType,
            httpsAgent: httpsAgent
        });

        return response;

    } catch (error) {
        // Ignorar si es un 404 definitivo
        if (error.response && error.response.status === 404) {
            logger.warn(`Recurso no encontrado (404) [${url}].`);
            return null;
        }

        const isLastAttempt = currentRetry >= CONFIG.REQUEST.MAX_RETRIES;

        logger.error(`Error en petición a [${url}]: ${error.message} - Intento: ${currentRetry + 1}/${CONFIG.REQUEST.MAX_RETRIES + 1}`);

        if (isLastAttempt) {
            logger.error(`Falló definitivamente la petición a [${url}] después de ${CONFIG.REQUEST.MAX_RETRIES} reintentos.`);
            return null; // O throw error según lo decidamos luego
        }

        // Si falló pero quedan reintentos, esperamos un tiempo (backoff) y reintentamos.
        // Se aumenta el tiempo exponencialmente: Intento 1: 3s, Intento 2: 6s, Intento 3: 9s.
        const backoffDelay = CONFIG.REQUEST.RETRY_DELAY_MS * (currentRetry + 1);
        logger.info(`🔄 Esperando ${backoffDelay / 1000}s antes de reintentar...`);

        await wait(backoffDelay);
        return fetchWithRetry(url, headers, responseType, currentRetry + 1);
    }
}

module.exports = {
    fetchWithRetry,
    wait,
    getRandomUserAgent,
    CONFIG
};
