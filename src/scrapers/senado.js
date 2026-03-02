const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');

const SENADO_BASE_URL = 'http://www.secretariasenado.gov.co';
const SENADO_HOME_URL = `${SENADO_BASE_URL}/senado/basedoc/arbol/1000.html`;
const ENTITY_NAME = 'senado';

/**
 * Función principal para ejecutar el scraper del Senado.
 * Este sitio típicamente usa frames o estructuras iterativas
 * en el "árbol". Vamos a extraer los enlaces base primero.
 */
async function run() {
    logger.info(`🏛️ Iniciando scraper para: ${ENTITY_NAME.toUpperCase()}`);
    let browser = null;

    try {
        // Lanzamos Puppeteer en modo headless "new" (mejor rendimiento)
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Simular User Agent real para evitar bloqueos
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        logger.info(`Navegando a la página principal: ${SENADO_HOME_URL}`);

        // Timeout de navegación amplio porque a veces las webs gubernamentales son lentas
        await page.goto(SENADO_HOME_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extraer los enlaces de interés en la página principal
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => ({
                    text: a.innerText.trim(),
                    href: a.href
                }))
                .filter(a => a.href && a.text && a.href.includes('/senado/basedoc/'));
        });

        logger.info(`Se encontraron ${links.length} enlaces principales en el directorio raíz.`);

        // Tomaremos los primeros 3 para probar la lógica de guardado sin saturar
        const testLinks = links.slice(0, 3);

        for (const link of testLinks) {
            logger.info(`Procesando documento: ${link.text} -> ${link.href}`);

            // Hacemos una petición limpia al documento usando nuestro requestManager (Axios)
            // porque ya tenemos la URL directa y es más rápido que navegar con puppeteer.
            const response = await fetchWithRetry(link.href);

            if (response && response.data) {
                // Cheerio para buscar el texto real del documento, limpiando HTML
                const $ = cheerio.load(response.data);

                // Muchas veces el texto está en body o div.WordSection1 (en Word a HTML)
                const bodyText = $('body').text()
                    .replace(/\s+/g, ' ') // Quita múltiples espacios
                    .trim();

                if (bodyText) {
                    saveTextDocument(ENTITY_NAME, link.text, bodyText);
                } else {
                    logger.warn(`No se pudo extraer texto claro de: ${link.text}`);
                }
            }

            // Esperar un tiempo prudencial entre documentos (Rate Limiting Ético)
            await wait(2000);
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Navegador Puppeteer cerrado.');
        }
    }
}

module.exports = {
    run
};
