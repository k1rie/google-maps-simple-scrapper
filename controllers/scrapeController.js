const scrapeService = require('../services/scraperService');

/**
 * Función para convertir datos a CSV
 * @param {Array} data - Array de objetos con información de negocios
 * @returns {string} - String con formato CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return 'No hay datos para exportar';
  }

  // Obtener las columnas del primer objeto
  const headers = Object.keys(data[0]);
  
  // Crear la línea de encabezados
  const csvHeaders = headers.map(header => `"${header}"`).join(',');
  
  // Crear las líneas de datos
  const csvRows = data.map(business => {
    return headers.map(header => {
      const value = business[header] || '';
      // Escapar comillas y envolver en comillas
      const escapedValue = String(value).replace(/"/g, '""');
      return `"${escapedValue}"`;
    }).join(',');
  });
  
  // Combinar todo
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Controlador para el endpoint de scraping
 * Maneja las peticiones GET y POST para extraer información de negocios
 */
const scrapeController = {
  /**
   * Maneja las peticiones de scraping
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async scrape(req, res) {
    try {
      // Obtener query de params (GET) o body (POST)
      const { query, search, format } = req.method === 'GET' ? req.query : req.body;
      const searchQuery = query || search;
      const outputFormat = format || req.query.format; // Para GET también

      // Validar que se proporcionó el parámetro
      if (!searchQuery) {
        return res.status(400).json({
          error: 'Parámetro requerido',
          message: 'Debes proporcionar el parámetro "query" o "search" con el texto a buscar'
        });
      }

      console.log(`Iniciando scraping para: "${searchQuery}"`);
      
      // Llamar al servicio de scraping
      const businesses = await scrapeService.scrapeGoogleMaps(searchQuery);

      // Si se solicita formato CSV, retornar archivo
      if (outputFormat === 'csv' || outputFormat === 'CSV') {
        const csv = convertToCSV(businesses);
        const filename = `negocios_${searchQuery.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(csv, 'utf8'));
        
        return res.send('\ufeff' + csv); // BOM para Excel
      }

      // Retornar respuesta JSON exitosa
      res.json({
        success: true,
        query: searchQuery,
        totalNegocios: businesses.length,
        negocios: businesses
      });

    } catch (error) {
      // Filtrar errores técnicos de WebSocket/ECONNRESET
      const errorMessage = error.message || error.toString();
      const isConnectionError = errorMessage.includes('ECONNRESET') || 
                                errorMessage.includes('Target closed') ||
                                errorMessage.includes('Session closed') ||
                                errorMessage.includes('Protocol error') ||
                                errorMessage.includes('WebSocket');
      
      if (isConnectionError) {
        console.log('Error de conexión detectado (puede ser no crítico):', errorMessage);
      } else {
        console.error('Error en el controlador:', errorMessage);
      }
      
      // Mensaje de error amigable para el usuario
      const userMessage = isConnectionError 
        ? 'Error de conexión con el navegador. Intenta nuevamente.'
        : (error.message || 'Error desconocido al realizar el scraping');
      
      res.status(500).json({
        success: false,
        error: 'Error al realizar el scraping',
        message: userMessage
      });
    }
  }
};

module.exports = scrapeController;

