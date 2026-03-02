const cheerio = require('cheerio');
const path = require('path');
const logger = require('../utils/logger');
const { saveTextDocument, saveRawFile, sanitizeFileName } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');
const registry = require('../utils/registry');

// La URL puede variar, asumimos una vista de lista estructurada a partir de la portada
// y usaremos una paginación teórica de Liferay (?p_p_id=...&cur=X) o buscaremos el link 'Siguiente'
const MINTRABAJO_HOME_URL = 'https://www.mintrabajo.gov.co/web/guest/normatividad';
const ENTITY_NAME = 'mintrabajo';

/**
 * Función principal para ejecutar el scraper de MinTrabajo (Paginado)
 */
async function run() {
    logger.info(`💼 Iniciando scraper (V2) para: ${ENTITY_NAME.toUpperCase()}`);

    try {
        let currentPageUrl = MINTRABAJO_HOME_URL;
        let pageNum = 1;

        while (currentPageUrl) {
            logger.info(`📄 [MinTrabajo] Analizando página ${pageNum}: ${currentPageUrl}`);
            const response = await fetchWithRetry(currentPageUrl);

            if (!response || !response.data) {
                logger.warn(`No se pudo cargar la página ${pageNum}. Abortando rastreo profundo.`);
                break;
            }

            const $ = cheerio.load(response.data);
            const links = [];

            // Buscar documentos (PDF, DOCX, etc.) en los enlaces
            $('a').each((i, element) => {
                const href = $(element).attr('href');
                let text = $(element).text().trim() || $(element).attr('title') || '';

                if (href && (href.toLowerCase().includes('normatividad') || href.toLowerCase().includes('/documents/'))) {
                    const fullUrl = href.startsWith('http') ? href : `https://www.mintrabajo.gov.co${href}`;

                    // Solo agregamos si no lo hemos descargado antes!
                    if (!registry.isDownloaded(fullUrl)) {
                        links.push({ text: text || `Resolucion_MinTrabajo_${Date.now()}_${i}`, href: fullUrl });
                    }
                }
            });

            // Evitar duplicados en la misma página
            const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()];
            logger.info(`🔎 [Pág ${pageNum}] Nuevos documentos a descargar: ${uniqueLinks.length}`);

            // === DESCARGAR DOCUMENTOS ===
            for (const link of uniqueLinks) {
                logger.info(`Descargando: ${link.text || 'Sin título'} -> ${link.href}`);

                // Si la URL apunta claramente a un archivo (PDF, DOC, DOCX)
                const isPdf = link.href.toLowerCase().includes('.pdf');
                const isDoc = link.href.toLowerCase().match(/\.(doc|docx)$/);

                // Descargar el archivo. Si es binario usamos 'arraybuffer'
                const docResponse = await fetchWithRetry(link.href, {}, (isPdf || isDoc || link.href.includes('/documents/')) ? 'arraybuffer' : 'text');

                if (docResponse && docResponse.data) {
                    const extension = isPdf ? '.pdf' : (isDoc ? isDoc[0] : null);

                    if (extension || (docResponse.headers && docResponse.headers['content-type'] && docResponse.headers['content-type'].includes('application/pdf'))) {
                        const fileExt = extension || '.pdf';
                        const saved = saveRawFile(ENTITY_NAME, link.text, fileExt, docResponse.data);
                        if (saved) registry.markAsDownloaded(link.href);
                    } else if (typeof docResponse.data === 'string') {
                        // Es una página HTML
                        const $doc = cheerio.load(docResponse.data);
                        let articleText = $doc('.journal-content-article').text().trim() || $doc('body').text().trim();
                        articleText = articleText.replace(/\s+/g, ' '); // Limpiar

                        if (articleText.length > 100) {
                            const saved = saveTextDocument(ENTITY_NAME, link.text, articleText);
                            if (saved) registry.markAsDownloaded(link.href);
                        }
                    }
                }

                // Pausa ética (Rate Limiting)
                await wait(2500);
            }

            // === LÓGICA DE PAGINACIÓN ===
            // Buscar el enlace "Siguiente" o "Next" (Específico de Liferay o plantillas de gobierno)
            const nextLinkElement = $('ul.pagination li:not(.disabled) a').filter((_, el) => $(el).text().toLowerCase().includes('siguiente') || $(el).attr('aria-label') === 'Next');

            if (nextLinkElement.length > 0) {
                const nextUrlPart = nextLinkElement.attr('href');
                currentPageUrl = nextUrlPart.startsWith('http') ? nextUrlPart : `https://www.mintrabajo.gov.co${nextUrlPart}`;
                pageNum++;
                logger.info(`➡️ Pasando a la siguiente página (${pageNum})...`);
                await wait(5000); // Pausa más larga entre páginas de índices
            } else {
                logger.info('🏁 No se encontraron más páginas. Crawling de MinTrabajo finalizado.');
                currentPageUrl = null; // Rompe el loop while
            }
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    }
}

module.exports = {
    run
};
