const { chromium } = require('playwright');

/**
 * Servicio de scraping para Google Maps
 * Extrae información completa de negocios de los resultados de búsqueda
 */
class ScraperService {
  /**
   * Scraper de Google Maps que extrae información completa de los negocios
   * @param {string} searchQuery - Texto a buscar en Google Maps
   * @returns {Promise<Array>} - Array de objetos con información de negocios
   */
  async scrapeGoogleMaps(searchQuery) {
    let browser = null;
    let page = null;
    const businesses = new Map(); // Usar Map para evitar duplicados por nombre
    
    try {
      // Iniciar navegador con Playwright
      // Playwright maneja automáticamente la instalación y ubicación de Chromium
      console.log('✅ Iniciando navegador con Playwright (headless: true)');
      
      browser = await chromium.launch({
        headless: true, // Modo headless activado
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
        ],
        timeout: 30000
      });

      // Crear nueva página
      page = await browser.newPage();
      
      // Configurar viewport y user agent para evitar detección
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Navegar a Google Maps
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      console.log(`Navegando a: ${searchUrl}`);
      
      // Usar 'load' en lugar de 'networkidle' porque Google Maps nunca alcanza networkidle
      await page.goto(searchUrl, { 
        waitUntil: 'load',
        timeout: 60000 // Aumentar timeout a 60 segundos
      });

      console.log('Página cargada, esperando elementos...');
      
      // Esperar a que cargue el contenido principal
      try {
        await page.waitForSelector('[role="main"]', { timeout: 20000 });
        console.log('Panel principal encontrado');
      } catch (e) {
        console.log('No se encontró [role="main"], continuando...');
      }
      
      // Esperar un poco más para que Google Maps cargue los resultados
      await page.waitForTimeout(5000);
      
      // Esperar a que aparezcan los resultados de búsqueda
      try {
        await page.waitForSelector('div[role="article"]', { timeout: 15000 });
        console.log('Resultados encontrados');
      } catch (e) {
        console.log('Esperando resultados... (continuando de todas formas)');
      }
      
      // Esperar un poco más para asegurar que los resultados estén completamente renderizados
      await page.waitForTimeout(3000);
      let previousResultsCount = 0;
      let noMoreResults = false;
      let scrollAttempts = 0;
      const maxScrollAttempts = 150; // Límite de seguridad
      let stableCount = 0; // Contador para detectar cuando no hay más cambios

      // Función para extraer teléfono del panel expandido
      const extractPhoneFromExpandedPanel = async () => {
        try {
          // Esperar un momento para que el panel se cargue completamente
          await page.waitForTimeout(1000);
          
          const phone = await page.evaluate(() => {
            let phone = '';
            
            // Estrategia 1: Buscar en el botón con aria-label que contiene "Teléfono:"
            const phoneButton = document.querySelector('button[aria-label*="Teléfono:"], button[data-item-id*="phone"]');
            if (phoneButton) {
              const ariaLabel = phoneButton.getAttribute('aria-label') || '';
              const phoneMatch = ariaLabel.match(/Teléfono:\s*([\d\s\+\-\(\)]+)/i);
              if (phoneMatch && phoneMatch[1]) {
                phone = phoneMatch[1].trim();
              } else {
                // Buscar en el contenido del botón
                const phoneText = phoneButton.textContent || phoneButton.innerText || '';
                const phoneInText = phoneText.match(/([\d\s\+\-\(\)]{8,})/);
                if (phoneInText) {
                  phone = phoneInText[1].trim();
                }
              }
              
              // Si no encontramos, buscar en el div interno que contiene el número
              if (!phone) {
                const phoneDiv = phoneButton.querySelector('.Io6YTe, .kR99db, .fdkmkc');
                if (phoneDiv) {
                  const phoneText = phoneDiv.textContent || phoneDiv.innerText || '';
                  const cleanedPhone = phoneText.trim();
                  if (cleanedPhone && cleanedPhone.match(/\d/)) {
                    phone = cleanedPhone;
                  }
                }
              }
            }
            
            // Estrategia 2: Buscar en el div específico que contiene el número
            if (!phone) {
              const phoneDiv = document.querySelector('div.Io6YTe.fontBodyMedium.kR99db.fdkmkc');
              if (phoneDiv) {
                const phoneText = phoneDiv.textContent || phoneDiv.innerText || '';
                const phoneMatch = phoneText.match(/([\d\s\+\-\(\)]{8,})/);
                if (phoneMatch) {
                  const cleaned = phoneMatch[1].replace(/[\s\-\.\(\)]/g, '');
                  if (cleaned.length >= 8 && cleaned.length <= 15) {
                    phone = phoneMatch[1].trim();
                  }
                }
              }
            }
            
            // Estrategia 3: Buscar en el data-item-id del botón de teléfono
            if (!phone) {
              const phoneDataButton = document.querySelector('button[data-item-id^="phone:tel:"]');
              if (phoneDataButton) {
                const dataId = phoneDataButton.getAttribute('data-item-id');
                if (dataId) {
                  const telMatch = dataId.match(/tel:(\+?\d+)/);
                  if (telMatch && telMatch[1]) {
                    phone = telMatch[1].trim();
                  }
                }
              }
            }
            
            return phone;
          });
          
          return phone || '';
        } catch (error) {
          console.log('Error extrayendo teléfono del panel:', error.message);
          return '';
        }
      };

      // Función mejorada para extraer información completa de negocios
      const extractBusinesses = async () => {
        const businessesData = await page.evaluate(() => {
          const businessesList = [];
          
          // Patrón para números de teléfono
          const phoneRegex = /(\+?\d{1,4}[\s\-\.]?)?\(?\d{2,4}\)?[\s\-\.]?\d{2,4}[\s\-\.]?\d{2,4}[\s\-\.]?\d{0,4}/g;
          
          // Buscar todos los resultados de búsqueda
          const resultCards = document.querySelectorAll('div[role="article"]');
          
          resultCards.forEach((card, index) => {
            try {
              // Obtener el texto del card una sola vez para reutilizar
              const cardText = card.innerText || card.textContent || '';
              
              // Extraer nombre del negocio - múltiples estrategias
              let businessName = '';
              
              // Estrategia 1: Buscar en elementos con aria-label que contengan el nombre
              const nameLink = card.querySelector('a[data-value="name"]') || 
                               card.querySelector('a[aria-label]') ||
                               card.querySelector('[data-value="name"]');
              
              if (nameLink) {
                businessName = nameLink.getAttribute('aria-label') || 
                             nameLink.getAttribute('data-value') ||
                             nameLink.textContent?.trim() ||
                             nameLink.innerText?.trim() || '';
              }
              
              // Estrategia 2: Buscar en el primer elemento con texto destacado
              if (!businessName) {
                const titleElement = card.querySelector('div[role="button"]') ||
                                   card.querySelector('div[jsaction*="click"]') ||
                                   card.querySelector('div.fontHeadlineSmall');
                if (titleElement) {
                  businessName = titleElement.textContent?.trim() || 
                               titleElement.innerText?.trim() || '';
                }
              }
              
              // Estrategia 3: Buscar en el texto del card (primera línea significativa)
              if (!businessName) {
                const lines = cardText.split('\n').filter(line => line.trim() && line.length > 2);
                // La primera línea suele ser el nombre, pero filtrar si parece ser un número de teléfono
                for (let line of lines) {
                  if (!line.match(/^[\d\s\+\-\(\)]+$/) && line.length > 3) {
                    businessName = line.trim();
                    break;
                  }
                }
              }
              
              // Limpiar el nombre (remover caracteres extraños al inicio)
              if (businessName) {
                businessName = businessName.replace(/^[•\-\s]+/, '').trim();
              }
              
              if (!businessName || businessName.length < 2) {
                businessName = 'Sin nombre';
              }
              
              // Extraer teléfono del card (el teléfono completo generalmente está en el panel expandido)
              let phone = '';
              
              // Estrategia 1: Buscar en el texto del card (puede que algunos cards muestren el teléfono)
              const phoneMatches = cardText.match(phoneRegex);
              if (phoneMatches && phoneMatches.length > 0) {
                // Filtrar números válidos
                phoneMatches.forEach(match => {
                  const cleaned = match.replace(/[\s\-\.\(\)]/g, '');
                  if (cleaned.length >= 8 && cleaned.length <= 15 && !cleaned.match(/^\d{4,5}$/)) {
                    if (!cleaned.match(/^(19|20)\d{2}$/) && cleaned.length >= 8) {
                      if (!phone) phone = match.trim();
                    }
                  }
                });
              }
              
              // Estrategia 2: Buscar en links tel: dentro del card
              if (!phone) {
                const telLink = card.querySelector('a[href^="tel:"]');
                if (telLink) {
                  const href = telLink.getAttribute('href');
                  if (href) {
                    phone = href.replace('tel:', '').trim();
                  }
                }
              }
              
              // Nota: El teléfono completo generalmente está en el panel expandido,
              // que se obtiene haciendo clic en el card. Esto se hace en la función
              // enrichBusinessesWithPhones() después de la extracción inicial.
              
              // Extraer dirección
              let address = '';
              const addressElements = card.querySelectorAll('[data-value*="address"], [aria-label*="dirección"], [aria-label*="address"]');
              addressElements.forEach(el => {
                const text = el.getAttribute('aria-label') || el.getAttribute('data-value') || el.textContent || '';
                if (text && (text.includes('dirección') || text.includes('address') || text.includes(',') || text.match(/\d/))) {
                  address = text.replace(/dirección|address/gi, '').trim();
                }
              });
              
              // Si no encontramos dirección, buscar en el texto del card
              if (!address) {
                const lines = cardText.split('\n').filter(line => line.trim());
                // Buscar líneas que parezcan direcciones (contienen números o comas)
                for (let line of lines) {
                  if ((line.includes(',') || line.match(/\d/)) && line.length > 10) {
                    address = line.trim();
                    break;
                  }
                }
              }
              
              // Extraer calificación
              let rating = '';
              const ratingElement = card.querySelector('[aria-label*="estrellas"], [aria-label*="stars"], [role="img"][aria-label*="."]');
              if (ratingElement) {
                const ratingText = ratingElement.getAttribute('aria-label') || '';
                const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                if (ratingMatch) {
                  rating = ratingMatch[1];
                }
              }
              
              // Extraer número de reseñas
              let reviews = '';
              const reviewsText = card.innerText || card.textContent || '';
              const reviewsMatch = reviewsText.match(/(\d+)\s*(reseñas|reviews|opiniones)/i);
              if (reviewsMatch) {
                reviews = reviewsMatch[1];
              }
              
              // Extraer categoría/tipo de negocio
              let category = '';
              const lines = cardText.split('\n').filter(line => line.trim());
              
              // La categoría suele estar después del nombre, antes del teléfono/dirección
              let foundName = false;
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // Si encontramos el nombre, la siguiente línea útil suele ser la categoría
                if (foundName && line && line.length < 50 && !line.match(phoneRegex) && 
                    !line.includes('dirección') && !line.includes('address') &&
                    !line.match(/^\d+\.?\d*\s*(estrellas|stars)/i) && !line.match(/\d+\s*(reseñas|reviews)/i)) {
                  category = line;
                  break;
                }
                // Detectar si esta línea es el nombre (no es teléfono, no es dirección)
                if (line && !line.match(phoneRegex) && !line.includes(',') && 
                    line.length > 3 && line.length < 100 && !line.match(/^\d+\.?\d*$/)) {
                  foundName = true;
                }
              }
              
              // Solo agregar si tenemos al menos nombre o teléfono
              if (businessName && businessName !== 'Sin nombre') {
                businessesList.push({
                  nombre: businessName.trim(),
                  telefono: phone || 'No disponible',
                  direccion: address || 'No disponible',
                  calificacion: rating || 'No disponible',
                  reseñas: reviews || 'No disponible',
                  categoria: category || 'No disponible'
                });
              }
            } catch (error) {
              // Continuar con el siguiente card si hay error
              console.log('Error procesando card:', error);
            }
          });
          
          return businessesList;
        });
        
        // Agregar negocios al Map (evitar duplicados por nombre)
        businessesData.forEach(business => {
          if (business.nombre && business.nombre !== 'Sin nombre') {
            // Si ya existe, actualizar con información más completa
            if (businesses.has(business.nombre)) {
              const existing = businesses.get(business.nombre);
              // Actualizar solo si la nueva información es más completa
              if (business.telefono !== 'No disponible' && existing.telefono === 'No disponible') {
                existing.telefono = business.telefono;
              }
              if (business.direccion !== 'No disponible' && existing.direccion === 'No disponible') {
                existing.direccion = business.direccion;
              }
              if (business.calificacion !== 'No disponible' && existing.calificacion === 'No disponible') {
                existing.calificacion = business.calificacion;
              }
            } else {
              businesses.set(business.nombre, business);
            }
          }
        });
      };

      // Función para enriquecer negocios visibles con teléfonos del panel expandido
      const enrichVisibleBusinessesWithPhones = async () => {
        try {
          // Obtener todos los cards visibles y sus nombres
          const cardsInfo = await page.evaluate(() => {
            const cards = document.querySelectorAll('div[role="article"]');
            const info = [];
            
            cards.forEach((card, index) => {
              // Verificar si el card está visible en el viewport
              const rect = card.getBoundingClientRect();
              const isVisible = rect.top >= 0 && rect.top <= window.innerHeight;
              
              if (!isVisible) return; // Saltar cards no visibles
              
              const cardText = card.innerText || card.textContent || '';
              
              // Extraer nombre
              let businessName = '';
              const nameLink = card.querySelector('a[data-value="name"]') || 
                             card.querySelector('a[aria-label]');
              if (nameLink) {
                businessName = nameLink.getAttribute('aria-label') || 
                             nameLink.textContent?.trim() || '';
              }
              
              if (!businessName) {
                const lines = cardText.split('\n').filter(line => line.trim() && line.length > 2);
                for (let line of lines) {
                  if (!line.match(/^[\d\s\+\-\(\)]+$/) && line.length > 3) {
                    businessName = line.trim();
                    break;
                  }
                }
              }
              
              if (businessName && businessName.length > 2) {
                info.push({ name: businessName.trim(), index });
              }
            });
            
            return info;
          });

          if (cardsInfo.length === 0) return;

          console.log(`Procesando ${cardsInfo.length} cards visibles para extraer teléfonos...`);
          
          for (let i = 0; i < cardsInfo.length; i++) {
            try {
              const cardInfo = cardsInfo[i];
              if (!cardInfo || !cardInfo.name) continue;

              // Verificar si ya tenemos el teléfono para este negocio
              const existingBusiness = businesses.get(cardInfo.name);
              if (existingBusiness && existingBusiness.telefono !== 'No disponible') {
                continue; // Ya tenemos el teléfono, saltar
              }

              // Obtener todos los cards y hacer clic en el correcto
              const cards = await page.$$('div[role="article"]');
              if (cardInfo.index >= cards.length) continue;

              // Hacer clic en el card para expandirlo
              try {
                await cards[cardInfo.index].click({ timeout: 3000 });
                await page.waitForTimeout(2000); // Esperar a que se cargue el panel
              } catch (clickError) {
                // Si no se puede hacer clic, continuar con el siguiente
                continue;
              }

              // Extraer el teléfono del panel expandido
              const phone = await extractPhoneFromExpandedPanel();

              // Actualizar el negocio con el teléfono encontrado
              if (phone && existingBusiness) {
                existingBusiness.telefono = phone;
                console.log(`✓ Teléfono encontrado para ${cardInfo.name}: ${phone}`);
              } else if (phone && !existingBusiness) {
                // Si no existe, agregarlo
                businesses.set(cardInfo.name, {
                  nombre: cardInfo.name,
                  telefono: phone,
                  direccion: 'No disponible',
                  calificacion: 'No disponible',
                  reseñas: 'No disponible',
                  categoria: 'No disponible'
                });
                console.log(`✓ Nuevo negocio con teléfono: ${cardInfo.name}: ${phone}`);
              }

              // Cerrar el panel haciendo clic en el botón de cerrar o presionando Escape
              try {
                const closeButton = await page.$('button[aria-label="Cerrar"]');
                if (closeButton) {
                  await closeButton.click();
                  await page.waitForTimeout(500);
                } else {
                  // Si no hay botón de cerrar, presionar Escape
                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(500);
                }
              } catch (e) {
                // Ignorar errores al cerrar
              }

            } catch (error) {
              console.log(`Error procesando card ${i}:`, error.message);
              continue;
            }
          }
        } catch (error) {
          console.log('Error en enrichVisibleBusinessesWithPhones:', error.message);
        }
      };

      // Extraer información inicial
      await extractBusinesses();
      console.log(`Negocios encontrados inicialmente: ${businesses.size}`);

      // Enriquecer con teléfonos del panel expandido de los negocios iniciales
      await enrichVisibleBusinessesWithPhones();
      console.log(`Negocios después de enriquecer con teléfonos iniciales: ${businesses.size}`);

      // Hacer scroll hasta que no haya más resultados
      while (!noMoreResults && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;

        // Obtener el scroll actual antes de hacer scroll
        const scrollInfo = await page.evaluate(() => {
          // Buscar el panel scrollable de resultados (sidebar izquierdo)
          const mainPanel = document.querySelector('[role="main"]');
          const resultsPanel = document.querySelector('div[role="feed"]') || 
                              document.querySelector('[aria-label*="Resultados"]') ||
                              document.querySelector('[aria-label*="Results"]') ||
                              mainPanel;
          
          if (resultsPanel) {
            const beforeScroll = resultsPanel.scrollTop;
            const scrollHeight = resultsPanel.scrollHeight;
            const clientHeight = resultsPanel.clientHeight;
            
            // Hacer scroll hacia abajo
            resultsPanel.scrollTop = scrollHeight;
            
            return {
              beforeScroll,
              scrollHeight,
              clientHeight,
              canScroll: scrollHeight > clientHeight
            };
          }
          
          // Fallback: scroll en la ventana
          const beforeScroll = window.pageYOffset || document.documentElement.scrollTop;
          window.scrollTo(0, document.body.scrollHeight);
          return {
            beforeScroll,
            scrollHeight: document.body.scrollHeight,
            clientHeight: window.innerHeight,
            canScroll: true
          };
        });

        // Esperar a que carguen nuevos resultados
        await page.waitForTimeout(2000);

        // Verificar si apareció el mensaje "No hay más resultados"
        noMoreResults = await page.evaluate(() => {
          const bodyText = document.body.innerText || document.body.textContent || '';
          const lowerText = bodyText.toLowerCase();
          
          return lowerText.includes('no hay más resultados') || 
                 lowerText.includes('no more results') ||
                 lowerText.includes('no se encontraron más resultados') ||
                 lowerText.includes('no more places') ||
                 lowerText.includes('end of results');
        });

        // Extraer información después de cada scroll
        const countBefore = businesses.size;
        await extractBusinesses();
        const countAfter = businesses.size;

        // Enriquecer con teléfonos de los negocios visibles después de cada scroll
        console.log(`Extrayendo teléfonos de negocios visibles después del scroll ${scrollAttempts}...`);
        await enrichVisibleBusinessesWithPhones();

        // Verificar si hay nuevos resultados
        if (countAfter === countBefore) {
          stableCount++;
        } else {
          stableCount = 0; // Reset si encontramos nuevos negocios
        }

        // Si no hay cambios después de varios intentos y encontramos el mensaje, terminar
        if (noMoreResults || (stableCount >= 5 && scrollAttempts > 10)) {
          console.log(`Finalizando: noMoreResults=${noMoreResults}, stableCount=${stableCount}`);
          break;
        }

        // Verificar si realmente se hizo scroll
        const afterScroll = await page.evaluate(() => {
          const mainPanel = document.querySelector('[role="main"]');
          const resultsPanel = document.querySelector('div[role="feed"]') || mainPanel;
          return resultsPanel ? resultsPanel.scrollTop : (window.pageYOffset || 0);
        });

        if (scrollInfo.beforeScroll === afterScroll && scrollAttempts > 5) {
          // No se puede hacer más scroll
          console.log('No se puede hacer más scroll');
          break;
        }
        
        console.log(`Scroll ${scrollAttempts}: ${businesses.size} negocios encontrados`);
      }

      // Una última extracción para asegurarnos de obtener todos
      await page.waitForTimeout(1000);
      await extractBusinesses();
      
      // Última pasada para extraer teléfonos de negocios que aún no los tienen
      console.log('Realizando última pasada para extraer teléfonos restantes...');
      await enrichVisibleBusinessesWithPhones();
      
      console.log(`Scraping completado. Total de negocios: ${businesses.size}`);

      return Array.from(businesses.values());

    } catch (error) {
      // Filtrar errores que son comunes y no críticos
      const errorMessage = error.message || error.toString();
      
      // Manejar error específico de lanzamiento del navegador
      if (errorMessage.includes('Failed to launch') || 
          errorMessage.includes('Browser process') ||
          errorMessage.includes('Executable doesn\'t exist')) {
        console.error('Error al lanzar el navegador:', errorMessage);
        throw new Error(
          'No se pudo iniciar el navegador. ' +
          'Asegúrate de que Playwright esté instalado correctamente. ' +
          'Ejecuta: npx playwright install chromium'
        );
      }
      
      if (errorMessage.includes('ECONNRESET') || 
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Session closed') ||
          errorMessage.includes('Protocol error')) {
        console.log('Error de conexión del navegador (puede ser no crítico):', errorMessage);
        // Si tenemos negocios extraídos, retornarlos
        if (businesses && businesses.size > 0) {
          console.log(`Retornando ${businesses.size} negocios encontrados antes del error`);
          return Array.from(businesses.values());
        }
      }
      
      console.error('Error en el scraper:', errorMessage);
      throw new Error(`Error al realizar el scraping: ${errorMessage}`);
    } finally {
      // Cerrar página si existe
      if (page) {
        try {
          await page.close();
        } catch (error) {
          console.log('Error al cerrar página (ignorado):', error.message);
        }
      }
      
      // Cerrar navegador si existe
      if (browser) {
        try {
          await browser.close();
        } catch (error) {
          console.log('Error al cerrar navegador (ignorado):', error.message);
        }
      }
    }
  }
}

// Exportar instancia del servicio
module.exports = new ScraperService();
