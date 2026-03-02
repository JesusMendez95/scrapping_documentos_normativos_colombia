# Web Scraping de Normativa Colombiana

**Repositorio enfocado en la automatización de recolección de documentos legales, normativos y resoluciones de Colombia, específicamente para el sector empresarial, de contratación y farmacéutico.**

---

Este proyecto tiene como propósito principal extraer de manera estructurada y automatizada la información normativa más reciente proveniente de las entidades gubernamentales clave en Colombia. 

Genera de manera automatizada archivos de texto plano (`.txt`) listos para ser procesados, analizados o integrados en sistemas de validación legal para empresas colombianas.

## 🚀 Fuentes de Extracción
El scraper está diseñado para obtener documentos actualizados de las siguientes fuentes oficiales:

- 🏛️ **[Secretaría del Senado](http://www.secretariasenado.gov.co/senado/basedoc/arbol/1000.html)**: Leyes, Decretos y normatividad general.
- 💼 **[Ministerio del Trabajo](https://www.mintrabajo.gov.co/web/guest/inicio)**: Políticas laborales, resoluciones y normativas de contratación.
- 🏥 **[Ministerio de Salud y Protección Social](https://www.minsalud.gov.co/Portada/index.html)**: Resoluciones y normativas de salud pública.
- 💊 **[INVIMA](https://www.invima.gov.co/)**: Resoluciones, alertas y regulaciones del sector farmacéutico y alimentario.

## 🛠️ Tecnologías y Buenas Prácticas
Este proyecto está desarrollado íntegramente en **JavaScript** (Node.js) utilizando librerías robustas de scraping (como Puppeteer o Cheerio, dependiendo de la necesidad de renderizado del sitio web). 

### Criterios de Scraping Ético Implementados:
- **Control de Peticiones (`Rate Limiting`)**: Pausas aleatorias y tiempos de espera controlados entre solicitudes para no saturar los servidores gubernamentales.
- **Rotación de User-Agents**: Simulación de navegación orgánica para evitar bloqueos y baneos temporales.
- **Manejo de Errores y Reintentos (Retries)**: Sistema resiliente que maneja respuestas 4xx o 5xx sin afectar la ejecución general ni impactar a los servidores.
- **Caché y Verificación de Duplicados**: Prevención de descargas redundantes, garantizando la optimización de ancho de banda propio y de terceros.

## 📋 Estado del Proyecto (Roadmap)
- [x] Configuración del entorno base y `package.json`.
- [x] Implementación de la capa de control de concurrencia y peticiones.
- [x] Desarrollo de los parsers específicos por cada entidad (Senado, MinTrabajo, MinSalud e Invima).
- [x] Módulo de exportación, normalización y guardado en archivos en `.txt`.

## ⚙️ Requisitos e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/JesusMendez95/scrapping_documentos_normativos_colombia.git
   cd scrapping_documentos_normativos_colombia
   ```

2. **Instalar dependencias:**
   Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
   ```bash
   npm install
   ```
   *Nota: Dado que el proyecto usa Puppeteer, la instalación descargará un navegador Chromium de forma automática.*

## 🚀 Uso

Para iniciar el proceso global de extracción, simplemente ejecuta en la raíz del proyecto:

```bash
node src/index.js
```

### ¿Qué sucederá?
1. El script inicializará la recolección de manera secuencial (por defecto, configurada para no saturar tu red local ni los servidores destino).
2. Podrás monitorear el progreso a través de la consola gracias a `Winston Logger`.
3. Todos los documentos extraídos como texto puro `.txt` se guardarán automáticamente en la carpeta `output/` (la cual es ignorada en Git de manera intencional), organizados por la entidad gubernamental de origen.
4. Se generarán logs detallados del proceso en `output/scraper.log` y `output/error.log`.
