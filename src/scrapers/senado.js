const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument, saveRawFile } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');
const registry = require('../utils/registry');

// Directorio raíz de normatividad del Senado
const SENADO_HOME_URL = 'http://www.secretariasenado.gov.co/senado/basedoc/arbol/1000.html';
const ENTITY_NAME = 'senado';

/**
 * Función recursiva que explora carpetas y documentos.
 * En Senado, en lugar de paginación lineal, es un árbol de enlaces.
 */
async function exploreSenadoRecursively(url, depth = 0) {
    if (registry.isDownloaded(url)) {
        logger.info(`Ignorando URL ya explorada: ${url}`);
        return;
    }

    logger.info(`🏛️ [Senado Nivel ${depth}] Explorando: ${url}`);

    try {
        const response = await fetchWithRetry(url);
        if (!response || !response.data) {
            logger.warn(`No se pudo cargar la URL del Senado: ${url}`);
            return;
        }

        const $ = cheerio.load(response.data);
        const links = [];

        // Obtener la ruta base actual para armar URLs relativas correctamente
        const currentUrlObj = new URL(url);
        const basePath = currentUrlObj.pathname.substring(0, currentUrlObj.pathname.lastIndexOf('/') + 1);
        const baseUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}${basePath}`;

        $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();

            if (href && !href.startsWith('javascript') && !href.startsWith('#')) {
                let fullUrl = '';
                if (href.startsWith('http')) {
                    fullUrl = href;
                } else if (href.startsWith('/')) {
                    fullUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}${href}`;
                } else {
                    fullUrl = `${baseUrl}${href}`;
                }

                // Asegurar que nos mantenemos dentro del Senado y evitamos links muertos
                if (fullUrl.includes('/senado/basedoc/')) {
                    links.push({ text: text || 'Doc_Senado', href: fullUrl });
                }
            }
        });

        const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()];

        for (const link of uniqueLinks) {
            // Si es un índice o carpeta, recursividad
            if (link.href.endsWith('.html') && link.href.includes('/arbol/')) {
                await exploreSenadoRecursively(link.href, depth + 1);
            }
            // Si es un documento específico (ej. un .html directo de una ley o un .doc)
            else if (!registry.isDownloaded(link.href)) {
                logger.info(`Descargando Ley/Norma Senado: ${link.text} -> ${link.href}`);

                const isPdf = link.href.toLowerCase().includes('.pdf');
                const isDoc = link.href.toLowerCase().match(/\.(doc|docx)$/);

                const docResponse = await fetchWithRetry(link.href, {}, (isPdf || isDoc) ? 'arraybuffer' : 'text');

                if (docResponse && docResponse.data) {
                    const extension = isPdf ? '.pdf' : (isDoc ? isDoc[0] : null);

                    if (extension || (docResponse.headers['content-type'] && docResponse.headers['content-type'].includes('application/pdf'))) {
                        const fileExt = extension || '.pdf';
                        const saved = saveRawFile(ENTITY_NAME, link.text, fileExt, docResponse.data);
                        if (saved) registry.markAsDownloaded(link.href);
                    } else if (typeof docResponse.data === 'string') {
                        const $doc = cheerio.load(docResponse.data);
                        const bodyText = $doc('body').text().replace(/\s+/g, ' ').trim();

                        if (bodyText) {
                            const saved = saveTextDocument(ENTITY_NAME, link.text, bodyText);
                            if (saved) registry.markAsDownloaded(link.href);
                        }
                    }
                }
                await wait(2000); // Rate Limiting
            }
        }

        // Marcar la carpeta/índice en sí como visitada
        registry.markAsDownloaded(url);

    } catch (error) {
        logger.error(`Error explorando URL del Senado: ${url} - ${error.message}`);
    }
}

async function run() {
    logger.info(`🏛️ Iniciando scraper (V2) para: ${ENTITY_NAME.toUpperCase()}`);
    try {
        await exploreSenadoRecursively(SENADO_HOME_URL, 0);
    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    }
}

module.exports = {
    run
};
