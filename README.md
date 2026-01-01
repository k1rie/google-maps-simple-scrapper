# Scraper de Google Maps - API

API backend con Express y Puppeteer para extraer información completa de negocios (nombre, teléfono, dirección, calificación, etc.) de los resultados de búsqueda en Google Maps. Incluye opción para descargar los resultados en formato CSV.

## 🚀 Instalación

```bash
npm install
```

## 📦 Dependencias

- **express**: Framework web para Node.js
- **puppeteer**: Librería para automatizar navegador (Chrome/Chromium)
- **nodemon**: Herramienta para desarrollo con auto-reload
- **cors**: Middleware para habilitar CORS

## 🏃 Uso

### Modo desarrollo (con nodemon):
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

## 🐳 Docker

### Construir y ejecutar con Docker:

```bash
# Construir la imagen
docker build -t scrapper-maps .

# Ejecutar el contenedor
docker run -d -p 3000:3000 --name scrapper-maps scrapper-maps
```

### Usar Docker Compose:

```bash
# Construir y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

El servidor estará disponible en `http://localhost:3000`

## 📡 Endpoints

### GET /scrape
Extrae información completa de negocios de una búsqueda en Google Maps.

**Parámetros:**
- `query` o `search`: Texto a buscar en Google Maps
- `format` (opcional): Si es `csv` o `CSV`, descarga los resultados en formato CSV

**Ejemplos:**

**Obtener resultados en JSON:**
```bash
curl "http://localhost:3000/scrape?query=medicos%20especialistas%20en%20chiapas"
```

**Descargar resultados en CSV:**
```bash
curl "http://localhost:3000/scrape?query=medicos%20especialistas%20en%20chiapas&format=csv" -o negocios.csv
```

### POST /scrape
Mismo endpoint pero acepta parámetros en el body.

**Ejemplos:**

**Obtener resultados en JSON:**
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "medicos especialistas en chiapas"}'
```

**Descargar resultados en CSV:**
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "medicos especialistas en chiapas", "format": "csv"}' \
  -o negocios.csv
```

### GET /health
Endpoint de salud para verificar que el servidor está funcionando.

## 📋 Respuesta

### Formato JSON (por defecto)

```json
{
  "success": true,
  "query": "medicos especialistas en chiapas",
  "totalNegocios": 15,
  "negocios": [
    {
      "nombre": "Dr. Juan Pérez - Especialista en Cardiología",
      "telefono": "961 930 0214",
      "direccion": "Av. Central 123, Tuxtla Gutiérrez, Chiapas",
      "calificacion": "4.5",
      "reseñas": "120",
      "categoria": "Médico especialista"
    },
    {
      "nombre": "Clínica Médica San José",
      "telefono": "961 453 1050",
      "direccion": "Calle 5 de Mayo 456, Chiapas",
      "calificacion": "4.8",
      "reseñas": "85",
      "categoria": "Clínica médica"
    },
    ...
  ]
}
```

### Formato CSV

Cuando se usa el parámetro `format=csv`, la respuesta es un archivo CSV descargable con las siguientes columnas:
- nombre
- telefono
- direccion
- calificacion
- reseñas
- categoria

El archivo incluye BOM UTF-8 para compatibilidad con Excel.

## 📁 Estructura del Proyecto

```
scrapper-maps/
├── controllers/          # Controladores (lógica de negocio)
│   └── scrapeController.js
├── routes/              # Rutas de la API
│   ├── scrapeRoutes.js
│   └── healthRoutes.js
├── services/            # Servicios (lógica de scraping)
│   └── scraperService.js
├── server.js            # Punto de entrada de la aplicación
├── package.json
└── README.md
```

## ⚙️ Características

- ✅ Arquitectura MVC con separación de responsabilidades
- ✅ Scraping automático con Puppeteer (navegador headless)
- ✅ Scroll automático hasta encontrar todos los resultados
- ✅ Detección del mensaje "No hay más resultados"
- ✅ Extracción completa de información de negocios:
  - Nombre del negocio
  - Número de teléfono
  - Dirección
  - Calificación
  - Número de reseñas
  - Categoría/tipo de negocio
- ✅ Eliminación de duplicados por nombre
- ✅ Soporte para formatos mexicanos e internacionales de teléfono
- ✅ Exportación a CSV con un solo parámetro
- ✅ Manejo de errores robusto

## 🔧 Configuración

El puerto puede configurarse mediante la variable de entorno `PORT`:

```bash
PORT=4000 npm start
```

## 🔍 Verificación de Instalación

Para verificar que Puppeteer está instalado correctamente:

```bash
npm run check
```

Este comando verifica que el navegador pueda lanzarse correctamente.

## 🛠️ Solución de Problemas

### Error: "Failed to launch the browser process" en macOS

**Este es un problema conocido en macOS**, especialmente en versiones recientes. Los warnings sobre "unexpected crash info version 7" son normales y no críticos.

**✅ Solución automática:**
El código ahora detecta automáticamente si Chrome está instalado en macOS y lo usa. Si tienes Chrome instalado, debería funcionar sin configuración adicional.

**Si aún tienes problemas:**

1. **Dar permisos de accesibilidad a Terminal/Node:**
   - Ve a: **Preferencias del Sistema** → **Seguridad y Privacidad** → **Privacidad** → **Accesibilidad**
   - Asegúrate de que Terminal (o tu IDE) tenga permisos

2. **Verificar que Chrome está instalado:**
   ```bash
   ls -la "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   ```

### 🚀 Producción (Railway/Linux)

**¡Buenas noticias!** En producción **NO tendrás este problema** porque:

- ✅ Railway usa **Linux**, no macOS
- ✅ Puppeteer funciona **perfectamente** en Linux
- ✅ No hay problemas de permisos como en macOS
- ✅ El código detecta automáticamente el entorno y usa la configuración correcta
- ✅ Chromium se descarga automáticamente durante el build

**No necesitas hacer nada especial para producción.** El código ya está configurado para:
- **Desarrollo (macOS)**: Usa Chrome del sistema si está disponible
- **Producción (Linux)**: Usa Chromium de Puppeteer automáticamente

**Otras soluciones:**

1. **Verificar que Chromium se descargó:**
   ```bash
   ls -la node_modules/puppeteer/.local-chromium/
   ```
   Si está vacío, forzar descarga:
   ```bash
   rm -rf node_modules/puppeteer/.local-chromium
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm install puppeteer --force
   ```

2. **En macOS, verificar herramientas de desarrollo:**
   ```bash
   xcode-select --install
   ```
   Si ya está instalado, verificar:
   ```bash
   xcode-select -p
   ```

3. **Problemas con Rosetta (Mac con Apple Silicon):**
   Si estás en una Mac con Apple Silicon y Node.js está ejecutándose bajo Rosetta:
   ```bash
   # Verificar arquitectura
   uname -m
   node -p "process.arch"
   ```
   Asegúrate de que ambos coincidan.

4. **Usar Chrome instalado en el sistema (alternativa):**
   Si tienes Chrome instalado, puedes configurar Puppeteer para usarlo:
   ```bash
   # En macOS, Chrome generalmente está en:
   # /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
   ```
   Luego modifica `services/scraperService.js` para usar:
   ```javascript
   executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
   ```

5. **Reinstalar completamente:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm install puppeteer --force
   ```

6. **Verificar instalación:**
   ```bash
   npm run check
   ```

### Error: "ECONNRESET" o errores de conexión

Estos errores son comunes y el scraper los maneja automáticamente. Si se extraen números antes del error, se retornan en la respuesta.

## ⚠️ Notas

- El scraper hace scroll automáticamente hasta encontrar todos los resultados
- Se detiene cuando aparece el mensaje "No hay más resultados"
- Los números de teléfono se extraen de múltiples fuentes en el DOM
- El proceso puede tardar varios segundos dependiendo de la cantidad de resultados
- El scraper usa el nuevo modo headless de Chrome para mejor rendimiento

# google-maps-simple-scrapper
# google-maps-simple-scrapper
# google-maps-simple-scrapper
