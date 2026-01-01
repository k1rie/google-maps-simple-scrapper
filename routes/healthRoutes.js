const express = require('express');
const router = express.Router();

// Ruta de salud
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API funcionando correctamente' 
  });
});

module.exports = router;

