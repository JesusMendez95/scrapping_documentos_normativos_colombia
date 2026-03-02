const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument } = require('../utils/fileSaver');
const { wait } = require('../utils/requestManager');

const INVIMA_HOME_URL = 'https://www.invima.gov.co/';
const ENTITY_NAME = 'invima';

/**
 * Función principal para ejecutar el scraper de INVIMA.
 * Las alertas sanitarias y normatividades de Invima pueden estar
 * ocultas bajo JS pesado, por tanto, usaremos Puppeteer aquí también
 * asegurando la carga completa de elementos dinámicos.
 */
async function run() {
    logger.info(`💊 Iniciando scraper para: ${ENTITY_NAME.toUpperCase()}`);
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        logger.info(`Navegando a: ${INVIMA_HOME_URL}`);

        await page.goto(INVIMA_HOME_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extraer enlaces relevantes simulando cómo el navegador ve el DOM final renderizado
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => ({
                    text: a.innerText.trim(),
                    href: a.href
                }))
                .filter(a => {
                    if (!a.href || !a.text) return false;
                    const url = a.href.toLowerCase();
                    const title = a.text.toLowerCase();
                    // Invima tiene normatividad, resoluciones, circulares y alertas alimentarias/medicamentos
                    return url.includes('normatividad') ||
                        url.includes('resolucion') ||
                        url.includes('circular') ||
                        title.includes('resolución') ||
                        title.includes('circular');
                });
        });

        // Filtrar URLs únicas
        const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()];
        logger.info(`Se encontraron ${uniqueLinks.length} documentos normativos en portada Invima.`);

        const testLinks = uniqueLinks.slice(0, 2);

        for (const link of testLinks) {
            logger.info(`Extrayendo documento Invima: ${link.text} -> ${link.href}`);

            // Navegamos directamente al documento con Puppeteer en caso de que esté protegido (DDoS protect, etc)
            try {
                await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 45000 });

                const pageContent = await page.content();
                const $ = cheerio.load(pageContent);

                // Texto puro
                const mainText = $('body').text().replace(/\s+/g, ' ').trim();

                if (mainText.length > 50) {
                    saveTextDocument(ENTITY_NAME, link.text, mainText);
                } else {
                    logger.warn(`No se pudo leer texto del documento Invima: ${link.href}`);
                }

            } catch (navError) {
                logger.error(`Error navegando al documento de Invima (${link.href}): ${navError.message}`);
            }

            await wait(3000);
        }

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Navegador Puppeteer cerrado para Invima.');
        }
    }
}

module.exports = {
    run
};
