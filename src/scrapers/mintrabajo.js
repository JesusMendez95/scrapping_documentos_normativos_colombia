const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');

const MINTRABAJO_HOME_URL = 'https://www.mintrabajo.gov.co/web/guest/inicio';
const ENTITY_NAME = 'mintrabajo';

/**
 * Función principal para ejecutar el scraper de MinTrabajo.
 * Este sitio suele estar basado en Liferay, podemos scrapear sus secciones de noticias o normatividad.
 */
async function run() {
    logger.info(`💼 Iniciando scraper para: ${ENTITY_NAME.toUpperCase()}`);

    try {
        logger.info(`Obteniendo página principal: ${MINTRABAJO_HOME_URL}`);

        // Petición directa con Request Manager (Maneja rotación de User-Agents y Retries)
        const response = await fetchWithRetry(MINTRABAJO_HOME_URL);

        if (!response || !response.data) {
            throw new Error('No se pudo obtener el contenido HTML principal de MinTrabajo.');
        }

        const $ = cheerio.load(response.data);
        const links = [];

        // Estrategia base: buscar enlaces en su menú de 'Normatividad' o 'Resoluciones'
        // Como no conocemos la estructura exacta del menú en vivo, extraemos todos los enlaces
        // que contengan la palabra 'normatividad' o 'resoluciones'.
        $('a').each((i, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();

            if (href && (href.toLowerCase().includes('normatividad') || href.toLowerCase().includes('resolucion'))) {
                // Formateamos enlaces relativos a absolutos si es necesario
                const fullUrl = href.startsWith('http') ? href : `https://www.mintrabajo.gov.co${href}`;
                links.push({ text: text || `Documento_MinTrabajo_${i}`, href: fullUrl });
            }
        });

        // Eliminar duplicados básicos por URL
        const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()];

        logger.info(`🔎 Se encontraron ${uniqueLinks.length} enlaces posiblemente relacionados con normatividad.`);

        // Procesamos solo una muestra de 2 para probar sin saturar el servidor del ministerio
        const testLinks = uniqueLinks.slice(0, 2);

        for (const link of testLinks) {
            logger.info(`Descargando y analizando: ${link.text || 'Sin título'} -> ${link.href}`);

            const docResponse = await fetchWithRetry(link.href);

            if (docResponse && docResponse.data) {
                // Ojo: Si es un PDF, esto requerirá pdf-parse posteriormente.
                // Por ahora asumimos que redirige a una vista HTML del documento o un abstract.

                const $doc = cheerio.load(docResponse.data);

                // Muchas páginas gubernamentales en Liferay guardan el contenido en portlet-body o journal-content
                let articleText = $doc('.journal-content-article').text().replace(/\s+/g, ' ').trim();

                // Fallback si no está el selector específico
                if (!articleText) {
                    articleText = $doc('body').text().replace(/\s+/g, ' ').trim();
                }

                if (articleText.length > 100) { // Validamos que al menos haya texto sustancial
                    saveTextDocument(ENTITY_NAME, link.text || `Normativa-${Date.now()}`, articleText);
                } else {
                    logger.warn(`El enlace ${link.href} no parece contener texto HTML sustancial (¿quizás es un PDF directo?).`);
                }
            }

            // Pausa ética (Rate Limiting)
            await wait(2500);
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    }
}

module.exports = {
    run
};
