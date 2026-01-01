# Guía de Solución de Problemas

## Error: "Failed to launch the browser process" en macOS

Este es un problema conocido con Puppeteer en macOS, especialmente en versiones recientes del sistema operativo.

### Solución 1: Permisos de macOS

1. Abre **Preferencias del Sistema**
2. Ve a **Seguridad y Privacidad** → **Privacidad** → **Accesibilidad**
3. Asegúrate de que **Terminal** (o tu IDE) tenga permisos marcados
4. Si no aparece, haz clic en el candado y agrega la aplicación manualmente

### Solución 2: Usar Chrome del Sistema

Si Puppeteer no puede lanzar Chromium, puedes usar Chrome instalado:

1. Instala Google Chrome desde https://www.google.com/chrome/
2. Edita `services/scraperService.js` y agrega esta línea en `launchOptions`:
   ```javascript
   executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
   ```

### Solución 3: Reinstalar Puppeteer

```bash
rm -rf node_modules package-lock.json
npm install
npx puppeteer browsers install chrome
```

### Solución 4: Usar Playwright (Alternativa)

Playwright suele ser más estable en macOS:

```bash
npm uninstall puppeteer
npm install playwright
```

Luego necesitarías actualizar el código para usar Playwright en lugar de Puppeteer.

### Verificar Instalación

Ejecuta:
```bash
npm run check
```

Si sigue fallando, los warnings sobre "unexpected crash info version 7" son normales en macOS y no son críticos. El problema real es que el navegador no se puede lanzar.

### Contacto

Si ninguna solución funciona, considera:
- Verificar la versión de macOS (puede ser incompatible)
- Usar un contenedor Docker
- Usar un servidor Linux para producción



