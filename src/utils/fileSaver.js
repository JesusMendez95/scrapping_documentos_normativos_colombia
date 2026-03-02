const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Limpia y asanea el nombre de un archivo para que sea válido en cualquier sistema operativo.
 * Remueve caracteres especiales, acentos y espacios (los convierte a guiones bajos).
 * 
 * @param {string} fileName Nombre original sugerido
 * @returns {string} Nombre asaneado
 */
function sanitizeFileName(fileName) {
    return fileName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remueve acentos
        .replace(/[^a-z0-9]/g, '_') // Reemplaza caracteres no alfanuméricos por guiones bajos
        .replace(/_+/g, '_') // Colapsa múltiples guiones bajos en uno solo
        .substring(0, 150); // Limita la longitud
}

/**
 * Guarda contenido de texto en un archivo plano (.txt) dentro de la carpeta correspondiente a la entidad.
 * Crea los directorios si no existen.
 * 
 * @param {string} entityName Nombre de la entidad (ej: 'senado', 'mintrabajo')
 * @param {string} rawFileName Nombre base del archivo (ej: 'Resolucion 123 de 2024')
 * @param {string} content El texto plano a guardar
 * @returns {boolean} True si se guardó con éxito, False si hubo error
 */
function saveTextDocument(entityName, rawFileName, content) {
    try {
        if (!content || content.trim().length === 0) {
            logger.info(`El contenido para ${rawFileName} (${entityName}) está vacío. Se omite guardado.`);
            return false;
        }

        const safeEntity = sanitizeFileName(entityName);
        const safeFileBase = sanitizeFileName(rawFileName);

        // La ruta final: output/senado/resolucion_123_de_2024.txt
        // Corrección: Usar la carpeta 'output' en la raíz del proyecto
        const outputDir = path.join(__dirname, '../../output', safeEntity);
        const filePath = path.join(outputDir, `${safeFileBase}.txt`);

        // Crear la carpeta si no existe (recursive: true maneja carpetas anidadas de forma segura)
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            logger.info(`📁 Directorio creado: ${outputDir}`);
        }

        // Si el archivo ya existe, podríamos omitirlo o sobreescribirlo. Por ahora lo sobreescribimos.
        const isExists = fs.existsSync(filePath);

        fs.writeFileSync(filePath, content, 'utf-8');

        logger.info(`✅ Archivo ${isExists ? 'actualizado' : 'guardado'} exitosamente: ${filePath}`);
        return true;

    } catch (error) {
        logger.error(`❌ Error al guardar el documento ${rawFileName} de ${entityName}: ${error.message}`);
        return false;
    }
}

module.exports = {
    saveTextDocument,
    sanitizeFileName
};
