const express = require('express');
const {
    startMotionDetection,
    stopMotionDetection,
} = require('../controllers/motion.controller.js');

const router = express.Router();

// Route to start motion detection
router.post('/start', startMotionDetection);

// Route to stop motion detection
router.post('/stop', stopMotionDetection);

module.exports = router;