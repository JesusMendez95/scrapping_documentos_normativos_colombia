const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');

const MINSALUD_HOME_URL = 'https://www.minsalud.gov.co/Portada/index.html';
const ENTITY_NAME = 'minsalud';

/**
 * Función principal para ejecutar el scraper de MinSalud.
 * Esta URL lleva a una portada que redirige. Suelen usar SharePoint y tienen
 * secciones específicas de 'Normatividad'.
 */
async function run() {
    logger.info(`⚕️ Iniciando scraper para: ${ENTITY_NAME.toUpperCase()}`);

    try {
        const response = await fetchWithRetry(MINSALUD_HOME_URL);

        if (!response || !response.data) {
            throw new Error('No se pudo establecer conexión inicial con MinSalud.');
        }

        const $ = cheerio.load(response.data);
        const resolutionLinks = [];

        // Buscamos enlaces relacionados con "Resolucion" y "Decreto"
        $('a').each((i, element) => {
            const href = $(element).attr('href');
            const title = $(element).attr('title') || $(element).text().trim();

            if (href) {
                const lowerHref = href.toLowerCase();
                const lowerTitle = title.toLowerCase();
                if (lowerHref.includes('normatividad') || lowerHref.includes('resolucion') || lowerTitle.includes('resolución')) {
                    // Normalizar URL (MinSalud a menudo usa rutas relativas /sites/)
                    const fullUrl = href.startsWith('http') ? href : `https://www.minsalud.gov.co${href.startsWith('/') ? href : '/' + href}`;
                    resolutionLinks.push({ text: title || 'Normativa_MinSalud', href: fullUrl });
                }
            }
        });

        // Filtrar URLs únicas
        const uniqueLinks = [...new Map(resolutionLinks.map(item => [item.href, item])).values()];

        logger.info(`🔎 Documentos potenciales encontrados en MinSalud: ${uniqueLinks.length}`);

        const testLinks = uniqueLinks.slice(0, 2);

        for (const link of testLinks) {
            logger.info(`Procesando normativa de Salud: ${link.text} -> ${link.href}`);

            const docResponse = await fetchWithRetry(link.href);

            if (docResponse && docResponse.data) {
                const $doc = cheerio.load(docResponse.data);

                // Extraer el texto completo del body y lidiar con la estructura típica de SharePoint
                const pageText = $doc('#s4-bodyContainer').text().replace(/\s+/g, ' ').trim()
                    || $doc('body').text().replace(/\s+/g, ' ').trim();

                if (pageText.length > 50) {
                    saveTextDocument(ENTITY_NAME, link.text, pageText);
                } else {
                    logger.warn(`Documento aparentemente vacío o sin texto accesible: ${link.href}`);
                }
            }

            await wait(2200); // Wait ético
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    }
}

module.exports = {
    run
};
