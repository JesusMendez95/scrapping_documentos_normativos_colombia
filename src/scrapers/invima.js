const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { saveTextDocument, saveRawFile } = require('../utils/fileSaver');
const { fetchWithRetry, wait } = require('../utils/requestManager');
const registry = require('../utils/registry');

// La sección de normatividad principal suele tener paginación
const INVIMA_HOME_URL = 'https://www.invima.gov.co/normatividad';
const ENTITY_NAME = 'invima';

/**
 * Función principal para ejecutar el scraper de INVIMA.
 * Manejo de Paginación dinámica y documentos embebidos.
 */
async function run() {
    logger.info(`💊 Iniciando scraper (V2) para: ${ENTITY_NAME.toUpperCase()}`);
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        let currentPageUrl = INVIMA_HOME_URL;
        let pageNum = 1;

        while (currentPageUrl) {
            logger.info(`📄 [INVIMA] Navegando a página ${pageNum}: ${currentPageUrl}`);
            await page.goto(currentPageUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Extraer enlaces de documentos de la página actual
            const links = await page.evaluate(() => {
                const anchorTags = Array.from(document.querySelectorAll('a'));
                return anchorTags
                    .map(a => ({ text: a.innerText.trim(), href: a.href }))
                    .filter(a => {
                        if (!a.href || !a.text) return false;
                        const url = a.href.toLowerCase();
                        // Filtrar por extensiones directamente o palabras clave
                        return url.includes('.pdf') || url.includes('.doc') || url.includes('resolucion') || url.includes('circular');
                    });
            });

            // Filtrar y revisar caché
            const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()]
                .filter(link => !registry.isDownloaded(link.href));

            logger.info(`Se encontraron ${uniqueLinks.length} documentos *NUEVOS* en la página ${pageNum}.`);

            for (const link of uniqueLinks) {
                logger.info(`Extrayendo Invima: ${link.text || 'Documento'} -> ${link.href}`);

                const isPdf = link.href.toLowerCase().includes('.pdf');
                const isDoc = link.href.toLowerCase().match(/\.(doc|docx)$/);

                // Intento de descarga híbrida
                if (isPdf || isDoc || link.href.includes('/documentos/')) {
                    // Descarga directa binaria sin Puppeteer (mucho más rápido y estable)
                    const docResponse = await fetchWithRetry(link.href, {}, 'arraybuffer');

                    if (docResponse && docResponse.data) {
                        const extension = isPdf ? '.pdf' : (isDoc ? isDoc[0] : null);
                        if (extension || (docResponse.headers['content-type'] && docResponse.headers['content-type'].includes('application/pdf'))) {
                            const fileExt = extension || '.pdf';
                            const saved = saveRawFile(ENTITY_NAME, link.text, fileExt, docResponse.data);
                            if (saved) registry.markAsDownloaded(link.href);
                        }
                    }
                } else {
                    // Si es HTML, usar Puppeteer por si requiere JS rendering
                    try {
                        await page.goto(link.href, { waitUntil: 'networkidle2', timeout: 45000 });
                        const pageContent = await page.content();
                        const $ = cheerio.load(pageContent);
                        const mainText = $('body').text().replace(/\s+/g, ' ').trim();

                        if (mainText.length > 50) {
                            const saved = saveTextDocument(ENTITY_NAME, link.text, mainText);
                            if (saved) registry.markAsDownloaded(link.href);
                        }
                    } catch (navError) {
                        logger.error(`Error navegando al HTML de Invima (${link.href}): ${navError.message}`);
                    }
                }

                await wait(3000);
            }

            // Paginación: Buscar botón de siguiente página
            const nextLinkElement = await page.$('ul.pagination li.active + li a'); // Estrategia común de Bootstrap (li active seguido de li a)

            if (nextLinkElement) {
                const nextHref = await page.evaluate(el => el.href, nextLinkElement);
                if (nextHref && nextHref !== currentPageUrl) {
                    currentPageUrl = nextHref;
                    pageNum++;
                    logger.info(`➡️ Pasando a página Invima (${pageNum})...`);
                    await wait(5000);
                } else {
                    currentPageUrl = null;
                }
            } else {
                logger.info('🏁 No se encontró botón siguiente página. Crawling Invima finalizado.');
                currentPageUrl = null;
            }
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
