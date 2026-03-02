# Web Scraping de Normativa Colombiana

**Repositorio enfocado en la automatización de recolección de documentos legales, normativos y resoluciones de Colombia, específicamente para el sector empresarial, de contratación y farmacéutico.**

---

Este proyecto tiene como propósito principal extraer de manera estructurada y automatizada la información normativa más reciente proveniente de las entidades gubernamentales clave en Colombia. 

El sistema es capaz de generar de manera automatizada archivos de texto plano (`.txt`) y descargar los **documentos originales en crudo** (`.pdf`, `.docx`) listos para ser procesados, analizados o integrados en sistemas de validación legal e IAs para empresas colombianas.

## 🚀 Fuentes de Extracción
El scraper está diseñado para obtener iterativamente y en profundidad los documentos actualizados de las siguientes fuentes oficiales:

- 🏛️ **[Secretaría del Senado](http://www.secretariasenado.gov.co/senado/basedoc/arbol/1000.html)**: Leyes, Decretos y normatividad general. *(Extracción recursiva en árbol de directorios)*
- 💼 **[Ministerio del Trabajo](https://www.mintrabajo.gov.co/web/guest/inicio)**: Políticas laborales, resoluciones y normativas de contratación. *(Extracción con paginación en sub-directorios)*
- 🏥 **[Ministerio de Salud y Protección Social](https://www.minsalud.gov.co/Normatividad/Paginas/Resoluciones.aspx)**: Resoluciones y normativas de salud pública. *(Descarga directa multipágina)*
- 💊 **[INVIMA](https://www.invima.gov.co/normatividad)**: Resoluciones, alertas y regulaciones del sector farmacéutico y alimentario. *(Scraping de aplicaciones dinámicas DOM renderizadas)*

## 🛠️ Tecnologías y Arquitectura
Este proyecto está desarrollado íntegramente en **JavaScript** (Node.js) utilizando librerías robustas de scraping (Puppeteer y Cheerio) y estrategias avanzadas para Crawling e indexación de documentos.

### Arquitectura de Extracción a Gran Escala (V2)
- 💾 **Gestión de Estado y Caché (Registry)**: Integra un administrador de descargas persistente (`registry.json`) que registra cada URL analizada y descargada. Esto permite detener, pausar o enfrentar fallas de red **reanudando la extracción directamente desde el punto exacto donde falló**, sin descargas redundantes.
- 📂 **Multi-Formato**: Análisis inteligente de `Content-Type` para guardar el archivo binario crudo (`PDF`, `DOCX`) siempre que esté disponible, reservando el procesamiento web scraping HTML para generar archivos de texto plano (`.txt`).
- 🤖 **Deep Crawling**: Cada módulo navega de forma autónoma a lo largo de docenas de páginas de paginación (`MinTrabajo`, `MinSalud`, `Invima`), y profundiza de manera recursiva (DFS) en directorios jerárquicos (`Senado`). *(Senado optimizado con Axios/Cheerio puro para evasión de bloqueos `ERR_BLOCKED_BY_CLIENT`)*.

### Criterios de Scraping Ético Implementados:
- **Control de Peticiones (`Rate Limiting`)**: Pausas aleatorias y tiempos de espera controlados entre solicitudes para no saturar los servidores gubernamentales.
- **Rotación de User-Agents**: Simulación de navegación orgánica.
- **Manejo de Errores y Reintentos**: Sistema resiliente (`fetchWithRetry`) que maneja respuestas intermitentes de red con *Exponential Backoff*.

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
   *Nota: La instalación descargará un navegador Chromium de forma automática para la simulación de usuario de Puppeteer.*

## 🚀 Uso

Para iniciar el proceso global de extracción, simplemente ejecuta en la raíz del proyecto:

```bash
node src/index.js
```

### ¿Qué sucederá?
1. El script inicializará la recolección masiva de manera iterativa y paralizada controladamente. *(Aviso: Dado que respetamos la capacidad de los servidores nacionales, una extracción limpia desde 0 puede durar varias horas)*.
2. Podrás monitorear el progreso a través de tu terminal gracias al `Logger` de Winston.
3. El estado de la extracción se autoguardará constantemente; puedes finalizar el proceso en cualquier momento con `Ctrl + C` de manera segura.
4. Los documentos `.pdf`, `.docx` y `.txt` descubiertos se organizarán impecablemente en la carpeta `output/{entidad}/` garantizando nombres limpios y normalizados.
5. Los logs de historial se persistirán en `output/scraper.log` y `output/error.log`.
