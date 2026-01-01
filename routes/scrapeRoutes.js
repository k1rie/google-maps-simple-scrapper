const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

// Ruta GET para scraping
router.get('/scrape', scrapeController.scrape);

// Ruta POST para scraping
router.post('/scrape', scrapeController.scrape);

module.exports = router;

