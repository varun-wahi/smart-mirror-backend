const express = require('express');
const {
    startLightControl,
    stopLightControl,
} = require('../controllers/light.controller.js');

const router = express.Router();

// Route to start motion detection
router.post('/start', startLightControl);

// Route to stop motion detection
router.post('/stop', stopLightControl);

module.exports = router;