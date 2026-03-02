const winston = require('winston');
const path = require('path');

// Formato de los logs: Timestamp [Nivel] Mensaje
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

// Configuración principal del logger
const logger = winston.createLogger({
    level: 'info',
    format: customFormat,
    transports: [
        // Consola (útil mientras desarrollamos y vemos el proceso)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                customFormat
            )
        }),
        // Archivo que guardará el histórico completo, ignorado en git
        new winston.transports.File({
            filename: path.join(__dirname, '../../output/scraper.log'),
            level: 'info'
        }),
        // Archivo específico para errores (facilita depuración)
        new winston.transports.File({
            filename: path.join(__dirname, '../../output/error.log'),
            level: 'error'
        })
    ]
});

module.exports = logger;
