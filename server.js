const express = require('express');
const cors = require('cors');

// Importar rutas
const scrapeRoutes = require('./routes/scrapeRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/', healthRoutes);
app.use('/', scrapeRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: 'Usa GET o POST /scrape?query=tu_busqueda'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📡 Endpoint: GET/POST http://localhost:${PORT}/scrape?query=tu_busqueda`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

