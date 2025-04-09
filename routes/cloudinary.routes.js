const express = require('express');

const { getImagesFromFolder } = require('../controllers/cloudinary.controller.js') ;

const router = express.Router();

// Route
router.get('/images', getImagesFromFolder);

module.exports = router;

