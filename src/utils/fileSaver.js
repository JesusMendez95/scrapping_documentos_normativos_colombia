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
    if (!fileName) return `doc_${Date.now()}`;
    return fileName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remueve acentos
        .replace(/[^a-z0-9]/g, '_') // Reemplaza caracteres no alfanuméricos por guiones bajos
        .replace(/_+/g, '_') // Colapsa múltiples guiones bajos en uno solo
        .replace(/_$/g, '')  // Remueve guion bajo al final si quedó
        .substring(0, 150) || `doc_${Date.now()}`; // Limita la longitud y previene vacíos
}

/**
 * Asegura la creación del directorio para una entidad y retorna su ruta.
 */
function ensureEntityDirectory(entityName) {
    const safeEntity = sanitizeFileName(entityName);
    const outputDir = path.join(__dirname, '../../output', safeEntity);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        logger.info(`📁 Directorio de entidad verificado/creado: ${outputDir}`);
    }
    return outputDir;
}

/**
 * Guarda contenido de texto en un archivo plano (.txt).
 */
function saveTextDocument(entityName, rawFileName, content) {
    try {
        if (!content || content.trim().length === 0) {
            logger.info(`El contenido para ${rawFileName} (${entityName}) está vacío. Se omite guardado txt.`);
            return false;
        }

        const outputDir = ensureEntityDirectory(entityName);
        const safeFileBase = sanitizeFileName(rawFileName);
        const filePath = path.join(outputDir, `${safeFileBase}.txt`);

        const isExists = fs.existsSync(filePath);
        fs.writeFileSync(filePath, content, 'utf-8');

        logger.info(`✅ Archivo TXT ${isExists ? 'actualizado' : 'guardado'} exitosamente: ${safeFileBase}.txt`);
        return true;
    } catch (error) {
        logger.error(`❌ Error al guardar el txt de ${rawFileName} (${entityName}): ${error.message}`);
        return false;
    }
}

/**
 * Guarda un archivo binario/crudo (Stream o Buffer) como PDF, DOCX, ZIP, etc.
 * 
 * @param {string} entityName Nombre de la entidad (ej: 'mintrabajo')
 * @param {string} rawFileName Nombre base deseado
 * @param {string} extension Extensión del archivo incluyendo el punto (ej: '.pdf')
 * @param {Buffer|stream} fileData Los datos a escribir
 * @returns {boolean}
 */
function saveRawFile(entityName, rawFileName, extension, fileData) {
    try {
        const outputDir = ensureEntityDirectory(entityName);
        const safeFileBase = sanitizeFileName(rawFileName);

        // Asegurarse de que no dupliquemos la extensión (ej: archivo_pdf.pdf)
        const cleanBase = safeFileBase.endsWith(extension.replace('.', ''))
            ? safeFileBase.substring(0, safeFileBase.lastIndexOf('_'))
            : safeFileBase;

        const filePath = path.join(outputDir, `${cleanBase}${extension}`);

        const isExists = fs.existsSync(filePath);
        fs.writeFileSync(filePath, fileData); // Funciona bien con Buffers o Cadenas

        logger.info(`💾 Archivo BINARIO (${extension.toUpperCase()}) guardado exitosamente: ${cleanBase}${extension}`);
        return true;
    } catch (error) {
        logger.error(`❌ Error al guardar el archivo binario ${rawFileName}${extension}: ${error.message}`);
        return false;
    }
}

module.exports = {
    saveTextDocument,
    saveRawFile,
    sanitizeFileName
};
