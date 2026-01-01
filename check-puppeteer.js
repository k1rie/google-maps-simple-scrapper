/**
 * Script de verificación de Puppeteer
 * Ejecuta: node check-puppeteer.js
 */

const puppeteer = require('puppeteer');

async function checkPuppeteer() {
  console.log('🔍 Verificando instalación de Puppeteer...\n');
  
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const platform = os.platform();
    
    let executablePath = null;
    
    // En macOS, intentar usar Chrome del sistema primero
    if (platform === 'darwin') {
      const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      if (fs.existsSync(systemChrome)) {
        executablePath = systemChrome;
        console.log('✅ Chrome del sistema encontrado en macOS');
      }
    }
    
    console.log('1. Intentando lanzar navegador...');
    let browser;
    
    const launchOptions = {
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    };
    
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log('✅ Navegador lanzado exitosamente');
    } catch (error1) {
      console.log('2. Intentando con modo headless antiguo...');
      launchOptions.headless = true;
      try {
        browser = await puppeteer.launch(launchOptions);
        console.log('✅ Navegador lanzado con modo headless antiguo');
      } catch (error2) {
        console.log('3. Intentando con modo no-headless...');
        launchOptions.headless = false;
        browser = await puppeteer.launch(launchOptions);
        console.log('✅ Navegador lanzado en modo visible');
      }
    }
    
    console.log('✅ Navegador lanzado exitosamente con modo "new"');
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    console.log('✅ Navegación a Google exitosa');
    
    await browser.close();
    console.log('✅ Navegador cerrado correctamente\n');
    console.log('🎉 Puppeteer está funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Soluciones posibles:');
    console.log('1. Reinstalar Puppeteer: npm install puppeteer --force');
    console.log('2. En macOS, puede necesitar: xcode-select --install');
    console.log('3. Verificar permisos de ejecución');
    console.log('4. Intentar con: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm install puppeteer');
    process.exit(1);
  }
}

checkPuppeteer();

