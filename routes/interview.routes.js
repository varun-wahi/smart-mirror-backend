const express = require('express');
const { getInterviewQuestions } = require('../controllers/interview.controller.js');
const router = express.Router();

router.post('/questions', getInterviewQuestions);

module.exports = router;