const logger = require('./utils/logger');
const senadoScraper = require('./scrapers/senado');
const mintrabajoScraper = require('./scrapers/mintrabajo');
const minsaludScraper = require('./scrapers/minsalud');
const invimaScraper = require('./scrapers/invima');

async function main() {
    logger.info('🚀 Iniciando proceso global de Extracción Normativa Colombiana...');
    console.time('Tiempo total de ejecución');

    try {
        // Ejecución secuencial o paralela de los scrapers dependiendo de recursos.
        // Se recomienda secuencial al inicio para no saturar la red local.

        /* 
        * ======================
        * ENTIDAD: SENADO
        * ======================
        */
        logger.info('--- Iniciando Scraping de Senado ---');
        await senadoScraper.run();

        /* 
        * ======================
        * ENTIDAD: MINTRABAJO
        * ======================
        */
        logger.info('--- Iniciando Scraping de MinTrabajo ---');
        await mintrabajoScraper.run();

        /* 
        * ======================
        * ENTIDAD: MINSALUD
        * ======================
        */
        logger.info('--- Iniciando Scraping de MinSalud ---');
        await minsaludScraper.run();

        /* 
        * ======================
        * ENTIDAD: INVIMA
        * ======================
        */
        logger.info('--- Iniciando Scraping de Invima ---');
        await invimaScraper.run();

        logger.info('🏁 Proceso global de extracción finalizado con éxito.');

    } catch (error) {
        logger.error(`🚨 Ocurrió un error crítico durante la ejecución de los scrapers: ${error.message}`);
    } finally {
        console.timeEnd('Tiempo total de ejecución');
    }
}

// Ejecutar el main si es llamado directamente (node src/index.js)
if (require.main === module) {
    main();
}

module.exports = main;
