const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const REGISTRY_FILE = path.join(__dirname, '../../output/registry.json');
let registryCache = null;

/**
 * Carga el registro de URLs visitadas a la memoria.
 * Crea el archivo base si no existe.
 */
function loadRegistry() {
    if (registryCache !== null) return registryCache;

    try {
        if (!fs.existsSync(REGISTRY_FILE)) {
            // Asegurar que el directorio output existe
            const outputDir = path.dirname(REGISTRY_FILE);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(REGISTRY_FILE, JSON.stringify({ downloaded_urls: [] }, null, 2));
            registryCache = new Set();
        } else {
            const data = fs.readFileSync(REGISTRY_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            registryCache = new Set(parsed.downloaded_urls || []);
        }
    } catch (error) {
        logger.error(`Error cargando el registro de descargas: ${error.message}`);
        registryCache = new Set();
    }

    return registryCache;
}

/**
 * Guarda el caché de memoria en el archivo JSON.
 */
function saveRegistry() {
    if (registryCache === null) return;

    try {
        const dataToSave = {
            downloaded_urls: Array.from(registryCache)
        };
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        logger.error(`Error guardando el registro de descargas: ${error.message}`);
    }
}

/**
 * Verifica si una URL ya ha sido descargada/procesada previamente.
 * @param {string} url La URL a verificar
 * @returns {boolean}
 */
function isDownloaded(url) {
    const reg = loadRegistry();
    return reg.has(url);
}

/**
 * Marca una URL como descargada exitosamente en el registro.
 * La guarda inmeditamente a disco para prevenir pérdida de datos en caso de crash.
 * @param {string} url La URL que se completó
 */
function markAsDownloaded(url) {
    const reg = loadRegistry();
    if (!reg.has(url)) {
        reg.add(url);
        saveRegistry();
    }
}

module.exports = {
    isDownloaded,
    markAsDownloaded
};
