const puppeteer = require('puppeteer');
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
async function exploreSenadoRecursively(page, url, depth = 0) {
    if (depth > 2) return; // Limitar profundidad en el MVP para no hacer un crawler infinito en pruebas. Quitar `depth` limit en prod.

    if (registry.isDownloaded(url)) {
        logger.info(`Ignorando URL ya explorada: ${url}`);
        return;
    }

    logger.info(`🏛️ [Senado Nivel ${depth}] Explorando: ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 50000 });

        // Obtener todos los enlaces de esta página/carpeta
        const links = await page.evaluate(() => {
            const anchorTags = Array.from(document.querySelectorAll('a'));
            return anchorTags
                .map(a => ({ text: a.innerText.trim(), href: a.href }))
                .filter(a => a.href && a.text && a.href.includes('/senado/basedoc/'));
        });

        const uniqueLinks = [...new Map(links.map(item => [item.href, item])).values()];

        for (const link of uniqueLinks) {
            // Si es un índice o carpeta, recursividad
            if (link.href.endsWith('.html') && link.href.includes('/arbol/')) {
                await exploreSenadoRecursively(page, link.href, depth + 1);
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
                        const $ = cheerio.load(docResponse.data);
                        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();

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
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        await exploreSenadoRecursively(page, SENADO_HOME_URL, 0);

    } catch (error) {
        logger.error(`Error crítico en scraper ${ENTITY_NAME}: ${error.stack}`);
    } finally {
        if (browser) {
            await browser.close();
            logger.info('Navegador Puppeteer cerrado para Senado.');
        }
    }
}

module.exports = {
    run
};
