/**
 * Script de verificación de Playwright
 * Ejecuta: node check-puppeteer.js
 */

const { chromium } = require('playwright');

async function checkPlaywright() {
  console.log('🔍 Verificando instalación de Playwright...\n');
  
  try {
    console.log('1. Intentando lanzar navegador con headless: true...');
    let browser;
    
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    
    try {
      browser = await chromium.launch(launchOptions);
      console.log('✅ Navegador lanzado exitosamente en modo headless');
    } catch (error) {
      console.error('❌ Error al lanzar navegador:', error.message);
      throw error;
    }
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
    console.log('✅ Navegación a Google exitosa');
    
    await browser.close();
    console.log('✅ Navegador cerrado correctamente\n');
    console.log('🎉 Playwright está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Soluciones posibles:');
    console.log('1. Instalar navegadores de Playwright: npx playwright install chromium');
    console.log('2. Instalar dependencias del sistema: npx playwright install-deps chromium');
    console.log('3. Reinstalar Playwright: npm install playwright --force');
    process.exit(1);
  }
}

checkPlaywright();
