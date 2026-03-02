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

## 📋 Próximos Pasos (Roadmap)
- [ ] Configuración del entorno base y `package.json`.
- [ ] Implementación de la capa de control de concurrencia y peticiones.
- [ ] Desarrollo de los parsers específicos por cada entidad (Senado, MinTrabajo, MinSalud e Invima).
- [ ] Módulo de exportación, normalización y guardado en archivos en `.txt`.

## ⚙️ Uso
> *Se actualizará con las instrucciones de instalación y ejecución a medida que se estructure el código.*
