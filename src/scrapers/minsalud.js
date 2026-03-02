const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument, saveRawFile } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');
const registry = require('../utils/registry');

const MINSALUD_HOME_URL = 'https://www.minsalud.gov.co/Normatividad/Paginas/Resoluciones.aspx'; // Usando URL directa de resoluciones para la fase 2
const ENTITY_NAME = 'minsalud';

/**
 * Función principal para ejecutar el scraper de MinSalud.
 */
async function run() {
    logger.info(`⚕️ Iniciando scraper (V2) para: ${ENTITY_NAME.toUpperCase()}`);

    try {
        const response = await fetchWithRetry(MINSALUD_HOME_URL);

        if (!response || !response.data) {
            throw new Error('No se pudo establecer conexión inicial con MinSalud.');
        }

        const $ = cheerio.load(response.data);
        const resolutionLinks = [];

        // MinSalud en resoluciones usa tablas. Buscamos todos los links de descarga.
        $('a').each((i, element) => {
            const href = $(element).attr('href');
            const title = $(element).attr('title') || $(element).text().trim() || `Resolucion_${Date.now()}_${i}`;

            if (href && (href.toLowerCase().includes('/normatividad_nuevo/') || href.toLowerCase().includes('resolucion'))) {
                const fullUrl = href.startsWith('http') ? href : `https://www.minsalud.gov.co${href.startsWith('/') ? href : '/' + href}`;

                if (!registry.isDownloaded(fullUrl)) {
                    resolutionLinks.push({ text: title, href: fullUrl });
                }
            }
        });

        // Filtrar URLs únicas
        const uniqueLinks = [...new Map(resolutionLinks.map(item => [item.href, item])).values()];
        logger.info(`🔎 Nuevos documentos a descargar en portada de Resoluciones de MinSalud: ${uniqueLinks.length}`);

        for (const link of uniqueLinks) {
            logger.info(`Procesando normativa de Salud: ${link.text} -> ${link.href}`);

            const isPdf = link.href.toLowerCase().includes('.pdf');
            const isDoc = link.href.toLowerCase().match(/\.(doc|docx)$/);

            const docResponse = await fetchWithRetry(link.href, {}, (isPdf || isDoc || link.href.includes('/Normatividad_Nuevo/')) ? 'arraybuffer' : 'text');

            if (docResponse && docResponse.data) {
                const extension = isPdf ? '.pdf' : (isDoc ? isDoc[0] : null);

                // Si la respuesta indica un PDF o pedimos un PDF, guardar archivo binario
                if (extension || (docResponse.headers && docResponse.headers['content-type'] && docResponse.headers['content-type'].includes('application/pdf'))) {
                    const fileExt = extension || '.pdf';
                    const saved = saveRawFile(ENTITY_NAME, link.text, fileExt, docResponse.data);
                    if (saved) registry.markAsDownloaded(link.href);
                }
                // Si es texto (Página web de detalle)
                else if (typeof docResponse.data === 'string') {
                    const $doc = cheerio.load(docResponse.data);
                    const pageText = $doc('#s4-bodyContainer').text().replace(/\s+/g, ' ').trim() || $doc('body').text().replace(/\s+/g, ' ').trim();

                    if (pageText.length > 50) {
                        const saved = saveTextDocument(ENTITY_NAME, link.text, pageText);
                        if (saved) registry.markAsDownloaded(link.href);
                    }
                }
            }

            await wait(2200); // Rate Limiting Minsalud
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    }
}

module.exports = {
    run
};
