const express = require('express');
const router = express.Router();

const {
  initializeSystem,
  verifyFace,
  registerFace
} = require('../controllers/teacher.controller.js');

// Routes
router.get('/initialize', initializeSystem);
router.post('/verify', verifyFace);
router.post('/register', registerFace);

module.exports = router;